do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'order_status'
      and e.enumlabel = 'cancelado'
  ) then
    alter type public.order_status add value 'cancelado';
  end if;
end
$$;

alter table public.orders
  add column if not exists cancelled_at timestamp with time zone;

alter table public.orders
  add column if not exists stock_reverted_at timestamp with time zone;

create or replace function public.transition_order_to_terminal(
  p_order_id uuid,
  p_target_status public.order_status
)
returns table (
  id uuid,
  status public.order_status,
  refund_status public.refund_status,
  rejected_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  stock_reverted_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.orders%rowtype;
  v_owner_id uuid;
begin
  v_owner_id := auth.uid();

  if v_owner_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_target_status not in ('recusado', 'cancelado') then
    raise exception 'Status terminal inválido: %.', p_target_status;
  end if;

  select o.*
    into v_order
    from public.orders o
    join public.stores s
      on s.id = o.store_id
   where o.id = p_order_id
     and s.owner_id = v_owner_id
   for update;

  if not found then
    raise exception 'Pedido não encontrado ou sem permissão.';
  end if;

  if v_order.status = p_target_status
     and v_order.stock_reverted_at is not null then
    return query
    select
      v_order.id,
      v_order.status,
      v_order.refund_status,
      v_order.rejected_at,
      v_order.cancelled_at,
      v_order.stock_reverted_at;
    return;
  end if;

  if p_target_status = 'recusado' and v_order.status not in ('aguardando_aceite', 'recusado') then
    raise exception 'Somente pedidos em aguardando_aceite podem ser recusados.';
  end if;

  if p_target_status = 'cancelado' and v_order.status not in ('em_preparo', 'cancelado') then
    raise exception 'Somente pedidos em em_preparo podem ser cancelados.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_order.store_id::text), 2);

  if v_order.stock_reverted_at is null then
    update public.products p
       set stock_quantity = p.stock_quantity + q.returned_quantity,
           is_available = case
             when p.track_stock = true
              and p.stock_quantity = 0
              and (p.stock_quantity + q.returned_quantity) > 0
             then true
             else p.is_available
           end,
           updated_at = now()
      from (
        select
          oi.product_id,
          sum(oi.quantity)::integer as returned_quantity
        from public.order_items oi
        where oi.order_id = v_order.id
          and oi.product_id is not null
        group by oi.product_id
      ) q
     where p.id = q.product_id
       and p.track_stock = true;
  end if;

  update public.orders o
     set status = p_target_status,
         refund_status = case
           when o.refund_status = 'none' then 'pendente'::public.refund_status
           else o.refund_status
         end,
         rejected_at = case
           when p_target_status = 'recusado' then coalesce(o.rejected_at, now())
           else o.rejected_at
         end,
         cancelled_at = case
           when p_target_status = 'cancelado' then coalesce(o.cancelled_at, now())
           else o.cancelled_at
         end,
         stock_reverted_at = coalesce(o.stock_reverted_at, now()),
         updated_at = now()
   where o.id = v_order.id
   returning *
    into v_order;

  return query
  select
    v_order.id,
    v_order.status,
    v_order.refund_status,
    v_order.rejected_at,
    v_order.cancelled_at,
    v_order.stock_reverted_at;
end;
$function$;

revoke all on function public.transition_order_to_terminal(uuid, public.order_status) from public;
grant execute on function public.transition_order_to_terminal(uuid, public.order_status) to authenticated;

drop function if exists public.get_public_order(text, uuid, uuid);

create function public.get_public_order(
  p_slug text,
  p_order_id uuid,
  p_public_token uuid
)
returns table(
  id uuid,
  display_code text,
  status public.order_status,
  refund_status public.refund_status,
  customer_name text,
  placed_at timestamp with time zone,
  accepted_at timestamp with time zone,
  ready_at timestamp with time zone,
  finalized_at timestamp with time zone,
  rejected_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  total_amount numeric,
  note text
)
language sql
security definer
set search_path = public
as $function$
  select
    o.id,
    o.display_code,
    o.status,
    o.refund_status,
    o.customer_name,
    o.placed_at,
    o.accepted_at,
    o.ready_at,
    o.finalized_at,
    o.rejected_at,
    o.cancelled_at,
    o.total_amount,
    o.note
  from public.orders o
  join public.stores s on s.id = o.store_id
  where s.slug = p_slug
    and o.id = p_order_id
    and o.public_token = p_public_token
  limit 1
$function$;

grant execute on function public.get_public_order(text, uuid, uuid) to anon;
grant execute on function public.get_public_order(text, uuid, uuid) to authenticated;
grant execute on function public.get_public_order(text, uuid, uuid) to service_role;

create or replace function public.broadcast_public_order_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $function$
declare
  old_topic text;
  new_topic text;
  should_broadcast boolean := false;
begin
  if tg_op = 'UPDATE' then
    should_broadcast :=
      new.display_code is distinct from old.display_code
      or new.status is distinct from old.status
      or new.refund_status is distinct from old.refund_status
      or new.customer_name is distinct from old.customer_name
      or new.placed_at is distinct from old.placed_at
      or new.accepted_at is distinct from old.accepted_at
      or new.ready_at is distinct from old.ready_at
      or new.finalized_at is distinct from old.finalized_at
      or new.rejected_at is distinct from old.rejected_at
      or new.cancelled_at is distinct from old.cancelled_at
      or new.total_amount is distinct from old.total_amount
      or new.note is distinct from old.note
      or new.public_token is distinct from old.public_token;
  elsif tg_op = 'DELETE' then
    should_broadcast := old.public_token is not null;
  else
    return coalesce(new, old);
  end if;

  if not should_broadcast then
    return coalesce(new, old);
  end if;

  if tg_op <> 'DELETE' and new.public_token is not null then
    new_topic := format('public:order:%s:%s', new.id, new.public_token);

    perform realtime.send(
      jsonb_build_object(
        'changed_at', now()
      ),
      'order_refresh',
      new_topic,
      false
    );
  end if;

  if tg_op <> 'INSERT' and old.public_token is not null then
    old_topic := format('public:order:%s:%s', old.id, old.public_token);

    if new_topic is null or old_topic <> new_topic then
      perform realtime.send(
        jsonb_build_object(
          'changed_at', now()
        ),
        'order_refresh',
        old_topic,
        false
      );
    end if;
  end if;

  return coalesce(new, old);
end;
$function$;