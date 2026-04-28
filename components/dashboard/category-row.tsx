"use client";

import { updateCategoryNameAction } from "@/app/actions/categories";
import { SelectionCheckbox } from "@/components/dashboard/selection-checkbox";
import type { Category } from "@/types";
import { useEffect, useState } from "react";

type CategoryRowProps = {
  category: Category;
  onEditingChange?: (categoryId: string, isEditing: boolean) => void;
  isSelected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelected?: () => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMoveBusy?: boolean;
  hasMoveIssue?: boolean;
  editRequestToken?: number;
};

export function CategoryRow({
  category,
  onEditingChange,
  isSelected = false,
  selectionDisabled = false,
  onToggleSelected,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isMoveBusy = false,
  hasMoveIssue = false,
  editRequestToken = 0,
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

  useEffect(() => {
    if (editRequestToken > 0) {
      setEditingState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestToken]);

  return (
    <>
      <div
        className={`flex flex-col gap-2.5 rounded-xl border p-3.5 transition sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4 ${
          isSelected
            ? "border-zinc-300 bg-zinc-50/90 shadow-[0_14px_32px_-28px_rgba(24,24,27,0.7)] ring-1 ring-zinc-300/70"
            : "border-zinc-200/80 bg-zinc-50/65"
        }`}
      >
        <div className="min-w-0 flex-1">
          {!editing ? (
            <div className="mb-2.5 flex items-center justify-between sm:hidden">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ordem na lista</p>
              <div className="flex items-center gap-2">
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

        <div className="border-t border-zinc-200/80 pt-2.5 sm:hidden">
          <div className="flex items-center justify-between gap-3">
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
              <SelectionCheckbox
                checked={isSelected}
                onChange={onToggleSelected ?? (() => undefined)}
                disabled={selectionDisabled}
                label={`Selecionar categoria ${category.name}`}
              />
            ) : null}
          </div>
        </div>

        <div className="hidden sm:flex sm:items-center sm:gap-2.5">
          {!editing ? (
            <SelectionCheckbox
              checked={isSelected}
              onChange={onToggleSelected ?? (() => undefined)}
              disabled={selectionDisabled}
              label={`Selecionar categoria ${category.name}`}
              testId={`category-select-${category.id}`}
            />
          ) : null}

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
      </div>
    </>
  );
}
