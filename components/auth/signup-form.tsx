"use client";

import { signupAction, type AuthFormState } from "@/app/actions/auth";
import { evaluatePasswordCriteria } from "@/lib/auth/validation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

const initial: AuthFormState = {};
const EMPTY_VALUES: NonNullable<AuthFormState["values"]> = {
  full_name: "",
  email: "",
  store_name: "",
  store_slug: "",
  phone: "",
};

function composeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

function resolvePasswordStrength(score: number): { label: string; barClassName: string } {
  if (score <= 1) {
    return { label: "muito fraca", barClassName: "bg-red-500" };
  }

  if (score === 2) {
    return { label: "fraca", barClassName: "bg-amber-500" };
  }

  if (score === 3) {
    return { label: "média", barClassName: "bg-yellow-500" };
  }

  return { label: "forte", barClassName: "bg-emerald-500" };
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const lastSubmittedSecretsRef = useRef({ password: "", passwordConfirmation: "" });

  useEffect(() => {
    if (!state?.values) {
      return;
    }

    setValues((current) => ({
      ...current,
      ...state.values,
    }));
  }, [state?.values]);

  useEffect(() => {
    if (!state?.success) {
      const hasServerFeedback = Boolean(state?.error) || Boolean(state?.fieldErrors);
      if (!hasServerFeedback) {
        return;
      }

      const hasPasswordErrors = Boolean(state?.fieldErrors?.password || state?.fieldErrors?.password_confirmation);
      if (hasPasswordErrors) {
        return;
      }

      if (!password && lastSubmittedSecretsRef.current.password) {
        setPassword(lastSubmittedSecretsRef.current.password);
      }
      if (!passwordConfirmation && lastSubmittedSecretsRef.current.passwordConfirmation) {
        setPasswordConfirmation(lastSubmittedSecretsRef.current.passwordConfirmation);
      }
      return;
    }

    setValues(EMPTY_VALUES);
    setPassword("");
    setPasswordConfirmation("");
  }, [password, passwordConfirmation, state?.error, state?.fieldErrors, state?.success]);

  const passwordCriteria = useMemo(() => evaluatePasswordCriteria(password), [password]);
  const passwordScore = useMemo(() => {
    return Object.values(passwordCriteria).filter(Boolean).length;
  }, [passwordCriteria]);
  const passwordStrength = useMemo(() => {
    return resolvePasswordStrength(passwordScore);
  }, [passwordScore]);
  const hasPasswordInput = password.length > 0;

  const fieldErrors = state?.fieldErrors ?? {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const showGlobalError = Boolean(state?.error) && !hasFieldErrors;

  return (
    <form
      action={formAction}
      className="space-y-3.5 rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6"
      onSubmit={() => {
        lastSubmittedSecretsRef.current = {
          password,
          passwordConfirmation,
        };
      }}
    >
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-zinc-800">
          Nome completo
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          value={values.full_name}
          onChange={(event) => setValues((current) => ({ ...current, full_name: event.target.value }))}
          aria-invalid={Boolean(fieldErrors.full_name)}
          aria-describedby={fieldErrors.full_name ? "full_name-error" : undefined}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.full_name ? (
          <p id="full_name-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.full_name}
          </p>
        ) : null}
      </div>
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
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.email ? (
          <p id="email-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={composeDescribedBy("password-help", fieldErrors.password ? "password-error" : undefined)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <p id="password-help" className="mt-1 text-xs text-zinc-500">
          Use no mínimo 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.
        </p>
        {hasPasswordInput ? (
          <div
            className="mt-2 space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3"
            aria-live="polite"
            data-testid="signup-password-strength"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">Força da senha</span>
              <span className="font-medium text-zinc-800">{passwordStrength.label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full rounded-full transition-all duration-200 ${passwordStrength.barClassName}`}
                style={{ width: `${Math.max((passwordScore / 4) * 100, 8)}%` }}
              />
            </div>
            <ul className="space-y-1 text-xs text-zinc-600">
              <li className={passwordCriteria.hasMinLength ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasMinLength ? "✓" : "-"} Mínimo de 8 caracteres
              </li>
              <li className={passwordCriteria.hasUppercase ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasUppercase ? "✓" : "-"} Pelo menos 1 letra maiúscula
              </li>
              <li className={passwordCriteria.hasNumber ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasNumber ? "✓" : "-"} Pelo menos 1 número
              </li>
              <li className={passwordCriteria.hasSpecial ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasSpecial ? "✓" : "-"} Pelo menos 1 caractere especial
              </li>
            </ul>
          </div>
        ) : null}
        {fieldErrors.password ? (
          <p id="password-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="password_confirmation" className="block text-sm font-medium text-zinc-800">
          Confirmar senha
        </label>
        <input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password_confirmation)}
          aria-describedby={fieldErrors.password_confirmation ? "password_confirmation-error" : undefined}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.password_confirmation ? (
          <p id="password_confirmation-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.password_confirmation}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="store_name" className="block text-sm font-medium text-zinc-800">
          Nome da loja
        </label>
        <input
          id="store_name"
          name="store_name"
          type="text"
          required
          value={values.store_name}
          onChange={(event) => setValues((current) => ({ ...current, store_name: event.target.value }))}
          aria-invalid={Boolean(fieldErrors.store_name)}
          aria-describedby={fieldErrors.store_name ? "store_name-error" : undefined}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.store_name ? (
          <p id="store_name-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.store_name}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="store_slug" className="block text-sm font-medium text-zinc-800">
          Slug da loja (URL pública)
        </label>
        <input
          id="store_slug"
          name="store_slug"
          type="text"
          required
          placeholder="ex.: minha-lanchonete"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={values.store_slug}
          onChange={(event) => setValues((current) => ({ ...current, store_slug: event.target.value }))}
          aria-invalid={Boolean(fieldErrors.store_slug)}
          aria-describedby={composeDescribedBy("store_slug-help", fieldErrors.store_slug ? "store_slug-error" : undefined)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.store_slug ? (
          <p id="store_slug-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.store_slug}
          </p>
        ) : null}
        <p id="store_slug-help" className="mt-1 text-xs text-zinc-500">
          Será usado na URL pública. Após a criação, não poderá ser alterado nesta fase.
        </p>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-800">
          Telefone da loja
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          value={values.phone}
          onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
          aria-invalid={Boolean(fieldErrors.phone)}
          aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        {fieldErrors.phone ? (
          <p id="phone-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>
      {showGlobalError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
