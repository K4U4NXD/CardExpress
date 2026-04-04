create or replace function public.sync_product_availability()
returns trigger
language plpgsql
as $$
begin
  new.stock_quantity := greatest(coalesce(new.stock_quantity, 0), 0);

  if new.is_available is null then
    new.is_available := true;
  end if;

  return new;
end;
$$;
