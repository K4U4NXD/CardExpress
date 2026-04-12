drop policy if exists "dashboard owners can receive products realtime" on realtime.messages;

create policy "dashboard owners can receive products realtime"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part((select realtime.topic()), ':', 1) = 'dashboard-products'
  and split_part((select realtime.topic()), ':', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
  and exists (
    select 1
    from public.stores s
    where s.id = split_part((select realtime.topic()), ':', 2)::uuid
      and s.owner_id = auth.uid()
  )
);

create or replace function public.broadcast_dashboard_products_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $function$
declare
  target_store_id uuid;
begin
  if tg_table_name not in ('products', 'categories') then
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

drop trigger if exists trg_dashboard_products_refresh_products on public.products;
create trigger trg_dashboard_products_refresh_products
after insert or update or delete on public.products
for each row
execute function public.broadcast_dashboard_products_refresh();

drop trigger if exists trg_dashboard_products_refresh_categories on public.categories;
create trigger trg_dashboard_products_refresh_categories
after insert or update or delete on public.categories
for each row
execute function public.broadcast_dashboard_products_refresh();

create or replace function public.send_public_menu_refresh(p_slug text)
returns void
language plpgsql
security definer
set search_path = public, realtime
as $function$
begin
  if p_slug is null or btrim(p_slug) = '' then
    return;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'changed_at', now()
    ),
    'menu_refresh',
    format('public:menu:%s', p_slug),
    false
  );
end;
$function$;

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
  elsif tg_table_name in ('products', 'categories', 'store_settings') then
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

drop trigger if exists trg_public_menu_refresh_products on public.products;
create trigger trg_public_menu_refresh_products
after insert or update or delete on public.products
for each row
execute function public.broadcast_public_menu_refresh();

drop trigger if exists trg_public_menu_refresh_categories on public.categories;
create trigger trg_public_menu_refresh_categories
after insert or update or delete on public.categories
for each row
execute function public.broadcast_public_menu_refresh();

drop trigger if exists trg_public_menu_refresh_store_settings on public.store_settings;
create trigger trg_public_menu_refresh_store_settings
after insert or update or delete on public.store_settings
for each row
execute function public.broadcast_public_menu_refresh();

drop trigger if exists trg_public_menu_refresh_stores on public.stores;
create trigger trg_public_menu_refresh_stores
after insert or update or delete on public.stores
for each row
execute function public.broadcast_public_menu_refresh();