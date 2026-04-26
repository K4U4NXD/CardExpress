begin;

create or replace function public.convert_paid_checkout_session_to_order(p_checkout_session_id uuid)
returns table(
  order_id uuid,
  order_public_token uuid,
  order_number integer,
  display_code text,
  order_status public.order_status,
  placed_at timestamp with time zone
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_session public.checkout_sessions%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_paid_at timestamptz;
  v_store_is_active boolean;
begin
  select *
    into v_session
    from public.checkout_sessions
   where id = p_checkout_session_id
   for update;

  if not found then
    raise exception 'Sessao de checkout nao encontrada.';
  end if;

  select *
    into v_order
    from public.orders
   where checkout_session_id = v_session.id
   limit 1;

  if found then
    if v_session.status <> 'converted' then
      update public.checkout_sessions as cs
         set status = 'converted',
             converted_at = coalesce(cs.converted_at, now()),
             updated_at = now()
       where cs.id = v_session.id;
    end if;

    return query
    select
      v_order.id,
      v_order.public_token,
      v_order.order_number,
      v_order.display_code,
      v_order.status,
      v_order.placed_at;
    return;
  end if;

  if v_session.status <> 'paid' then
    raise exception 'A sessao ainda nao foi paga.';
  end if;

  if not exists (
    select 1
      from public.checkout_session_items
     where checkout_session_id = v_session.id
  ) then
    raise exception 'Sessao de checkout sem itens.';
  end if;

  select
    s.is_active
  into
    v_store_is_active
  from public.stores s
  where s.id = v_session.store_id
  limit 1;

  if v_store_is_active is distinct from true then
    raise exception 'Loja nao encontrada.';
  end if;

  v_paid_at := coalesce(v_session.paid_at, now());

  perform pg_advisory_xact_lock(hashtext(v_session.store_id::text), 2);

  for v_item in
    select
      csi.product_id,
      csi.product_name,
      csi.quantity,
      p.id as current_product_id,
      p.archived_at as product_archived_at,
      p.track_stock,
      p.stock_quantity
    from public.checkout_session_items csi
    join public.products p
      on p.id = csi.product_id
     and p.store_id = v_session.store_id
    where csi.checkout_session_id = v_session.id
  loop
    if v_item.current_product_id is null then
      raise exception 'Produto do checkout nao encontrado.';
    end if;

    if v_item.product_archived_at is not null then
      raise exception 'O produto "%" nao esta disponivel no momento.', v_item.product_name;
    end if;

    if v_item.track_stock = true
       and coalesce(v_item.stock_quantity, 0) < v_item.quantity then
      raise exception
        'Estoque insuficiente para "%" (disponivel: %, solicitado: %).',
        v_item.product_name,
        v_item.stock_quantity,
        v_item.quantity;
    end if;
  end loop;

  insert into public.orders (
    checkout_session_id,
    store_id,
    status,
    refund_status,
    total_amount,
    note,
    customer_name,
    customer_phone,
    placed_at,
    created_at,
    updated_at
  )
  values (
    v_session.id,
    v_session.store_id,
    'aguardando_aceite',
    'none',
    v_session.total_amount,
    v_session.notes,
    v_session.customer_name,
    v_session.customer_phone,
    v_paid_at,
    now(),
    now()
  )
  returning *
    into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    name,
    price,
    quantity
  )
  select
    v_order.id,
    csi.product_id,
    csi.product_name,
    csi.unit_price,
    csi.quantity
  from public.checkout_session_items csi
  where csi.checkout_session_id = v_session.id;

  update public.products p
     set stock_quantity = p.stock_quantity - q.requested_quantity,
         updated_at = now()
    from (
      select
        csi.product_id,
        sum(csi.quantity)::integer as requested_quantity
      from public.checkout_session_items csi
      where csi.checkout_session_id = v_session.id
      group by csi.product_id
    ) q
   where p.id = q.product_id
     and p.track_stock = true;

  update public.checkout_sessions as cs
     set status = 'converted',
         paid_at = coalesce(cs.paid_at, v_paid_at),
         converted_at = coalesce(cs.converted_at, now()),
         updated_at = now()
   where cs.id = v_session.id;

  return query
  select
    v_order.id,
    v_order.public_token,
    v_order.order_number,
    v_order.display_code,
    v_order.status,
    v_order.placed_at;
end;
$function$;

grant execute on function public.convert_paid_checkout_session_to_order(uuid) to anon, authenticated;

commit;
