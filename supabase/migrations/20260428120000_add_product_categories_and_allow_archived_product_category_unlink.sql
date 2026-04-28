begin;

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (product_id, category_id)
);

create index if not exists idx_product_categories_store_category
  on public.product_categories (store_id, category_id);

create index if not exists idx_product_categories_store_product
  on public.product_categories (store_id, product_id);

create or replace function public.validate_product_category_store()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_product_store_id uuid;
  v_category_store_id uuid;
begin
  select p.store_id
    into v_product_store_id
    from public.products p
   where p.id = new.product_id;

  select c.store_id
    into v_category_store_id
    from public.categories c
   where c.id = new.category_id;

  if v_product_store_id is null or v_category_store_id is null then
    raise exception 'Produto ou categoria nao encontrados.';
  end if;

  if new.store_id is distinct from v_product_store_id
     or new.store_id is distinct from v_category_store_id then
    raise exception 'Produto e categoria precisam pertencer a mesma loja.';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_product_categories_validate_store on public.product_categories;
create trigger trg_product_categories_validate_store
before insert or update on public.product_categories
for each row
execute function public.validate_product_category_store();

insert into public.product_categories (product_id, category_id, store_id)
select p.id, p.category_id, p.store_id
  from public.products p
 where p.category_id is not null
on conflict (product_id, category_id) do nothing;

alter table public.products
  alter column category_id drop not null;

alter table public.products
  drop constraint if exists products_category_id_fkey;

alter table public.products
  add constraint products_category_id_fkey
  foreign key (category_id)
  references public.categories(id)
  on delete set null;

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_owner_all" on public.product_categories;
create policy "product_categories_owner_all"
on public.product_categories
to authenticated
using (
  exists (
    select 1
      from public.stores s
     where s.id = product_categories.store_id
       and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.stores s
     where s.id = product_categories.store_id
       and s.owner_id = auth.uid()
  )
);

drop policy if exists "product_categories_public_read_active" on public.product_categories;

revoke all on table public.product_categories from anon;
revoke all on table public.product_categories from authenticated;
revoke all on table public.product_categories from service_role;

grant select, insert, update, delete on table public.product_categories to authenticated;
grant all on table public.product_categories to service_role;

create or replace function public.broadcast_dashboard_products_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $function$
declare
  target_store_id uuid;
begin
  if tg_table_name not in ('products', 'categories', 'product_categories') then
    return coalesce(new, old);
  end if;

  target_store_id := coalesce(new.store_id, old.store_id);

  if target_store_id is null then
    return coalesce(new, old);
  end if;

  perform realtime.send(
    jsonb_build_object(
      'changed_at', now()
    ),
    'products_refresh',
    format('dashboard-products:%s', target_store_id),
    true
  );

  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_dashboard_products_refresh_product_categories on public.product_categories;
create trigger trg_dashboard_products_refresh_product_categories
after insert or update or delete on public.product_categories
for each row
execute function public.broadcast_dashboard_products_refresh();

create or replace function public.broadcast_public_menu_refresh()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_store_id uuid;
  new_slug text;
  old_slug text;
begin
  if tg_table_name = 'stores' then
    if tg_op <> 'DELETE' then
      new_slug := nullif(trim(coalesce(new.slug, '')), '');
    end if;

    if tg_op <> 'INSERT' then
      old_slug := nullif(trim(coalesce(old.slug, '')), '');
    end if;
  elsif tg_table_name in ('products', 'categories', 'product_categories', 'store_settings') then
    target_store_id := coalesce(new.store_id, old.store_id);

    if target_store_id is null then
      return coalesce(new, old);
    end if;

    select nullif(trim(s.slug), '')
      into new_slug
      from public.stores s
     where s.id = target_store_id
     limit 1;

    old_slug := new_slug;
  else
    return coalesce(new, old);
  end if;

  if new_slug is not null then
    perform public.send_public_menu_refresh(new_slug);
  end if;

  if old_slug is not null and old_slug is distinct from new_slug then
    perform public.send_public_menu_refresh(old_slug);
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists trg_public_menu_refresh_product_categories on public.product_categories;
create trigger trg_public_menu_refresh_product_categories
after insert or update or delete on public.product_categories
for each row
execute function public.broadcast_public_menu_refresh();

