create or replace function public.broadcast_public_panel_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
declare
  target_store_id uuid;
  target_slug text;
  should_broadcast boolean := false;
  new_relevant boolean := false;
  old_relevant boolean := false;
begin
  target_store_id := coalesce(new.store_id, old.store_id);

  if target_store_id is null then
    return coalesce(new, old);
  end if;

  new_relevant :=
    tg_op <> 'DELETE'
    and new.ready_at is not null
    and new.status in ('pronto_para_retirada', 'finalizado');

  old_relevant :=
    tg_op <> 'INSERT'
    and old.ready_at is not null
    and old.status in ('pronto_para_retirada', 'finalizado');

  if tg_op = 'INSERT' then
    should_broadcast := new_relevant;
  elsif tg_op = 'UPDATE' then
    should_broadcast :=
      (new_relevant or old_relevant)
      and (
        new.status is distinct from old.status
        or new.ready_at is distinct from old.ready_at
        or new.display_code is distinct from old.display_code
        or new.store_id is distinct from old.store_id
      );
  else
    should_broadcast := old_relevant;
  end if;

  if not should_broadcast then
    return coalesce(new, old);
  end if;

  select s.slug
  into target_slug
  from public.stores s
  where s.id = target_store_id
  limit 1;

  if target_slug is null then
    return coalesce(new, old);
  end if;

  perform realtime.send(
    jsonb_build_object(
      'changed_at', now()
    ),
    'panel_refresh',
    format('public:panel:%s', target_slug),
    false
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_broadcast_public_panel_refresh on public.orders;

create trigger trg_broadcast_public_panel_refresh
after insert or update or delete on public.orders
for each row
execute function public.broadcast_public_panel_refresh();