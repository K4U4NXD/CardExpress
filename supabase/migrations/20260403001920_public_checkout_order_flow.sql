do $$
begin
  if to_regclass('public.checkout_session_items') is not null then
    execute 'drop trigger if exists "trg_checkout_totals_delete" on "public"."checkout_session_items"';
    execute 'drop trigger if exists "trg_checkout_totals_insert" on "public"."checkout_session_items"';
    execute 'drop trigger if exists "trg_checkout_totals_update" on "public"."checkout_session_items"';
    execute 'drop policy if exists "checkout_session_items_public_insert" on "public"."checkout_session_items"';
    execute 'drop policy if exists "checkout_session_items_public_insert" on "public"."checkout_session_items"';
  end if;

  if to_regclass('public.checkout_sessions') is not null then
    execute 'drop trigger if exists "trg_checkout_sessions_updated_at" on "public"."checkout_sessions"';
  end if;
end $$;

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_line_total_non_negative";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_name_not_empty";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_quantity_positive";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_unit_price_non_negative";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_customer_name_not_empty";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_customer_phone_not_empty";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_public_reference_key";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_subtotal_non_negative";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_total_non_negative";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_product_id_fkey";

drop index if exists "public"."checkout_sessions_public_reference_key";

drop index if exists "public"."idx_checkout_sessions_external_payment_id";

drop index if exists "public"."idx_checkout_sessions_external_preference_id";

drop index if exists "public"."idx_checkout_sessions_payment_status";

drop index if exists "public"."idx_checkout_sessions_store_id";

alter table if exists "public"."checkout_session_items" drop column if exists "product_name_snapshot";

alter table if exists "public"."checkout_session_items" add column if not exists "product_name" text not null;

alter table "public"."checkout_session_items" alter column "line_total" set data type numeric(12,2) using "line_total"::numeric(12,2);

alter table "public"."checkout_session_items" alter column "product_id" set not null;

alter table "public"."checkout_session_items" alter column "unit_price" set data type numeric(12,2) using "unit_price"::numeric(12,2);

alter table if exists "public"."checkout_sessions" drop column if exists "approved_at";

alter table if exists "public"."checkout_sessions" drop column if exists "external_payment_id";

alter table if exists "public"."checkout_sessions" drop column if exists "external_preference_id";

alter table if exists "public"."checkout_sessions" drop column if exists "order_notes";

alter table if exists "public"."checkout_sessions" drop column if exists "payment_gateway";

alter table if exists "public"."checkout_sessions" drop column if exists "payment_method";

alter table if exists "public"."checkout_sessions" drop column if exists "payment_status";

alter table if exists "public"."checkout_sessions" drop column if exists "public_reference";

alter table if exists "public"."checkout_sessions" drop column if exists "service_mode";

alter table if exists "public"."checkout_sessions" drop column if exists "subtotal_amount";

alter table if exists "public"."checkout_sessions" add column if not exists "cancelled_at" timestamp with time zone;

alter table if exists "public"."checkout_sessions" add column if not exists "converted_at" timestamp with time zone;

alter table if exists "public"."checkout_sessions" add column if not exists "expired_at" timestamp with time zone;

alter table if exists "public"."checkout_sessions" add column if not exists "notes" text;

alter table if exists "public"."checkout_sessions" add column if not exists "paid_at" timestamp with time zone;

alter table if exists "public"."checkout_sessions" add column if not exists "payment_provider" text;

alter table if exists "public"."checkout_sessions" add column if not exists "payment_reference" text;

alter table if exists "public"."checkout_sessions" add column if not exists "payment_url" text;

alter table if exists "public"."checkout_sessions" add column if not exists "public_token" text not null default encode(extensions.gen_random_bytes(16), 'hex'::text);

alter table if exists "public"."checkout_sessions" add column if not exists "status" text not null default 'pending_payment'::text;

alter table if exists "public"."checkout_sessions" add column if not exists "subtotal" numeric(12,2) not null default 0;

alter table "public"."checkout_sessions" alter column "customer_phone" drop not null;

alter table "public"."checkout_sessions" alter column "expires_at" set default (now() + '00:30:00'::interval);

alter table "public"."checkout_sessions" alter column "expires_at" set not null;

alter table "public"."checkout_sessions" alter column "total_amount" set data type numeric(12,2) using "total_amount"::numeric(12,2);

alter table if exists "public"."orders" add column if not exists "checkout_session_id" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_sessions_public_token_key ON public.checkout_sessions USING btree (public_token);

