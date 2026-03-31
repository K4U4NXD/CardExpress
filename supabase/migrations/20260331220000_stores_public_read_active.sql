create policy "stores_public_read_active"
on public.stores
for select
to anon, authenticated
using (is_active = true);
