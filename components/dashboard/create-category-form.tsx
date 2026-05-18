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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (name.trim()) {
      return;
    }

    event.preventDefault();
    setLocalError("Informe o nome da categoria.");
  };

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} data-testid="create-category-form" className="space-y-3">
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
            aria-describedby={localError ? "new-category-name-error" : undefined}
            className={`cx-input mt-1 ${localError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
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
        <p id="new-category-name-error" className="text-sm text-red-700" role="alert">
          {localError}
        </p>
      ) : null}
    </form>
  );
}
