"use client";

import { resetPasswordAction, type ResetPasswordFormState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { evaluatePasswordCriteria } from "@/lib/auth/validation";
import { useActionState, useMemo, useState } from "react";

const initial: ResetPasswordFormState = {};

function composeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const validIds = ids.filter(Boolean) as string[];
  return validIds.length > 0 ? validIds.join(" ") : undefined;
}

/**
 * Indicador visual local; a regra definitiva de senha fica na Server Action.
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
 * Troca de senha acessada por sessão de recovery validada em /auth/confirm.
 */
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initial);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const fieldErrors = state?.fieldErrors ?? {};
  const passwordCriteria = useMemo(() => evaluatePasswordCriteria(password), [password]);
  const passwordScore = useMemo(() => Object.values(passwordCriteria).filter(Boolean).length, [passwordCriteria]);
  const passwordStrength = useMemo(() => resolvePasswordStrength(passwordScore), [passwordScore]);
  const hasPasswordInput = password.length > 0;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white/96 p-5 shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6"
    >
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Nova senha
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={composeDescribedBy("password-help", fieldErrors.password ? "password-error" : undefined)}
          data-testid="reset-password-input"
          toggleTestId="reset-password-toggle"
          className="cx-input"
          containerClassName="mt-1"
        />
        <p id="password-help" className="mt-1 text-xs text-zinc-500">
          Use no mínimo 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.
        </p>
        {hasPasswordInput ? (
          <div className="mt-2 space-y-2.5 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3" aria-live="polite">
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
                {passwordCriteria.hasMinLength ? "OK" : "-"} Mínimo de 8 caracteres
              </li>
              <li className={passwordCriteria.hasUppercase ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasUppercase ? "OK" : "-"} Pelo menos 1 letra maiúscula
              </li>
              <li className={passwordCriteria.hasNumber ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasNumber ? "OK" : "-"} Pelo menos 1 número
              </li>
              <li className={passwordCriteria.hasSpecial ? "text-emerald-700" : "text-zinc-500"}>
                {passwordCriteria.hasSpecial ? "OK" : "-"} Pelo menos 1 caractere especial
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
          Confirmar nova senha
        </label>
        <PasswordInput
          id="password_confirmation"
          name="password_confirmation"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password_confirmation)}
          aria-describedby={fieldErrors.password_confirmation ? "password_confirmation-error" : undefined}
          data-testid="reset-password-confirm-input"
          toggleTestId="reset-password-confirm-toggle"
          className="cx-input"
          containerClassName="mt-1"
        />
        {fieldErrors.password_confirmation ? (
          <p id="password_confirmation-error" className="mt-1 text-xs text-red-700">
            {fieldErrors.password_confirmation}
          </p>
        ) : null}
      </div>

      {state?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cx-btn-primary min-h-11 w-full px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Redefinindo..." : "Redefinir senha"}
      </button>
    </form>
  );
}
