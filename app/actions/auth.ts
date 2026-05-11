"use server";

import { ensureAccountProvisioned } from "@/lib/auth/onboarding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  normalizeStoreSlug,
  validatePasswordRecoveryInput,
  validateResetPasswordInput,
  validateSignupInput,
  validateStoreSlug,
  type SignupValidationFieldErrors,
  type SignupValidationValues,
} from "@/lib/auth/validation";
import { buildAbsoluteUrlFromOrigin } from "@/lib/public-store-url";
import { safeNextPath } from "@/lib/auth/redirect";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type AuthFormValues = SignupValidationValues;
export type AuthFieldErrors = SignupValidationFieldErrors;

export type AuthFormState = {
  error?: string;
  success?: string;
  values?: AuthFormValues;
  fieldErrors?: AuthFieldErrors;
};

export type CompleteSignupStoreState = {
  error?: string;
  value?: string;
  fieldErrors?: {
    store_slug?: string;
  };
};

export type PasswordRecoveryFormState = {
  error?: string;
  success?: string;
  values?: {
    email: string;
  };
  fieldErrors?: {
    email?: string;
  };
};

export type ResetPasswordFormState = {
  error?: string;
  fieldErrors?: {
    password?: string;
    password_confirmation?: string;
  };
};

const EMPTY_SIGNUP_VALUES: AuthFormValues = {
  full_name: "",
  email: "",
  store_name: "",
  store_slug: "",
  phone: "",
};

const PASSWORD_RECOVERY_SUCCESS_MESSAGE =
  "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";

function buildSignupState(input: {
  error?: string;
  success?: string;
  values?: AuthFormValues;
  fieldErrors?: AuthFieldErrors;
}): AuthFormState {
  const nextState: AuthFormState = {};

  if (input.error) {
    nextState.error = input.error;
  }
  if (input.success) {
    nextState.success = input.success;
  }
  if (input.values) {
    nextState.values = {
      ...EMPTY_SIGNUP_VALUES,
      ...input.values,
    };
  }
  if (input.fieldErrors && Object.keys(input.fieldErrors).length > 0) {
    nextState.fieldErrors = { ...input.fieldErrors };
  }

  return nextState;
}

/**
 * Converte mensagens técnicas do Supabase Auth em feedback seguro para UI.
 * Evita expor detalhes internos do provedor e mantém as mensagens consistentes.
 */
function mapAuthError(message: string): string {
  const m = message.trim();
  const lower = m.toLowerCase();

  if (lower.includes("email not confirmed") || lower.includes("email_not_confirmed")) {
    return "Confirme seu e-mail para ativar sua conta e concluir o cadastro da loja.";
  }

  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (lower.includes("invalid email")) {
    return "E-mail inválido. Verifique o endereço digitado.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "A senha não atende aos requisitos mínimos.";
  }
  return "Não foi possível concluir a solicitação agora. Tente novamente.";
}

/**
 * Mapeia erros do cadastro para campos específicos quando possível.
 * Isso permite destacar e-mail/senha sem perder uma mensagem geral para casos operacionais.
 */
function mapSignupAuthError(message: string): Pick<AuthFormState, "error" | "fieldErrors"> {
  const lower = message.trim().toLowerCase();

  if (
    lower.includes("email rate limit exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return {
      error:
        "Limite de envios de e-mail atingido no momento. Aguarde alguns minutos e tente novamente.",
    };
  }

  if (lower.includes("already registered") || lower.includes("user already registered")) {
    return { fieldErrors: { email: "Este e-mail já está cadastrado." } };
  }
  if (lower.includes("invalid email")) {
    return { fieldErrors: { email: "Digite um e-mail válido." } };
  }
  if (lower.includes("password")) {
    return {
      fieldErrors: {
        password:
          "A senha deve ter no mínimo 8 caracteres, incluindo 1 letra maiúscula, 1 número e 1 caractere especial.",
      },
    };
  }

  return { error: mapAuthError(message) };
}

function mapResetPasswordAuthError(message: string): string {
  const lower = message.trim().toLowerCase();

  if (
    lower.includes("new password should be different") ||
    lower.includes("different from the old password")
  ) {
    return "A nova senha deve ser diferente da senha atual.";
  }

  return "Não foi possível concluir a solicitação agora. Tente novamente.";
}

/**
 * Resolve a origem usada nos links de e-mail.
 * Em produção prioriza headers do proxy; localmente cai para variáveis de ambiente ou localhost.
 */
