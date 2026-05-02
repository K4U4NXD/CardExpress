"use client";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { useActionState } from "react";

type LoginFormProps = {
  nextPath?: string;
  initialError?: string;
};

const initial: AuthFormState = {};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const displayError = state?.error ?? initialError;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white/96 p-5 shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6"
    >
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="cx-input mt-1"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="cx-input mt-1"
        />
      </div>
      {displayError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {displayError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="cx-btn-primary min-h-11 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