CREATE INDEX IF NOT EXISTS idx_checkout_session_items_product_id ON public.checkout_session_items USING btree (product_id);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_public_token ON public.checkout_sessions USING btree (public_token);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status_created_at ON public.checkout_sessions USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_store_id_created_at ON public.checkout_sessions USING btree (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_checkout_session_id ON public.orders USING btree (checkout_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_id_key ON public.orders USING btree (checkout_session_id);

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_line_total_check";

alter table "public"."checkout_session_items" add constraint "checkout_session_items_line_total_check" CHECK ((line_total >= (0)::numeric)) not valid;

alter table "public"."checkout_session_items" validate constraint "checkout_session_items_line_total_check";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_quantity_check";

alter table "public"."checkout_session_items" add constraint "checkout_session_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."checkout_session_items" validate constraint "checkout_session_items_quantity_check";

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_unit_price_check";

alter table "public"."checkout_session_items" add constraint "checkout_session_items_unit_price_check" CHECK ((unit_price >= (0)::numeric)) not valid;

alter table "public"."checkout_session_items" validate constraint "checkout_session_items_unit_price_check";

do $$
begin
  if to_regclass('public.checkout_sessions') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'checkout_sessions_public_token_key'
         and conrelid = 'public.checkout_sessions'::regclass
     ) then
    execute 'alter table "public"."checkout_sessions" add constraint "checkout_sessions_public_token_key" UNIQUE using index "checkout_sessions_public_token_key"';
  end if;
end $$;

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_status_check";

alter table "public"."checkout_sessions" add constraint "checkout_sessions_status_check" CHECK ((status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'expired'::text, 'cancelled'::text, 'converted'::text]))) not valid;

alter table "public"."checkout_sessions" validate constraint "checkout_sessions_status_check";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_subtotal_check";

alter table "public"."checkout_sessions" add constraint "checkout_sessions_subtotal_check" CHECK ((subtotal >= (0)::numeric)) not valid;

alter table "public"."checkout_sessions" validate constraint "checkout_sessions_subtotal_check";

alter table if exists "public"."checkout_sessions" drop constraint if exists "checkout_sessions_total_amount_check";

alter table "public"."checkout_sessions" add constraint "checkout_sessions_total_amount_check" CHECK ((total_amount >= (0)::numeric)) not valid;

alter table "public"."checkout_sessions" validate constraint "checkout_sessions_total_amount_check";

alter table if exists "public"."orders" drop constraint if exists "orders_checkout_session_id_fkey";

alter table "public"."orders" add constraint "orders_checkout_session_id_fkey" FOREIGN KEY (checkout_session_id) REFERENCES public.checkout_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "orders_checkout_session_id_fkey";

do $$
begin
  if to_regclass('public.orders') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'orders_checkout_session_id_key'
         and conrelid = 'public.orders'::regclass
     ) then
    execute 'alter table "public"."orders" add constraint "orders_checkout_session_id_key" UNIQUE using index "orders_checkout_session_id_key"';
  end if;
end $$;

alter table if exists "public"."checkout_session_items" drop constraint if exists "checkout_session_items_product_id_fkey";

alter table "public"."checkout_session_items" add constraint "checkout_session_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT not valid;

