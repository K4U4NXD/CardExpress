-- =========================================================
-- CARDEXPRESS - HOTFIX RLS PARA PRODUCT IMAGES
-- Motivo:
--   Upload de product-images falha com RLS mesmo com:
--   - usuario autenticado
--   - owner da store conferindo com auth user
--   - path correto: product-images/<store-id>/<product-id|draft>/arquivo.ext
--
-- Estrategia minima:
--   Alinhar regras de product-images ao mesmo padrao permissivo
--   ja utilizado por store-logos no bucket public-assets.
-- =========================================================

-- INSERT autenticado para pasta product-images do bucket public-assets
DROP POLICY IF EXISTS "Authenticated can upload product images to public-assets" ON storage.objects;
CREATE POLICY "Authenticated can upload product images to public-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'product-images'
);

-- SELECT autenticado para pasta product-images
DROP POLICY IF EXISTS "Authenticated can select product images from public-assets" ON storage.objects;
CREATE POLICY "Authenticated can select product images from public-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'product-images'
);

-- UPDATE autenticado para pasta product-images
DROP POLICY IF EXISTS "Authenticated can update product images in public-assets" ON storage.objects;
CREATE POLICY "Authenticated can update product images in public-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'product-images'
)
WITH CHECK (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'product-images'
);

-- DELETE autenticado para pasta product-images
DROP POLICY IF EXISTS "Authenticated can delete product images from public-assets" ON storage.objects;
CREATE POLICY "Authenticated can delete product images from public-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'product-images'
);
