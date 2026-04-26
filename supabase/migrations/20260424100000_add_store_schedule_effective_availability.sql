begin;

alter table public.store_settings
  add column if not exists auto_accept_orders_by_schedule boolean not null default false,
  add column if not exists opening_time time,
  add column if not exists closing_time time;

create or replace function public.is_store_within_service_hours(
  p_auto_accept_orders_by_schedule boolean,
  p_opening_time time,
  p_closing_time time,
  p_reference timestamp with time zone default now()
)
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  with reference_time as (
    select (coalesce(p_reference, now()) at time zone 'America/Sao_Paulo')::time as current_time
  )
  select
    case
      when coalesce(p_auto_accept_orders_by_schedule, false) = false then true
      when p_opening_time is null or p_closing_time is null then false
      when p_opening_time = p_closing_time then false
      when p_opening_time < p_closing_time then current_time >= p_opening_time and current_time < p_closing_time
      else current_time >= p_opening_time or current_time < p_closing_time
    end
  from reference_time;
$function$;

drop function if exists public.get_public_store_by_slug(text);

create function public.get_public_store_by_slug(p_slug text)
returns table(
  store_id uuid,
  name text,
  slug text,
  phone text,
  logo_url text,
  accepts_orders boolean,
  accepts_orders_manual boolean,
  auto_accept_orders_by_schedule boolean,
  opening_time time,
  closing_time time,
  is_within_service_hours boolean,
  public_message text
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    s.id as store_id,
    s.name,
    s.slug,
    s.phone,
    s.logo_url,
    (
      coalesce(ss.accepts_orders, true)
      and public.is_store_within_service_hours(
        coalesce(ss.auto_accept_orders_by_schedule, false),
        ss.opening_time,
        ss.closing_time,
        now()
      )
    ) as accepts_orders,
    coalesce(ss.accepts_orders, true) as accepts_orders_manual,
    coalesce(ss.auto_accept_orders_by_schedule, false) as auto_accept_orders_by_schedule,
    ss.opening_time,
    ss.closing_time,
    public.is_store_within_service_hours(
      coalesce(ss.auto_accept_orders_by_schedule, false),
      ss.opening_time,
      ss.closing_time,
      now()
    ) as is_within_service_hours,
    ss.public_message
  from public.stores s
  left join public.store_settings ss
    on ss.store_id = s.id
  where s.slug = p_slug
    and s.is_active = true
  limit 1;
$function$;

grant execute on function public.get_public_store_by_slug(text) to anon, authenticated;

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
  v_accepts_orders_manual boolean;
  v_auto_accept_orders_by_schedule boolean;
  v_opening_time time;
  v_closing_time time;
  v_is_within_service_hours boolean;
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
    coalesce(ss.accepts_orders, true),
    coalesce(ss.auto_accept_orders_by_schedule, false),
    ss.opening_time,
    ss.closing_time,
    public.is_store_within_service_hours(
      coalesce(ss.auto_accept_orders_by_schedule, false),
      ss.opening_time,
      ss.closing_time,
      now()
    )
  into
    v_store_id,
    v_accepts_orders_manual,
    v_auto_accept_orders_by_schedule,
    v_opening_time,
    v_closing_time,
    v_is_within_service_hours
  from public.stores s
  left join public.store_settings ss
    on ss.store_id = s.id
  where s.slug = p_slug
    and s.is_active = true
  limit 1;

  if v_store_id is null then
    raise exception 'Loja não encontrada.';
  end if;

  if not v_accepts_orders_manual then
    raise exception 'Esta loja não está aceitando pedidos no momento.';
  end if;

  if v_auto_accept_orders_by_schedule and not v_is_within_service_hours then
    raise exception 'A loja está fora do horário de atendimento.';
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
      p.archived_at as product_archived_at,
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
       or v_item.product_is_available = false
       or v_item.product_archived_at is not null then
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
      and p.archived_at is null
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
      and p.archived_at is null
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

grant execute on function public.create_checkout_session_by_slug(text, text, text, text, jsonb) to anon, authenticated;

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
    raise exception 'Sessão de checkout não encontrada.';
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
    raise exception 'A sessão ainda não foi paga.';
  end if;

  if not exists (
    select 1
      from public.checkout_session_items
     where checkout_session_id = v_session.id
  ) then
    raise exception 'Sessão de checkout sem itens.';
  end if;

  select
    s.is_active
  into
    v_store_is_active
  from public.stores s
  where s.id = v_session.store_id
  limit 1;

  if v_store_is_active is distinct from true then
    raise exception 'Loja não encontrada.';
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
      raise exception 'Produto do checkout não encontrado.';
    end if;

    if v_item.product_archived_at is not null then
      raise exception 'O produto "%" não está disponível no momento.', v_item.product_name;
    end if;

    if v_item.track_stock = true
       and coalesce(v_item.stock_quantity, 0) < v_item.quantity then
      raise exception
        'Estoque insuficiente para "%" (disponível: %, solicitado: %).',
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
         is_available = case
           when p.track_stock = true and (p.stock_quantity - q.requested_quantity) <= 0 then false
           else p.is_available
         end,
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