alter table "public"."checkout_session_items" validate constraint "checkout_session_items_product_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.convert_paid_checkout_session_to_order(p_checkout_session_id uuid)
 RETURNS TABLE(order_id uuid, order_public_token uuid, order_number integer, display_code text, order_status public.order_status, placed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_session public.checkout_sessions%rowtype;
  v_order public.orders%rowtype;
  v_item record;
  v_paid_at timestamptz;
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

  v_paid_at := coalesce(v_session.paid_at, now());

  perform pg_advisory_xact_lock(hashtext(v_session.store_id::text), 2);

  for v_item in
    select
      csi.product_id,
      csi.product_name,
      csi.quantity,
      p.id as current_product_id,
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_checkout_session_by_slug(p_slug text, p_customer_name text, p_customer_phone text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(checkout_session_id uuid, public_token text, store_id uuid, status text, total_amount numeric, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_store_id uuid;
  v_accepts_orders boolean;
  v_session_id uuid;
  v_public_token text;
  v_total numeric(12,2);
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_customer_phone_digits text;
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

  if exists (
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
    select 1
    from normalized_items ni
    left join public.products p
      on p.id = ni.product_id
     and p.store_id = v_store_id
    left join public.categories c
      on c.id = p.category_id
     and c.store_id = v_store_id
    where ni.quantity is null
       or ni.quantity <= 0
       or p.id is null
       or c.id is null
       or c.is_active = false
       or p.is_active = false
       or p.is_available = false
       or (p.track_stock = true and coalesce(p.stock_quantity, 0) < ni.quantity)
  ) then
    raise exception 'Carrinho contém item inválido, indisponível ou sem estoque.';
  end if;

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
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_menu_by_slug(p_slug text)
 RETURNS TABLE(category_id uuid, category_name text, category_sort_order integer, product_id uuid, product_name text, product_description text, product_price numeric, product_image_url text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id as category_id,
    c.name as category_name,
    c.sort_order as category_sort_order,
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.image_url as product_image_url
  from public.stores s
  join public.categories c
    on c.store_id = s.id
  join public.products p
    on p.store_id = s.id
   and p.category_id = c.id
  where s.slug = p_slug
    and s.is_active = true
    and c.is_active = true
    and p.is_active = true
    and p.is_available = true
    and (
      p.track_stock = false
      or p.stock_quantity > 0
    )
  order by
    c.sort_order asc,
    p.sort_order asc,
    p.created_at asc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_store_by_slug(p_slug text)
 RETURNS TABLE(store_id uuid, name text, slug text, phone text, accepts_orders boolean, public_message text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id as store_id,
    s.name,
    s.slug,
    s.phone,
    coalesce(ss.accepts_orders, true) as accepts_orders,
    ss.public_message
  from public.stores s
  left join public.store_settings ss
    on ss.store_id = s.id
  where s.slug = p_slug
    and s.is_active = true
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.set_checkout_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.simulate_checkout_payment_success(p_checkout_session_id uuid, p_public_token text)
 RETURNS TABLE(checkout_session_id uuid, checkout_public_token text, checkout_status text, paid_at timestamp with time zone, order_id uuid, order_public_token uuid, order_number integer, display_code text, order_status public.order_status)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_session public.checkout_sessions%rowtype;
  v_order record;
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

  if v_session.status = 'cancelled' then
    raise exception 'A sessão foi cancelada.';
  end if;

  if v_session.status = 'expired' then
    raise exception 'A sessão expirou.';
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

  if v_session.status = 'pending_payment' then
    update public.checkout_sessions as cs
       set status = 'paid',
           paid_at = coalesce(cs.paid_at, now()),
           payment_provider = coalesce(nullif(trim(coalesce(cs.payment_provider, '')), ''), 'manual_test'),
           payment_reference = coalesce(nullif(trim(coalesce(cs.payment_reference, '')), ''), 'manual_approval'),
           updated_at = now()
     where cs.id = v_session.id;
  end if;

  select *
    into v_order
    from public.convert_paid_checkout_session_to_order(v_session.id);

  select *
    into v_session
    from public.checkout_sessions
   where id = v_session.id;

  return query
  select
    v_session.id,
    v_session.public_token,
    v_session.status,
    v_session.paid_at,
    v_order.order_id,
    v_order.order_public_token,
    v_order.order_number,
    v_order.display_code,
    v_order.order_status;
end;
$function$
;

drop policy if exists "Owners can read checkout session items from own store" on "public"."checkout_session_items";


  create policy "Owners can read checkout session items from own store"
  on "public"."checkout_session_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.checkout_sessions cs
     JOIN public.stores s ON ((s.id = cs.store_id)))
  WHERE ((cs.id = checkout_session_items.checkout_session_id) AND (s.owner_id = auth.uid())))));


drop policy if exists "Owners can read checkout sessions from own store" on "public"."checkout_sessions";


  create policy "Owners can read checkout sessions from own store"
  on "public"."checkout_sessions"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = checkout_sessions.store_id) AND (s.owner_id = auth.uid())))));


drop trigger if exists trg_checkout_sessions_updated_at on public.checkout_sessions;
CREATE TRIGGER trg_checkout_sessions_updated_at BEFORE UPDATE ON public.checkout_sessions FOR EACH ROW EXECUTE FUNCTION public.set_checkout_updated_at();

grant execute on function public.get_public_store_by_slug(text) to anon, authenticated;
grant execute on function public.get_public_menu_by_slug(text) to anon, authenticated;

grant execute on function public.create_checkout_session_by_slug(text, text, text, text, jsonb)
to anon, authenticated;

grant execute on function public.convert_paid_checkout_session_to_order(uuid)
to authenticated, service_role;

grant execute on function public.simulate_checkout_payment_success(uuid, text)
to anon, authenticated;
