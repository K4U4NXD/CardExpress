begin;

create table if not exists public.store_operational_periods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  mode text not null check (mode in ('manual', 'schedule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_operational_periods_closed_after_opened
    check (closed_at is null or closed_at >= opened_at)
);

create index if not exists store_operational_periods_store_opened_idx
  on public.store_operational_periods (store_id, opened_at desc);

create unique index if not exists store_operational_periods_one_open_manual_idx
  on public.store_operational_periods (store_id)
  where mode = 'manual' and closed_at is null;

drop trigger if exists trg_store_operational_periods_updated_at on public.store_operational_periods;

create trigger trg_store_operational_periods_updated_at
before update on public.store_operational_periods
for each row execute function public.set_updated_at();

alter table public.store_operational_periods enable row level security;

drop policy if exists store_operational_periods_owner_all on public.store_operational_periods;

create policy store_operational_periods_owner_all
on public.store_operational_periods
for all
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_operational_periods.store_id
      and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stores s
    where s.id = store_operational_periods.store_id
      and s.owner_id = auth.uid()
  )
);

grant select, insert, update on public.store_operational_periods to authenticated;

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
    select (coalesce(p_reference, now()) at time zone 'America/Sao_Paulo')::time as local_time_sp
  )
  select
    case
      when coalesce(p_auto_accept_orders_by_schedule, false) = false then true
      when p_opening_time is null or p_closing_time is null then false
      when p_opening_time = p_closing_time then false
      when p_opening_time < p_closing_time then reference_time.local_time_sp >= p_opening_time
        and reference_time.local_time_sp < p_closing_time
      else reference_time.local_time_sp >= p_opening_time
        or reference_time.local_time_sp < p_closing_time
    end
  from reference_time;
$function$;

commit;