drop function if exists public.get_public_menu_by_slug(text);

create function public.get_public_menu_by_slug(p_slug text)
returns table(
  category_id uuid,
  category_name text,
  category_sort_order integer,
  product_id uuid,
  product_name text,
  product_description text,
  product_price numeric,
  product_image_url text,
  track_stock boolean,
  stock_quantity integer
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    c.id as category_id,
    c.name as category_name,
    c.sort_order as category_sort_order,
    p.id as product_id,
    p.name as product_name,
    p.description as product_description,
    p.price as product_price,
    p.image_url as product_image_url,
    p.track_stock,
    p.stock_quantity
  from public.stores s
  join public.categories c
    on c.store_id = s.id
  join public.product_categories pc
    on pc.store_id = s.id
   and pc.category_id = c.id
  join public.products p
    on p.id = pc.product_id
   and p.store_id = s.id
  where s.slug = p_slug
    and s.is_active = true
    and c.is_active = true
    and p.is_active = true
    and p.is_available = true
    and p.archived_at is null
  order by
    c.sort_order asc,
    p.sort_order asc,
    p.created_at asc;
$function$;

grant execute on function public.get_public_menu_by_slug(text) to anon, authenticated;

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
    raise exception 'Slug da loja e obrigatorio.';
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Nome do cliente e obrigatorio.';
  end if;

  if coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Telefone do cliente e obrigatorio.';
  end if;

  v_customer_phone_digits := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');

  if length(v_customer_phone_digits) not in (10, 11) then
    raise exception 'Telefone do cliente invalido.';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Itens invalidos.';
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
    raise exception 'Loja nao encontrada.';
  end if;

  if not v_accepts_orders_manual then
    raise exception 'Esta loja nao esta aceitando pedidos no momento.';
  end if;

  if v_auto_accept_orders_by_schedule and not v_is_within_service_hours then
    raise exception 'A loja esta fora do horario de atendimento.';
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
      exists (
        select 1
          from public.product_categories pc
          join public.categories c
            on c.id = pc.category_id
           and c.store_id = v_store_id
         where pc.product_id = p.id
           and pc.store_id = v_store_id
           and c.is_active = true
      ) as has_active_category,
      p.is_active as product_is_active,
      p.is_available as product_is_available,
      p.archived_at as product_archived_at,
      p.track_stock,
      p.stock_quantity
    from normalized_items ni
    left join public.products p
      on p.id = ni.product_id
     and p.store_id = v_store_id
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Quantidade invalida para um item do carrinho.';
    end if;

    if v_item.current_product_id is null or not v_item.has_active_category then
      raise exception 'Um dos produtos do carrinho nao foi encontrado.';
    end if;

    if v_item.product_is_active = false
       or v_item.product_is_available = false
       or v_item.product_archived_at is not null then
      raise exception 'O produto "%" nao esta disponivel no momento.', v_item.product_name;
    end if;

    if v_item.track_stock = true
       and coalesce(v_item.stock_quantity, 0) < v_item.quantity then
      raise exception
        'Estoque insuficiente para "%" (disponivel: %, solicitado: %).',
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
    where ni.quantity > 0
      and p.is_active = true
      and p.is_available = true
      and p.archived_at is null
      and (p.track_stock = false or coalesce(p.stock_quantity, 0) >= ni.quantity)
      and exists (
        select 1
          from public.product_categories pc
          join public.categories c
            on c.id = pc.category_id
           and c.store_id = v_store_id
         where pc.product_id = p.id
           and pc.store_id = v_store_id
           and c.is_active = true
      )
  )
  select coalesce(sum(line_total), 0)::numeric(12,2)
    into v_total
  from validated_items;

  if v_total <= 0 then
    raise exception 'Carrinho invalido ou vazio.';
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
    where ni.quantity > 0
      and p.is_active = true
      and p.is_available = true
      and p.archived_at is null
      and (p.track_stock = false or coalesce(p.stock_quantity, 0) >= ni.quantity)
      and exists (
        select 1
          from public.product_categories pc
          join public.categories c
            on c.id = pc.category_id
           and c.store_id = v_store_id
         where pc.product_id = p.id
           and pc.store_id = v_store_id
           and c.is_active = true
      )
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

commit;