async function resolveAppOrigin(): Promise<string> {
  const requestHeaders = await headers();

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (envOrigin) {
    return envOrigin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export async function loginAction(
  _prev: AuthFormState | null,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email_confirmed_at) {
    // Login sem e-mail confirmado não deve manter sessão ativa nem liberar onboarding da loja.
    await supabase.auth.signOut();
    return {
      error: "Confirme seu e-mail para ativar sua conta e concluir o cadastro da loja.",
    };
  }

  redirect(next);
}

export async function requestPasswordRecoveryAction(
  _prev: PasswordRecoveryFormState | null,
  formData: FormData
): Promise<PasswordRecoveryFormState> {
  const validation = validatePasswordRecoveryInput(String(formData.get("email") ?? ""));

  if (validation.hasErrors) {
    return {
      values: validation.values,
      fieldErrors: validation.fieldErrors,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const appOrigin = await resolveAppOrigin();
    const redirectTo = buildAbsoluteUrlFromOrigin("/auth/confirm?next=/redefinir-senha", appOrigin);

    await supabase.auth.resetPasswordForEmail(validation.values.email, {
      redirectTo,
    });
  } catch {
    // Resposta neutra: não revela se o e-mail existe nem detalhes de falha do provedor.
    return {
      values: validation.values,
      success: PASSWORD_RECOVERY_SUCCESS_MESSAGE,
    };
  }

  return {
    values: validation.values,
    success: PASSWORD_RECOVERY_SUCCESS_MESSAGE,
  };
}

export async function resetPasswordAction(
  _prev: ResetPasswordFormState | null,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");
  const validation = validateResetPasswordInput(password, passwordConfirmation);

  if (validation.hasErrors) {
    return {
      fieldErrors: validation.fieldErrors,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Link inválido ou expirado. Solicite uma nova recuperação de senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: mapResetPasswordAuthError(error.message),
    };
  }

  // A sessão de recovery existe apenas para trocar a senha; depois disso o usuário entra pelo fluxo normal.
  await supabase.auth.signOut();
  redirect(
    `/login?sucesso=${encodeURIComponent("Senha redefinida com sucesso. Faça login com sua nova senha.")}`
  );
}

/**
 * Inicia o cadastro salvando os dados da loja em user_metadata.pending_signup.
 * A loja só é provisionada depois da confirmação de e-mail, quando há sessão autenticada.
 */
export async function signupAction(
  _prev: AuthFormState | null,
  formData: FormData
): Promise<AuthFormState> {
  const full_name = String(formData.get("full_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const password_confirmation = String(formData.get("password_confirmation") ?? "");
  const store_name = String(formData.get("store_name") ?? "");
  const store_slug = String(formData.get("store_slug") ?? "");
  const store_phone = String(formData.get("phone") ?? "");

  const validation = validateSignupInput({
    full_name,
    email,
    password,
    password_confirmation,
    store_name,
    store_slug,
    phone: store_phone,
  });

  if (validation.hasErrors) {
    return buildSignupState({
      values: validation.values,
      fieldErrors: validation.fieldErrors,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const appOrigin = await resolveAppOrigin();
    const emailRedirectTo = buildAbsoluteUrlFromOrigin("/auth/confirm?next=/dashboard", appOrigin);

    const { data: signData, error: signError } = await supabase.auth.signUp({
      email: validation.values.email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: validation.values.full_name,
          pending_signup: {
            full_name: validation.values.full_name,
            store_name: validation.values.store_name,
            store_slug: validation.values.store_slug,
            phone: validation.values.phone,
          },
        },
      },
    });

    if (signError) {
      return buildSignupState({
        ...mapSignupAuthError(signError.message),
        values: validation.values,
      });
    }

    const user = signData.user;
    if (!user) {
      return buildSignupState({
        error: "Não foi possível criar o usuário. Tente novamente.",
        values: validation.values,
      });
    }

    if (signData.session) {
      // Mesmo que o Supabase retorne sessão no signup, aguardamos confirmação de e-mail para criar a loja.
      await supabase.auth.signOut();
    }
  } catch {
    return buildSignupState({
      error: "Não foi possível concluir o cadastro agora. Tente novamente.",
      values: validation.values,
    });
  }

  redirect(`/cadastro/confirmar-email?email=${encodeURIComponent(validation.values.email)}`);
}

export async function completeSignupStoreAction(
  _prev: CompleteSignupStoreState | null,
  formData: FormData
): Promise<CompleteSignupStoreState> {
  const rawSlug = String(formData.get("store_slug") ?? "");
  const normalizedSlug = normalizeStoreSlug(rawSlug);

  if (!normalizedSlug) {
    return {
      value: rawSlug,
      fieldErrors: {
        store_slug: "Informe o slug da loja.",
      },
    };
  }

  const slugValidationError = validateStoreSlug(normalizedSlug);
  if (slugValidationError) {
    return {
      value: rawSlug,
      fieldErrors: {
        store_slug: slugValidationError,
      },
    };
  }

  let shouldRedirectWithSuccess = false;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        error: "Sua sessão expirou. Faça login novamente para concluir o cadastro.",
        value: rawSlug,
      };
    }

    // Usado quando o slug reservado no signup ficou indisponível antes da confirmação.
    const provisionResult = await ensureAccountProvisioned({
      supabase,
      user,
      overrideStoreSlug: normalizedSlug,
    });

    switch (provisionResult.status) {
      case "completed": {
        shouldRedirectWithSuccess = true;
        break;
      }
      case "needs-slug": {
        return {
          value: normalizedSlug,
          fieldErrors: {
            store_slug: provisionResult.message,
          },
        };
      }
      case "missing-pending-data":
      case "error": {
        return {
          value: normalizedSlug,
          error: provisionResult.message,
        };
      }
    }
  } catch {
    return {
      value: rawSlug,
      error: "Não foi possível concluir o cadastro agora. Tente novamente.",
    };
  }

  if (shouldRedirectWithSuccess) {
    redirect("/dashboard?signup=email-confirmed");
  }

  return {
    value: normalizedSlug,
    error: "Não foi possível concluir o cadastro agora. Tente novamente.",
  };
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
