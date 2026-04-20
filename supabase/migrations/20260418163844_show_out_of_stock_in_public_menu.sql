-- CardExpress
-- Objetivo: exibir produtos sem estoque no cardápio público, mas continuar bloqueando a compra.
-- Impacto mínimo: altera apenas a RPC public.get_public_menu_by_slug(text).

begin;

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
  join public.products p
    on p.store_id = s.id
   and p.category_id = c.id
  where s.slug = p_slug
    and s.is_active = true
    and c.is_active = true
    and p.is_active = true
    and p.is_available = true
  order by
    c.sort_order asc,
    p.sort_order asc,
    p.created_at asc;
$function$;

grant execute on function public.get_public_menu_by_slug(text) to anon, authenticated;

commit;