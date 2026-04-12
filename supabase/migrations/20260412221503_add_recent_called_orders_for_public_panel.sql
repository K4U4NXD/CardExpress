create or replace function public.get_recent_called_orders_for_store(
  p_slug text,
  p_limit integer default 5
)
returns table(
  id uuid,
  display_code text,
  ready_at timestamp with time zone,
  status public.order_status
)
language sql
security definer
set search_path = public
as $function$
  select
    o.id,
    o.display_code,
    o.ready_at,
    o.status
  from public.orders o
  join public.stores s
    on s.id = o.store_id
  where s.slug = p_slug
    and o.ready_at is not null
    and o.status in ('pronto_para_retirada', 'finalizado')
  order by o.ready_at desc, o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 10))
$function$;

grant execute on function public.get_recent_called_orders_for_store(text, integer) to anon;
grant execute on function public.get_recent_called_orders_for_store(text, integer) to authenticated;
grant execute on function public.get_recent_called_orders_for_store(text, integer) to service_role;