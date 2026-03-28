"use client";

import {
  deleteCategoryAction,
  moveCategoryAction,
  toggleCategoryActiveAction,
  updateCategoryNameAction,
} from "@/app/actions/categories";
import type { Category } from "@/types";
import { useState } from "react";

type CategoryRowProps = {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
};

export function CategoryRow({ category, isFirst, isLast }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        {!editing ? (
          <p className="font-medium text-zinc-900">{category.name}</p>
        ) : (
          <form action={updateCategoryNameAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="hidden" name="category_id" value={category.id} />
            <input
              name="name"
              type="text"
              required
              defaultValue={category.name}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 sm:max-w-xs"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              Editar
            </button>
            <form action={toggleCategoryActiveAction} className="inline">
              <input type="hidden" name="category_id" value={category.id} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
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
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
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
