"use client";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import Link from "next/link";
import { useActionState } from "react";

type LoginFormProps = {
  nextPath?: string;
  initialError?: string;
  initialSuccess?: string;
};

const initial: AuthFormState = {};

/**
 * Login do dashboard.
 * Respeita o parâmetro next somente depois de sanitizado pela Server Action.
 */
export function LoginForm({ nextPath, initialError, initialSuccess }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const displayError = state?.error ?? initialError;
  const displaySuccess = displayError ? undefined : state?.success ?? initialSuccess;

  return (
    <form
      action={formAction}
      className="cx-brand-panel space-y-4 p-4 sm:p-6"
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
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            Senha
          </label>
          <Link
            href="/recuperar-senha"
            className="text-xs font-medium text-zinc-600 underline underline-offset-2 transition hover:text-zinc-900"
          >
            Esqueci minha senha
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          data-testid="login-password-input"
          toggleTestId="login-password-toggle"
          className="cx-input"
          containerClassName="mt-1"
        />
      </div>
      {displayError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {displayError}
        </p>
      ) : null}
      {displaySuccess ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {displaySuccess}
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
