"use client";

import { createCategoryAction, type CategoryFormState } from "@/app/actions/categories";
import { useActionState, useEffect, useState } from "react";

const initial: CategoryFormState = {};

type CreateCategoryFormProps = {
  onCancel?: () => void;
};

export function CreateCategoryForm({ onCancel }: CreateCategoryFormProps) {
  const [state, formAction, pending] = useActionState(createCategoryAction, initial);
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLocalError(state?.error);
  }, [state]);

  const handleChange = (value: string) => {
    if (localError) {
      setLocalError(undefined);
    }
    setName(value);
  };

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-category-name" className="block text-sm font-medium text-zinc-800">
            Nova categoria
          </label>
          <input
            id="new-category-name"
            name="name"
            type="text"
            required
            placeholder="Ex.: Bebidas"
            value={name}
            onChange={(event) => handleChange(event.target.value)}
            aria-invalid={Boolean(localError)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Salvando…" : "Adicionar"}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 sm:w-auto"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>
      {localError ? (
        <p className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
    </form>
  );
}
