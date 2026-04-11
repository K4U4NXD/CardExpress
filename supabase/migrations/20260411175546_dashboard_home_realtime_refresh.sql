create policy "dashboard owners can receive home realtime"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part((select realtime.topic()), ':', 1) = 'dashboard-home'
  and split_part((select realtime.topic()), ':', 2) ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$'
  and exists (
    select 1
    from public.stores s
    where s.id = split_part((select realtime.topic()), ':', 2)::uuid
      and s.owner_id = auth.uid()
  )
);

create or replace function public.broadcast_dashboard_home_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_store_id uuid;
begin
  if tg_table_name = 'stores' then
    target_store_id := coalesce(new.id, old.id);
  elsif tg_table_name in ('orders', 'products', 'categories', 'store_settings') then
    target_store_id := coalesce(new.store_id, old.store_id);
  else
    return coalesce(new, old);
  end if;

  if target_store_id is null then
    return coalesce(new, old);
  end if;

  perform realtime.send(
    jsonb_build_object(
      'changed_at', now()
    ),
    'dashboard_refresh',
    format('dashboard-home:%s', target_store_id),
    true
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_dashboard_home_refresh_orders on public.orders;
create trigger trg_dashboard_home_refresh_orders
after insert or update or delete on public.orders
for each row
execute function public.broadcast_dashboard_home_refresh();

drop trigger if exists trg_dashboard_home_refresh_products on public.products;
create trigger trg_dashboard_home_refresh_products
after insert or update or delete on public.products
for each row
execute function public.broadcast_dashboard_home_refresh();

drop trigger if exists trg_dashboard_home_refresh_categories on public.categories;
create trigger trg_dashboard_home_refresh_categories
after insert or update or delete on public.categories
for each row
execute function public.broadcast_dashboard_home_refresh();

drop trigger if exists trg_dashboard_home_refresh_store_settings on public.store_settings;
create trigger trg_dashboard_home_refresh_store_settings
after insert or update or delete on public.store_settings
for each row
execute function public.broadcast_dashboard_home_refresh();

drop trigger if exists trg_dashboard_home_refresh_stores on public.stores;
create trigger trg_dashboard_home_refresh_stores
after insert or update or delete on public.stores
for each row
execute function public.broadcast_dashboard_home_refresh();