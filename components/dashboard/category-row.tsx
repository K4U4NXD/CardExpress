"use client";

import {
  deleteCategoryAction,
  moveCategoryAction,
  toggleCategoryActiveAction,
  updateCategoryNameAction,
} from "@/app/actions/categories";
import type { Category } from "@/types";
import { useEffect, useState } from "react";

type CategoryRowProps = {
  category: Category;
  onEditingChange?: (categoryId: string, isEditing: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
};

export function CategoryRow({ category, onEditingChange, isFirst, isLast }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);

  const setEditingState = (isEditing: boolean) => {
    setEditing(isEditing);
    onEditingChange?.(category.id, isEditing);
  };

  useEffect(() => {
    return () => {
      onEditingChange?.(category.id, false);
    };
  }, [category.id, onEditingChange]);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/65 p-3 sm:gap-3 sm:p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {!editing ? (
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-sm font-semibold text-zinc-900 sm:text-base sm:font-medium">{category.name}</p>
            <p className="text-xs text-zinc-500">Use ordenar para ajustar a sequência no cardápio.</p>
          </div>
        ) : (
          <form action={updateCategoryNameAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="category_id" value={category.id} />
            <input
              name="name"
              type="text"
              required
              defaultValue={category.name}
              className="cx-input sm:max-w-xs"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="cx-btn-primary px-3 py-1.5 text-xs sm:text-sm"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditingState(false)}
                className="cx-btn-secondary px-3 py-1.5 text-xs sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="sm:hidden border-t border-zinc-200/80 pt-2">
        <div className="mb-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              category.is_active
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {category.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setEditingState(true)}
              className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs"
            >
              Editar
            </button>
            <form action={toggleCategoryActiveAction} className="w-full">
              <input type="hidden" name="category_id" value={category.id} />
              <button
                type="submit"
                className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs"
              >
                {category.is_active ? "Desativar" : "Ativar"}
              </button>
            </form>
            <form action={moveCategoryAction} className="w-full">
              <input type="hidden" name="category_id" value={category.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={isFirst}
                className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Subir
              </button>
            </form>
            <form action={moveCategoryAction} className="w-full">
              <input type="hidden" name="category_id" value={category.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={isLast}
                className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descer
              </button>
            </form>
            <form
              action={deleteCategoryAction}
              className="col-span-2"
              onSubmit={(event) => {
                if (!confirm(`Excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="category_id" value={category.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Excluir
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="hidden sm:flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            category.is_active
              ? "bg-emerald-100 text-emerald-800"
              : "bg-zinc-200 text-zinc-700"
          }`}
        >
          {category.is_active ? "Ativa" : "Inativa"}
        </span>

        {!editing ? (
          <>
            <button
              type="button"
              onClick={() => setEditingState(true)}
              className="cx-btn-secondary px-3 py-1.5"
            >
              Editar
            </button>
            <form action={toggleCategoryActiveAction} className="inline">
              <input type="hidden" name="category_id" value={category.id} />
              <button
                type="submit"
                className="cx-btn-secondary px-3 py-1.5"
              >
                {category.is_active ? "Desativar" : "Ativar"}
              </button>
            </form>
            <form action={moveCategoryAction} className="inline">
              <input type="hidden" name="category_id" value={category.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={isFirst}
                className="cx-btn-secondary px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Subir
              </button>
            </form>
            <form action={moveCategoryAction} className="inline">
              <input type="hidden" name="category_id" value={category.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={isLast}
                className="cx-btn-secondary px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descer
              </button>
            </form>
            <form
              action={deleteCategoryAction}
              className="inline"
              onSubmit={(event) => {
                if (!confirm(`Excluir a categoria "${category.name}"? Esta ação não pode ser desfeita.`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="category_id" value={category.id} />
              <button
                type="submit"
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Excluir
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
