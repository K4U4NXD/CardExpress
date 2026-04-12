"use client";

import { useState } from "react";

import { CategoryRow } from "@/components/dashboard/category-row";
import { CreateCategoryForm } from "@/components/dashboard/create-category-form";
import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { PageHeader } from "@/components/layout/page-header";
import type { Category } from "@/types";

type DashboardCategoriesViewProps = {
  storeId: string;
  categories: Category[];
  avisoText: string | null;
  erroText: string | null;
};

export function DashboardCategoriesView({ storeId, categories, avisoText, erroText }: DashboardCategoriesViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize as secoes do cardapio para facilitar a navegacao do cliente."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen((open) => !open)}
            className="cx-btn-secondary px-3 py-2"
          >
            {isCreateOpen ? "Fechar" : "Nova categoria"}
          </button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DashboardProductsRealtimeSync storeId={storeId} className="mb-3" />

        {erroText ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
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
            <section className="cx-panel p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Nova categoria</h2>
              </div>
              <CreateCategoryForm onCancel={() => setIsCreateOpen(false)} />
            </section>
          ) : null}

          <section className="cx-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Categorias cadastradas</h2>
              <p className="text-xs text-zinc-500">
                {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
              </p>
            </div>

            {categories.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">Nenhuma categoria cadastrada.</p>
                <p className="mt-1 text-xs text-zinc-500">Use o botao &quot;Nova categoria&quot; para iniciar a estrutura do cardapio.</p>
              </div>
            ) : (
              <div className="mt-3 sm:mt-2 space-y-2 sm:space-y-0">
                {categories.map((cat, index) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    isFirst={index === 0}
                    isLast={index === categories.length - 1}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
