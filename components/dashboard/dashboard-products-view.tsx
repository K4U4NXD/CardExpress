"use client";

import { useMemo, useState } from "react";

import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { CreateProductForm } from "@/components/dashboard/create-product-form";
import { ProductRow } from "@/components/dashboard/product-row";
import { PageHeader } from "@/components/layout/page-header";
import type { Category, Product } from "@/types";

type DashboardProductsViewProps = {
  storeId: string;
  categories: Category[];
  products: Product[];
  avisoText: string | null;
  erroText: string | null;
};

export function DashboardProductsView({
  storeId,
  categories,
  products,
  avisoText,
  erroText,
}: DashboardProductsViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const categoriesForCreate = useMemo(
    () => categories.filter((category) => category.is_active).map((category) => ({ id: category.id, name: category.name })),
    [categories]
  );

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Gerencie os itens exibidos no cardapio publico da loja."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-5xl"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen((open) => !open)}
            className="cx-btn-secondary px-3 py-2"
          >
            {isCreateOpen ? "Fechar" : "Novo produto"}
          </button>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <DashboardProductsRealtimeSync storeId={storeId} className="mb-3" />

        {erroText ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {erroText}
          </p>
        ) : null}

        {avisoText ? (
          <p
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {avisoText}
          </p>
        ) : null}

        <div className="space-y-4">
          {isCreateOpen ? (
            <section id="novo-produto" className="cx-panel p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Novo produto</h2>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="cx-btn-secondary px-3 py-1.5"
                >
                  Cancelar
                </button>
              </div>
              <CreateProductForm categories={categoriesForCreate} onCancel={() => setIsCreateOpen(false)} />
            </section>
          ) : null}

          <section className="cx-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Produtos cadastrados</h2>
              <p className="text-xs text-zinc-500">
                {products.length} {products.length === 1 ? "produto" : "produtos"}
              </p>
            </div>
            {products.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">Ajuste dados e status sem sair desta lista.</p>
            ) : null}

            {products.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">Nenhum produto cadastrado.</p>
                <p className="mt-1 text-xs text-zinc-500">Crie um produto para iniciar a exibicao no cardapio.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {products.map((product, index) => {
                  const baseOptions = categories
                    .filter((category) => category.is_active || category.id === product.category_id)
                    .map((category) => ({ id: category.id, name: category.name }));

                  const hasCurrent = baseOptions.some((option) => option.id === product.category_id);

                  const categoryOptions = hasCurrent
                    ? baseOptions
                    : [
                        {
                          id: product.category_id,
                          name: categoryNameById[product.category_id] ?? "Categoria",
                        },
                        ...baseOptions,
                      ];

                  return (
                    <ProductRow
                      key={product.id}
                      product={product}
                      categoryName={categoryNameById[product.category_id] ?? "—"}
                      categoryOptions={categoryOptions}
                      isFirst={index === 0}
                      isLast={index === products.length - 1}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
