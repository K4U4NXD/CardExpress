"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeStoreSlug, validateStoreSlug } from "@/lib/auth/validation";
import { safeNextPath } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";

export type AuthFormState = {
  error?: string;
  success?: string;
};

function mapAuthError(message: string): string {
  const m = message.trim();
  if (m.includes("Invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (m.toLowerCase().includes("invalid email")) {
    return "E-mail inválido. Verifique o endereço digitado.";
  }
  if (m.toLowerCase().includes("password") && m.toLowerCase().includes("least")) {
    return "A senha não atende aos requisitos mínimos do provedor de login.";
  }
  return m;
}

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return err.code === "23505" || (err.message?.toLowerCase().includes("duplicate") ?? false);
}

/** Mensagens claras em português para erros comuns do PostgREST / Postgres. */
function mapPostgrestError(err: { message?: string; code?: string }): string {
  const m = (err.message ?? "").trim();
  const lower = m.toLowerCase();

  if (m.includes("Could not find") && m.includes("column")) {
    return "Coluna ou tabela inesperada no banco. Confira se o schema no Supabase está alinhado com a versão do aplicativo.";
  }
  if (
    err.code === "42501" ||
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls")
  ) {
    return "Operação bloqueada pelas regras de segurança (RLS). Ajuste as políticas no Supabase ou confira se está autenticado.";
  }
  if (isUniqueViolation(err)) {
    return "Já existe um registro com esse valor (por exemplo, slug da loja ou e-mail).";
  }

  return m || "Erro desconhecido ao falar com o banco de dados.";
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

  redirect(next);
}

/**
 * Cadastro: Auth → atualização de profile (apenas full_name) → store (telefone da loja em stores.phone) → store_settings.
 * Com "Confirm email" ativo no Supabase, session pode vir null — a loja só é criada quando houver sessão.
 */
export async function signupAction(
  _prev: AuthFormState | null,
  formData: FormData
): Promise<AuthFormState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const store_name = String(formData.get("store_name") ?? "").trim();
  const store_slug = normalizeStoreSlug(String(formData.get("store_slug") ?? ""));
  const store_phone = String(formData.get("phone") ?? "").trim();

  if (!full_name || !email || !password || !store_name || !store_slug || !store_phone) {
    return { error: "Preencha todos os campos obrigatórios." };
  }

  const slugErr = validateStoreSlug(store_slug);
  if (slugErr) return { error: slugErr };

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: signData, error: signError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
    },
  });

  if (signError) {
    if (
      signError.message.includes("already registered") ||
      signError.message.toLowerCase().includes("user already registered")
    ) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: mapAuthError(signError.message) };
  }

  const user = signData.user;
  if (!user) {
    return { error: "Não foi possível criar o usuário. Tente novamente." };
  }

  if (!signData.session) {
    return {
      success:
        "Conta criada. Confirme o link enviado por e-mail; depois faça login para concluir. " +
        "Se o e-mail já estiver confirmado no projeto, desative a confirmação em Authentication → Providers → Email no Supabase para criar a loja imediatamente.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name })
    .eq("id", user.id);

  if (profileError) {
    return {
      error: `Sua conta foi criada, mas não conseguimos salvar o nome no perfil: ${mapPostgrestError(profileError)} Você pode tentar editar depois em configurações, se disponível.`,
    };
  }

  const { data: storeRow, error: storeError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name: store_name,
      slug: store_slug,
      phone: store_phone,
    })
    .select("id")
    .single();

  if (storeError) {
    const detail = isUniqueViolation(storeError)
      ? "Este slug (URL pública) já está em uso. Escolha outro ou recupere o acesso à conta que já o usa."
      : mapPostgrestError(storeError);
    return {
      error: `Não foi possível criar a loja: ${detail} Sua conta de e-mail já existe: use “Esqueci minha senha” no login, se precisar.`,
    };
  }

  const { error: settingsError } = await supabase
    .from("store_settings")
    .insert({ store_id: storeRow.id });

  if (settingsError) {
    return {
      error: `A loja foi criada, mas falhou ao registrar as configurações iniciais: ${mapPostgrestError(settingsError)} Verifique a tabela public.store_settings e as políticas RLS.`,
    };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
