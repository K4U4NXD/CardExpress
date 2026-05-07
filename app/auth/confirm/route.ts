import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { ensureAccountProvisioned } from "@/lib/auth/onboarding";
import { safeNextPath } from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function toEmailOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) {
    return null;
  }

  if (!ALLOWED_EMAIL_OTP_TYPES.includes(raw as EmailOtpType)) {
    return null;
  }

  return raw as EmailOtpType;
}

function appendSearchParam(path: string, key: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

function redirectToPath(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectToLoginWithError(request: NextRequest, message: string) {
  return redirectToPath(request, appendSearchParam("/login", "erro", message));
}

function redirectToPasswordRecoveryWithError(request: NextRequest, message: string) {
  return redirectToPath(request, appendSearchParam("/recuperar-senha", "erro", message));
}

function mapConfirmExchangeError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("expired") || lower.includes("otp expired") || lower.includes("token has expired")) {
    return "Este link de confirmação expirou. Solicite um novo cadastro e tente novamente.";
  }

  if (
    lower.includes("invalid") ||
    lower.includes("otp") ||
    lower.includes("token") ||
    lower.includes("code verifier") ||
    lower.includes("auth code")
  ) {
    return "Link de confirmação inválido. Solicite um novo cadastro e tente novamente.";
  }

  return "Não foi possível confirmar o e-mail agora. Tente novamente.";
}

function mapRecoveryExchangeError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("expired") || lower.includes("otp expired") || lower.includes("token has expired")) {
    return "Este link de recuperação expirou. Solicite uma nova recuperação de senha.";
  }

  if (
    lower.includes("invalid") ||
    lower.includes("otp") ||
    lower.includes("token") ||
    lower.includes("code verifier") ||
    lower.includes("auth code")
  ) {
    return "Link de recuperação inválido. Solicite uma nova recuperação de senha.";
  }

  return "Não foi possível validar a recuperação de senha agora. Tente novamente.";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = toEmailOtpType(url.searchParams.get("type"));
  const requestedNext = safeNextPath(url.searchParams.get("next") ?? "/dashboard");
  const dashboardDestination = requestedNext.startsWith("/dashboard") ? requestedNext : "/dashboard";
  const successDestination = appendSearchParam(dashboardDestination, "signup", "email-confirmed");
  const isRecoveryFlow = otpType === "recovery" || requestedNext === "/redefinir-senha";

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      if (isRecoveryFlow) {
        return redirectToPasswordRecoveryWithError(request, mapRecoveryExchangeError(exchangeError.message));
      }

      return redirectToLoginWithError(request, mapConfirmExchangeError(exchangeError.message));
    }
  } else if (tokenHash) {
    if (!otpType) {
      if (isRecoveryFlow) {
        return redirectToPasswordRecoveryWithError(
          request,
          "Link de recuperação inválido. Solicite uma nova recuperação de senha."
        );
      }

      return redirectToLoginWithError(request, "Link de confirmação inválido. Solicite um novo cadastro.");
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (verifyError) {
      if (isRecoveryFlow) {
        return redirectToPasswordRecoveryWithError(request, mapRecoveryExchangeError(verifyError.message));
      }

      return redirectToLoginWithError(request, mapConfirmExchangeError(verifyError.message));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isRecoveryFlow) {
      return redirectToPasswordRecoveryWithError(
        request,
        "Link inválido ou expirado. Solicite uma nova recuperação de senha."
      );
    }

    return redirectToLoginWithError(
      request,
      "Nao foi possivel concluir a confirmação. Faça login para continuar."
    );
  }

  if (isRecoveryFlow) {
    return redirectToPath(request, "/redefinir-senha");
  }

  const provisionResult = await ensureAccountProvisioned({ supabase, user });

  if (provisionResult.status === "completed") {
    return redirectToPath(request, successDestination);
  }

  if (provisionResult.status === "needs-slug") {
    const slugPath = appendSearchParam("/dashboard/finalizar-cadastro", "motivo", "slug-indisponivel");
    const pathWithSlug = appendSearchParam(slugPath, "slug", provisionResult.suggestedSlug);
    return redirectToPath(request, pathWithSlug);
  }

  if (provisionResult.status === "missing-pending-data") {
    return redirectToPath(request, appendSearchParam("/dashboard/finalizar-cadastro", "motivo", "dados-pendentes"));
  }

  return redirectToLoginWithError(request, provisionResult.message);
}
