drop policy "checkout_sessions_public_insert" on "public"."checkout_sessions";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_latest_ready_order_for_store(p_slug text)
 RETURNS TABLE(order_id uuid, display_code text, ready_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    o.id as order_id,
    o.display_code,
    o.ready_at
  from public.orders o
  join public.stores s
    on s.id = o.store_id
  where s.slug = p_slug
    and o.status in ('pronto_para_retirada', 'finalizado')
    and o.ready_at is not null
  order by o.ready_at desc nulls last, o.created_at desc
  limit 1
$function$
;


