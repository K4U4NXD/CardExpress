"use client";

import { signupAction, type AuthFormState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
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

type SignupClientErrors = Partial<Record<"full_name" | "email" | "password" | "password_confirmation" | "store_name" | "store_slug" | "phone", string>>;

function composeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Feedback visual de senha durante o cadastro.
 * A validação definitiva continua em lib/auth/validation.ts e na Server Action.
 */
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

/**
 * Formulário inicial de cadastro do comerciante.
 * Dados da loja seguem para pending_signup e só viram loja após confirmação do e-mail.
 */
export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [clientErrors, setClientErrors] = useState<SignupClientErrors>({});
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
  const mergedErrors = {
    ...clientErrors,
    ...fieldErrors,
  };
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const showGlobalError = Boolean(state?.error) && !hasFieldErrors;

  function clearClientError(field: keyof SignupClientErrors) {
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    lastSubmittedSecretsRef.current = {
      password,
      passwordConfirmation,
    };

    const nextErrors: SignupClientErrors = {};

    if (!values.full_name.trim()) {
      nextErrors.full_name = "Informe seu nome.";
    }
    if (!values.email.trim()) {
      nextErrors.email = "Informe seu e-mail.";
    }
    if (!password) {
      nextErrors.password = "Informe sua senha.";
    }
    if (!passwordConfirmation) {
      nextErrors.password_confirmation = "Confirme sua senha.";
    }
    if (!values.store_name.trim()) {
      nextErrors.store_name = "Informe o nome da loja.";
    }
    if (!values.store_slug.trim()) {
      nextErrors.store_slug = "Informe o slug da loja.";
    }
    if (!values.phone.trim()) {
      nextErrors.phone = "Informe o telefone da loja.";
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
      className="cx-brand-panel space-y-3 p-4 sm:p-5"
      onSubmit={handleSubmit}
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
          onChange={(event) => {
            clearClientError("full_name");
            setValues((current) => ({ ...current, full_name: event.target.value }));
          }}
          aria-invalid={Boolean(mergedErrors.full_name)}
          aria-describedby={mergedErrors.full_name ? "full_name-error" : undefined}
          className={`cx-input mt-1 ${mergedErrors.full_name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {mergedErrors.full_name ? (
          <p id="full_name-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.full_name}
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
          onChange={(event) => {
            clearClientError("email");
            setValues((current) => ({ ...current, email: event.target.value }));
          }}
          aria-invalid={Boolean(mergedErrors.email)}
          aria-describedby={mergedErrors.email ? "email-error" : undefined}
          className={`cx-input mt-1 ${mergedErrors.email ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {mergedErrors.email ? (
          <p id="email-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Senha
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => {
            clearClientError("password");
            setPassword(event.target.value);
          }}
          aria-invalid={Boolean(mergedErrors.password)}
          aria-describedby={composeDescribedBy("password-help", mergedErrors.password ? "password-error" : undefined)}
          data-testid="signup-password-input"
          toggleTestId="signup-password-toggle"
          className={`cx-input ${mergedErrors.password ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          containerClassName="mt-1"
        />
        <p id="password-help" className="mt-1 text-xs text-zinc-500">
          Use no mínimo 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.
        </p>
        {hasPasswordInput ? (
          <div
            className="mt-2 space-y-2 rounded-lg border border-[#eadfd2] bg-[#fffaf2]/80 p-2.5"
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
        {mergedErrors.password ? (
          <p id="password-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.password}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="password_confirmation" className="block text-sm font-medium text-zinc-800">
          Confirmar senha
        </label>
        <PasswordInput
          id="password_confirmation"
          name="password_confirmation"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(event) => {
            clearClientError("password_confirmation");
            setPasswordConfirmation(event.target.value);
          }}
          aria-invalid={Boolean(mergedErrors.password_confirmation)}
          aria-describedby={mergedErrors.password_confirmation ? "password_confirmation-error" : undefined}
          data-testid="signup-password-confirm-input"
          toggleTestId="signup-password-confirm-toggle"
          className={`cx-input ${mergedErrors.password_confirmation ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          containerClassName="mt-1"
        />
        {mergedErrors.password_confirmation ? (
          <p id="password_confirmation-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.password_confirmation}
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
          onChange={(event) => {
            clearClientError("store_name");
            setValues((current) => ({ ...current, store_name: event.target.value }));
          }}
          aria-invalid={Boolean(mergedErrors.store_name)}
          aria-describedby={mergedErrors.store_name ? "store_name-error" : undefined}
          className={`cx-input mt-1 ${mergedErrors.store_name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {mergedErrors.store_name ? (
          <p id="store_name-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.store_name}
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
          onChange={(event) => {
            clearClientError("store_slug");
            setValues((current) => ({ ...current, store_slug: event.target.value }));
          }}
          aria-invalid={Boolean(mergedErrors.store_slug)}
          aria-describedby={composeDescribedBy("store_slug-help", mergedErrors.store_slug ? "store_slug-error" : undefined)}
          className={`cx-input mt-1 ${mergedErrors.store_slug ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {mergedErrors.store_slug ? (
          <p id="store_slug-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.store_slug}
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
          onChange={(event) => {
            clearClientError("phone");
            setValues((current) => ({ ...current, phone: event.target.value }));
          }}
          aria-invalid={Boolean(mergedErrors.phone)}
          aria-describedby={mergedErrors.phone ? "phone-error" : undefined}
          className={`cx-input mt-1 ${mergedErrors.phone ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
        {mergedErrors.phone ? (
          <p id="phone-error" className="mt-1 text-xs text-red-700">
            {mergedErrors.phone}
          </p>
        ) : null}
      </div>
      {showGlobalError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="cx-btn-primary min-h-11 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
