-- =========================================================
-- CARDEXPRESS — STORAGE PARA LOGOS DE LOJA
-- Bucket público: public-assets
-- Path usado no código:
--   store-logos/<store-id>/arquivo.ext
-- =========================================================

-- 1) Garantir bucket público
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Limpar policies antigas que possam conflitar
drop policy if exists "Public can read public-assets" on storage.objects;
drop policy if exists "Public can list public-assets" on storage.objects;
drop policy if exists "Anyone can read public-assets" on storage.objects;
drop policy if exists "Clients can list all files in this bucket" on storage.objects;

drop policy if exists "Authenticated can upload own store logos" on storage.objects;
drop policy if exists "Authenticated can select own store logos" on storage.objects;
drop policy if exists "Authenticated can update own store logos" on storage.objects;
drop policy if exists "Authenticated can delete own store logos" on storage.objects;

-- 3) Upload autenticado para o bucket public-assets,
-- sem restringir por auth.uid() no path, já que o código usa <store-id>.
drop policy if exists "Authenticated can upload store logos to public-assets" on storage.objects;
create policy "Authenticated can upload store logos to public-assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] = 'store-logos'
);

-- 4) SELECT autenticado para arquivos da pasta store-logos
-- (necessário para update sob RLS)
drop policy if exists "Authenticated can select store logos from public-assets" on storage.objects;
create policy "Authenticated can select store logos from public-assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] = 'store-logos'
);

-- 5) UPDATE autenticado para arquivos da pasta store-logos
drop policy if exists "Authenticated can update store logos in public-assets" on storage.objects;
create policy "Authenticated can update store logos in public-assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] = 'store-logos'
)
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] = 'store-logos'
);

-- 6) DELETE autenticado para arquivos da pasta store-logos
drop policy if exists "Authenticated can delete store logos from public-assets" on storage.objects;
create policy "Authenticated can delete store logos from public-assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] = 'store-logos'
);