"use client";

import {
  deleteCategoryAction,
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMoveBusy?: boolean;
  hasMoveIssue?: boolean;
};

export function CategoryRow({
  category,
  onEditingChange,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isMoveBusy = false,
  hasMoveIssue = false,
}: CategoryRowProps) {
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
    <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/65 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
      <div className="min-w-0 flex-1">
        {!editing ? (
          <div className="mb-2.5 flex items-center justify-between sm:hidden">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ordem na lista</p>
            <div
              className={`inline-flex items-center gap-1 rounded-lg border bg-white px-1 py-1 ${
                hasMoveIssue ? "border-red-300" : "border-zinc-200"
              }`}
            >
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst || isMoveBusy}
                aria-label={`Mover categoria ${category.name} para cima`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <span aria-hidden>↑</span>
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast || isMoveBusy}
                aria-label={`Mover categoria ${category.name} para baixo`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <span aria-hidden>↓</span>
              </button>
            </div>
          </div>
        ) : null}

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

      <div className="sm:hidden border-t border-zinc-200/80 pt-2.5">
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
          <div className="grid grid-cols-2 gap-2">
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

      <div className="hidden sm:flex sm:items-center sm:gap-2.5">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
