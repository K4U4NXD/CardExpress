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
    <form action={formAction} data-testid="create-category-form" className="space-y-3">
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
            className="cx-input mt-1"
          />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            type="submit"
            disabled={pending}
            data-testid="submit-create-category"
            className="cx-btn-primary w-full px-4 py-2 disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Salvando…" : "Adicionar"}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="cx-btn-secondary w-full px-4 py-2 sm:w-auto"
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
