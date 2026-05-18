"use client";

import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import Link from "next/link";
import { useActionState, useState } from "react";

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
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({});
  const displayError = state?.error ?? initialError;
  const displaySuccess = displayError ? undefined : state?.success ?? initialSuccess;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: typeof clientErrors = {};

    if (!email) {
      nextErrors.email = "Informe seu e-mail.";
    }

    if (!password) {
      nextErrors.password = "Informe sua senha.";
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={handleSubmit}
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
          aria-invalid={Boolean(clientErrors.email)}
          aria-describedby={clientErrors.email ? "login-email-error" : undefined}
          onChange={() => setClientErrors((current) => ({ ...current, email: undefined }))}
          className={`cx-input mt-1 ${clientErrors.email ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {clientErrors.email ? (
          <p id="login-email-error" className="mt-1 text-xs text-red-700">
            {clientErrors.email}
          </p>
        ) : null}
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
          aria-invalid={Boolean(clientErrors.password)}
          aria-describedby={clientErrors.password ? "login-password-error" : undefined}
          onChange={() => setClientErrors((current) => ({ ...current, password: undefined }))}
          data-testid="login-password-input"
          toggleTestId="login-password-toggle"
          className={`cx-input ${clientErrors.password ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          containerClassName="mt-1"
        />
        {clientErrors.password ? (
          <p id="login-password-error" className="mt-1 text-xs text-red-700">
            {clientErrors.password}
          </p>
        ) : null}
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
