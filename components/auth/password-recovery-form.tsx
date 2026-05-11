"use client";

import {
  requestPasswordRecoveryAction,
  type PasswordRecoveryFormState,
} from "@/app/actions/auth";
import { useActionState, useEffect, useState } from "react";

const initial: PasswordRecoveryFormState = {};

/**
 * Formulário de recuperação de senha.
 * A mensagem de sucesso é neutra para não indicar se o e-mail existe.
 */
export function PasswordRecoveryForm() {
  const [state, formAction, pending] = useActionState(requestPasswordRecoveryAction, initial);
  const [email, setEmail] = useState("");
  const fieldError = state?.fieldErrors?.email;

  useEffect(() => {
    if (state?.values?.email) {
      setEmail(state.values.email);
    }
  }, [state?.values?.email]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white/96 p-5 shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "email-error" : undefined}
          className="cx-input mt-1"
        />
        {fieldError ? (
          <p id="email-error" className="mt-1 text-xs text-red-700">
            {fieldError}
          </p>
        ) : null}
      </div>

      {state?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cx-btn-primary min-h-11 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </button>
    </form>
  );
}
