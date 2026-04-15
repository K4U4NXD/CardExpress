-- 20260415013000_add_checkout_cancel_and_detailed_stock_errors.sql

begin;

create or replace function public.cancel_checkout_session_by_token(
  p_checkout_session_id uuid,
  p_public_token text
)
returns table(
  checkout_session_id uuid,
  checkout_public_token text,
  checkout_status text,
  cancelled_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_session public.checkout_sessions%rowtype;
  v_order_exists boolean;
begin
  select *
    into v_session
    from public.checkout_sessions
   where id = p_checkout_session_id
     and public_token = p_public_token
   for update;

  if not found then
    raise exception 'Sessão de checkout não encontrada ou token inválido.';
  end if;

  if v_session.status = 'pending_payment'
     and v_session.expires_at is not null
     and v_session.expires_at < now() then
    update public.checkout_sessions as cs
       set status = 'expired',
           expired_at = coalesce(cs.expired_at, now()),
           updated_at = now()
     where cs.id = v_session.id;

    raise exception 'A sessão expirou.';
  end if;

  select exists (
    select 1
      from public.orders o
     where o.checkout_session_id = v_session.id
  )
    into v_order_exists;

  if v_order_exists or v_session.status = 'converted' then
    raise exception 'Esta sessão já foi convertida em pedido e não pode ser cancelada.';
  end if;

  if v_session.status = 'cancelled' then
    return query
    select
      v_session.id,
      v_session.public_token,
      v_session.status,
      v_session.cancelled_at;
    return;
  end if;

  if v_session.status = 'expired' then
    raise exception 'A sessão expirou.';
  end if;

  update public.checkout_sessions as cs
     set status = 'cancelled',
         cancelled_at = coalesce(cs.cancelled_at, now()),
         updated_at = now()
   where cs.id = v_session.id;

  select *
    into v_session
    from public.checkout_sessions
   where id = p_checkout_session_id;

  return query
  select
    v_session.id,
    v_session.public_token,
    v_session.status,
    v_session.cancelled_at;
end;
$function$;

grant execute on function public.cancel_checkout_session_by_token(uuid, text)
to anon, authenticated;

create or replace function public.create_checkout_session_by_slug(
  p_slug text,
  p_customer_name text,
  p_customer_phone text default null::text,
  p_notes text default null::text,
  p_items jsonb default '[]'::jsonb
)
returns table(
  checkout_session_id uuid,
  public_token text,
  store_id uuid,
  status text,
  total_amount numeric,
  expires_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_store_id uuid;
  v_accepts_orders boolean;
  v_session_id uuid;
  v_public_token text;
  v_total numeric(12,2);
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_customer_phone_digits text;
  v_item record;
begin
  if coalesce(trim(p_slug), '') = '' then
    raise exception 'Slug da loja é obrigatório.';
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Nome do cliente é obrigatório.';
  end if;

  if coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Telefone do cliente é obrigatório.';
  end if;

  v_customer_phone_digits := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');

  if length(v_customer_phone_digits) not in (10, 11) then
    raise exception 'Telefone do cliente inválido.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Itens inválidos.';
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Carrinho vazio.';
  end if;

  select
    s.id,
    coalesce(ss.accepts_orders, true)
  into
    v_store_id,
    v_accepts_orders
  from public.stores s
  left join public.store_settings ss
    on ss.store_id = s.id
  where s.slug = p_slug
    and s.is_active = true
  limit 1;

  if v_store_id is null then
    raise exception 'Loja não encontrada.';
  end if;

  if not v_accepts_orders then
    raise exception 'Esta loja não está aceitando pedidos no momento.';
  end if;

  for v_item in
    with raw_items as (
      select
        (item->>'product_id')::uuid as product_id,
        (item->>'quantity')::integer as quantity
      from jsonb_array_elements(p_items) as item
    ),
    normalized_items as (
      select
        product_id,
        sum(quantity)::integer as quantity
      from raw_items
      group by product_id
    )
    select
      ni.product_id,
      ni.quantity,
      p.id as current_product_id,
      p.name as product_name,
      c.id as current_category_id,
      c.is_active as category_is_active,
      p.is_active as product_is_active,
      p.is_available as product_is_available,
      p.track_stock,
      p.stock_quantity
    from normalized_items ni
    left join public.products p
      on p.id = ni.product_id
     and p.store_id = v_store_id
    left join public.categories c
      on c.id = p.category_id
     and c.store_id = v_store_id
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Quantidade inválida para um item do carrinho.';
    end if;

    if v_item.current_product_id is null or v_item.current_category_id is null then
      raise exception 'Um dos produtos do carrinho não foi encontrado.';
    end if;

    if v_item.category_is_active = false
       or v_item.product_is_active = false
       or v_item.product_is_available = false then
      raise exception 'O produto "%" não está disponível no momento.', v_item.product_name;
    end if;

    if v_item.track_stock = true
       and coalesce(v_item.stock_quantity, 0) < v_item.quantity then
      raise exception
        'Estoque insuficiente para "%" (disponível: %, solicitado: %).',
        v_item.product_name,
        coalesce(v_item.stock_quantity, 0),
        v_item.quantity;
    end if;
  end loop;

  with raw_items as (
    select
      (item->>'product_id')::uuid as product_id,
      (item->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as item
  ),
  normalized_items as (
    select
      product_id,
      sum(quantity)::integer as quantity
    from raw_items
    group by product_id
  ),
  validated_items as (
    select
      p.id as product_id,
      p.name as product_name,
      p.price as unit_price,
      ni.quantity,
      (p.price * ni.quantity)::numeric(12,2) as line_total
    from normalized_items ni
    join public.products p
      on p.id = ni.product_id
     and p.store_id = v_store_id
    join public.categories c
      on c.id = p.category_id
     and c.store_id = v_store_id
    where ni.quantity > 0
      and c.is_active = true
      and p.is_active = true
      and p.is_available = true
      and (p.track_stock = false or coalesce(p.stock_quantity, 0) >= ni.quantity)
  )
  select coalesce(sum(line_total), 0)::numeric(12,2)
    into v_total
  from validated_items;

  if v_total <= 0 then
    raise exception 'Carrinho inválido ou vazio.';
  end if;

  insert into public.checkout_sessions as cs (
    store_id,
    status,
    customer_name,
    customer_phone,
    notes,
    subtotal,
    total_amount,
    expires_at
  )
  values (
    v_store_id,
    'pending_payment',
    trim(p_customer_name),
    v_customer_phone_digits,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_total,
    v_total,
    v_expires_at
  )
  returning cs.id, cs.public_token
    into v_session_id, v_public_token;

  insert into public.checkout_session_items (
    checkout_session_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total
  )
  with raw_items as (
    select
      (item->>'product_id')::uuid as product_id,
      (item->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as item
  ),
  normalized_items as (
    select
      product_id,
      sum(quantity)::integer as quantity
    from raw_items
    group by product_id
  ),
  validated_items as (
    select
      p.id as product_id,
      p.name as product_name,
      p.price as unit_price,
      ni.quantity,
      (p.price * ni.quantity)::numeric(12,2) as line_total
    from normalized_items ni
    join public.products p
      on p.id = ni.product_id
     and p.store_id = v_store_id
    join public.categories c
      on c.id = p.category_id
     and c.store_id = v_store_id
    where ni.quantity > 0
      and c.is_active = true
      and p.is_active = true
      and p.is_available = true
      and (p.track_stock = false or coalesce(p.stock_quantity, 0) >= ni.quantity)
  )
  select
    v_session_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total
  from validated_items;

  return query
  select
    v_session_id,
    v_public_token,
    v_store_id,
    'pending_payment'::text,
    v_total,
    v_expires_at;
end;
$function$;

commit;