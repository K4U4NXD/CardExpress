"use client";

import { completeSignupStoreAction, type CompleteSignupStoreState } from "@/app/actions/auth";
import { useActionState, useEffect, useState } from "react";

const INITIAL_STATE: CompleteSignupStoreState = {};

type CompleteSignupStoreFormProps = {
  initialSlug?: string;
};

export function CompleteSignupStoreForm({ initialSlug = "" }: CompleteSignupStoreFormProps) {
  const [state, formAction, pending] = useActionState(completeSignupStoreAction, INITIAL_STATE);
  const [slug, setSlug] = useState(initialSlug);

  useEffect(() => {
    if (typeof state?.value === "string") {
      setSlug(state.value);
    }
  }, [state?.value]);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/70 p-5 shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">Escolha o slug final da sua loja</h2>
        <p className="text-xs text-zinc-600">Esse endereço será usado na página pública e ficará vinculado à sua conta.</p>
      </div>

      <div>
        <label htmlFor="store_slug" className="block text-sm font-medium text-zinc-800">
          Novo slug da loja
        </label>
        <input
          id="store_slug"
          name="store_slug"
          type="text"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ex.: minha-lanchonete"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          aria-invalid={Boolean(state?.fieldErrors?.store_slug)}
          aria-describedby={state?.fieldErrors?.store_slug ? "store_slug-error" : "store_slug-help"}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
        />
        <p id="store_slug-help" className="mt-1 text-xs text-zinc-500">
          Use apenas letras minúsculas, números e hífens, sem espaços.
        </p>
        {state?.fieldErrors?.store_slug ? (
          <p id="store_slug-error" className="mt-1 text-xs text-red-700">
            {state.fieldErrors.store_slug}
          </p>
        ) : null}
      </div>

      {state?.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-[0_14px_24px_-18px_rgba(24,24,27,0.9)] hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Finalizando cadastro..." : "Concluir criação da loja"}
      </button>
    </form>
  );
}
