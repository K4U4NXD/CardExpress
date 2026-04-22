-- CardExpress
-- Soft delete operacional para produtos com historico.
-- Objetivo: permitir acao de "Excluir" sem quebrar FKs de checkout/pedidos.

begin;

alter table if exists public.products
  add column if not exists archived_at timestamp with time zone;

create index if not exists idx_products_store_archived_sort
  on public.products (store_id, archived_at, sort_order, created_at);

commit;
