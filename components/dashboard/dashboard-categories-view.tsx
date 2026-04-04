"use client";

import { useState } from "react";

import { CategoryRow } from "@/components/dashboard/category-row";
import { CreateCategoryForm } from "@/components/dashboard/create-category-form";
import { PageHeader } from "@/components/layout/page-header";
import type { Category } from "@/types";

type DashboardCategoriesViewProps = {
  categories: Category[];
  avisoText: string | null;
  erroText: string | null;
};

export function DashboardCategoriesView({ categories, avisoText, erroText }: DashboardCategoriesViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize o cardápio por seções."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen((open) => !open)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            {isCreateOpen ? "Fechar" : "Nova categoria"}
          </button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
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
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Nova categoria</h2>
              </div>
              <CreateCategoryForm onCancel={() => setIsCreateOpen(false)} />
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Suas categorias</h2>
              <p className="text-xs text-zinc-500">{categories.length} item(ns)</p>
            </div>

            {categories.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                Nenhuma categoria ainda. Use o botão &quot;Nova categoria&quot; para começar.
              </div>
            ) : (
              <div className="mt-2">
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
