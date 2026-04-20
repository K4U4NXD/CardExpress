import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeStoreSlug, validateStoreSlug } from "@/lib/auth/validation";

export type PendingSignupData = {
  full_name: string;
  store_name: string;
  store_slug: string;
  phone: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type StoreRow = {
  id: string;
  slug: string;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
};

export type EnsureAccountProvisionedResult =
  | {
      status: "completed";
      store: StoreRow;
    }
  | {
      status: "needs-slug";
      message: string;
      suggestedSlug: string;
    }
  | {
      status: "missing-pending-data";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUniqueViolation(error: PostgrestLikeError): boolean {
  return error.code === "23505" || (error.message?.toLowerCase().includes("duplicate") ?? false);
}

function mapPostgrestError(error: PostgrestLikeError): string {
  const message = (error.message ?? "").trim();
  const lower = message.toLowerCase();

  if (
    error.code === "42501" ||
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls")
  ) {
    return "Operacao bloqueada pelas regras de seguranca. Faça login novamente e tente outra vez.";
  }

  if (isUniqueViolation(error)) {
    return "Ja existe um registro com esse valor.";
  }

  return message || "Erro desconhecido ao falar com o banco de dados.";
}

function normalizePendingSignup(data: PendingSignupData): PendingSignupData {
  return {
    full_name: data.full_name.trim(),
    store_name: data.store_name.trim(),
    store_slug: normalizeStoreSlug(data.store_slug),
    phone: data.phone.trim(),
  };
}

export function extractPendingSignupData(user: User): PendingSignupData | null {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  const pendingRaw = metadata.pending_signup;

  if (!isRecord(pendingRaw)) {
    return null;
  }

  const normalized = normalizePendingSignup({
    full_name: asTrimmedString(pendingRaw.full_name) || asTrimmedString(metadata.full_name),
    store_name: asTrimmedString(pendingRaw.store_name),
    store_slug: asTrimmedString(pendingRaw.store_slug),
    phone: asTrimmedString(pendingRaw.phone),
  });

  if (!normalized.full_name || !normalized.store_name || !normalized.store_slug || !normalized.phone) {
    return null;
  }

  return normalized;
}

async function savePendingSignupData(supabase: SupabaseServerClient, user: User, pending: PendingSignupData) {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  const nextData: Record<string, unknown> = {
    ...metadata,
    full_name: pending.full_name,
    pending_signup: pending,
  };

  await supabase.auth.updateUser({ data: nextData });
}

function inferSlugConflict(error: PostgrestLikeError): boolean {
  const lower = (error.message ?? "").toLowerCase();

  return lower.includes("stores_slug_key") || lower.includes("(slug)") || lower.includes(" slug ");
}

function inferOwnerConflict(error: PostgrestLikeError): boolean {
  const lower = (error.message ?? "").toLowerCase();

  return lower.includes("stores_owner_id_key") || lower.includes("(owner_id)") || lower.includes(" owner_id ");
}

async function ensureStoreSettings(
  supabase: SupabaseServerClient,
  storeId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("store_settings").insert({ store_id: storeId });

  if (error && !isUniqueViolation(error)) {
    return {
      ok: false,
      message: `A loja foi criada, mas falhou ao registrar as configuracoes iniciais: ${mapPostgrestError(error)} Verifique a tabela public.store_settings e as politicas RLS.`,
    };
  }

  return { ok: true };
}

async function clearPendingSignupData(supabase: SupabaseServerClient, user: User) {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {};
  const nextData: Record<string, unknown> = { ...metadata };

  delete nextData.pending_signup;
  nextData.onboarding_completed_at = new Date().toISOString();

  await supabase.auth.updateUser({ data: nextData });
}

async function updateProfileName(supabase: SupabaseServerClient, userId: string, fullName: string) {
  if (!fullName) {
    return { ok: true as const };
  }

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userId);

  if (error) {
    return {
      ok: false as const,
      message: `Nao foi possivel atualizar o perfil: ${mapPostgrestError(error)}`,
    };
  }

  return { ok: true as const };
}

async function getCurrentStoreByOwner(
  supabase: SupabaseServerClient,
  ownerId: string
): Promise<{ store: StoreRow | null; errorMessage?: string }> {
  const { data, error } = await supabase.from("stores").select("id, slug").eq("owner_id", ownerId).maybeSingle();

  if (error) {
    return { store: null, errorMessage: mapPostgrestError(error) };
  }

  const store = data ? ({ id: data.id, slug: data.slug } as StoreRow) : null;
  return { store };
}

export async function ensureAccountProvisioned(input: {
  supabase: SupabaseServerClient;
  user: User;
  overrideStoreSlug?: string;
}): Promise<EnsureAccountProvisionedResult> {
  const { supabase, user, overrideStoreSlug } = input;

  const pending = extractPendingSignupData(user);
  const fullName = pending?.full_name ?? asTrimmedString((user.user_metadata as Record<string, unknown> | null)?.full_name);

  const profileResult = await updateProfileName(supabase, user.id, fullName);
  if (!profileResult.ok) {
    return {
      status: "error",
      message: profileResult.message,
    };
  }

  const currentStoreResult = await getCurrentStoreByOwner(supabase, user.id);
  if (currentStoreResult.errorMessage) {
    return {
      status: "error",
      message: `Nao foi possivel verificar a loja atual: ${currentStoreResult.errorMessage}`,
    };
  }

  if (currentStoreResult.store) {
    const settingsResult = await ensureStoreSettings(supabase, currentStoreResult.store.id);
    if (!settingsResult.ok) {
      return { status: "error", message: settingsResult.message };
    }

    await clearPendingSignupData(supabase, user);

    return {
      status: "completed",
      store: currentStoreResult.store,
    };
  }

  if (!pending) {
    return {
      status: "missing-pending-data",
      message: "Nao encontramos os dados pendentes do cadastro. Faca um novo cadastro para concluir a criacao da loja.",
    };
  }

  const desiredSlug = normalizeStoreSlug(overrideStoreSlug ? overrideStoreSlug : pending.store_slug);
  const slugValidationError = validateStoreSlug(desiredSlug);

  if (slugValidationError) {
    return {
      status: "needs-slug",
      message: slugValidationError,
      suggestedSlug: desiredSlug,
    };
  }

  if (desiredSlug !== pending.store_slug) {
    await savePendingSignupData(supabase, user, {
      ...pending,
      store_slug: desiredSlug,
    });
  }

  const { data: insertedStore, error: storeInsertError } = await supabase
    .from("stores")
    .insert({
      owner_id: user.id,
      name: pending.store_name,
      slug: desiredSlug,
      phone: pending.phone,
    })
    .select("id, slug")
    .single();

  if (storeInsertError) {
    if (isUniqueViolation(storeInsertError)) {
      if (inferOwnerConflict(storeInsertError)) {
        const ownerStoreResult = await getCurrentStoreByOwner(supabase, user.id);

        if (ownerStoreResult.errorMessage) {
          return {
            status: "error",
            message: `Nao foi possivel verificar a loja da conta apos conflito: ${ownerStoreResult.errorMessage}`,
          };
        }

        if (ownerStoreResult.store) {
          const settingsResult = await ensureStoreSettings(supabase, ownerStoreResult.store.id);
          if (!settingsResult.ok) {
            return { status: "error", message: settingsResult.message };
          }

          await clearPendingSignupData(supabase, user);

          return {
            status: "completed",
            store: ownerStoreResult.store,
          };
        }
      }

      if (inferSlugConflict(storeInsertError)) {
        return {
          status: "needs-slug",
          message: "Este slug (URL publica) ja esta em uso. Escolha outro para concluir o cadastro.",
          suggestedSlug: desiredSlug,
        };
      }
    }

    return {
      status: "error",
      message: `Nao foi possivel criar a loja: ${mapPostgrestError(storeInsertError)}`,
    };
  }

  const store = { id: insertedStore.id, slug: insertedStore.slug } satisfies StoreRow;

  const settingsResult = await ensureStoreSettings(supabase, store.id);
  if (!settingsResult.ok) {
    return { status: "error", message: settingsResult.message };
  }

  await clearPendingSignupData(supabase, user);

  return {
    status: "completed",
    store,
  };
}
