create or replace function public.broadcast_public_order_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
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
$$;

drop trigger if exists trg_broadcast_public_order_refresh on public.orders;

create trigger trg_broadcast_public_order_refresh
after update or delete on public.orders
for each row
execute function public.broadcast_public_order_refresh();