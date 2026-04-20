"use server";

import { revalidatePath } from "next/cache";

import { getUserStore } from "@/lib/auth/store";
import { formatPostgrestError } from "@/lib/db-errors";
import { calculateStoreReadiness, type StoreReadinessResult } from "@/lib/store-readiness";
import {
  validateStoreSettingsInput,
  type StoreSettingsFieldErrors,
} from "@/lib/validation/store-settings";

export type StoreSettingsFormValues = {
  name: string;
  phone: string;
  logo_url: string;
  accepts_orders: boolean;
  public_message: string;
};

export type StoreSettingsActionState = {
  error?: string;
  success?: string;
  fieldErrors?: StoreSettingsFieldErrors;
  values?: StoreSettingsFormValues;
  readiness?: StoreReadinessResult;
};

export type StoreLogoUploadActionResult = {
  error?: string;
  success?: string;
  logoUrl?: string;
};

function toFormValues(values: {
  name: string;
  phone: string;
  logoUrl: string | null;
  acceptsOrders: boolean;
  publicMessage: string | null;
}): StoreSettingsFormValues {
  return {
    name: values.name,
    phone: values.phone,
    logo_url: values.logoUrl ?? "",
    accepts_orders: values.acceptsOrders,
    public_message: values.publicMessage ?? "",
  };
}

function mapUnknownError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return formatPostgrestError(error as { message?: string; code?: string; details?: string });
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}

function normalizeUploadedLogoUrl(rawLogoUrl: string): { value: string | null; error?: string } {
  const normalized = rawLogoUrl.trim();

  if (!normalized) {
    return { value: null, error: "A URL da logo enviada está vazia." };
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: null, error: "A URL da logo precisa iniciar com http:// ou https://." };
    }
  } catch {
    return { value: null, error: "A URL da logo enviada é inválida." };
  }

  return { value: normalized };
}

export async function saveStoreUploadedLogoAction(rawLogoUrl: string): Promise<StoreLogoUploadActionResult> {
  const logoNormalization = normalizeUploadedLogoUrl(rawLogoUrl);

  if (!logoNormalization.value) {
    return { error: logoNormalization.error ?? "Não foi possível validar a URL da logo enviada." };
  }

  const { supabase, store } = await getUserStore();

  if (!store) {
    return { error: "Nenhuma loja vinculada à sua conta." };
  }

  const { error } = await supabase
    .from("stores")
    .update({
      logo_url: logoNormalization.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (error) {
    return { error: formatPostgrestError(error) };
  }

  revalidatePath("/dashboard/configuracoes");
  revalidatePath(`/${store.slug}`);
  revalidatePath(`/${store.slug}/checkout`);
  revalidatePath(`/${store.slug}/painel`);
  revalidatePath(`/${store.slug}/painel/tv`);

  return {
    success: "Logo da loja salva com sucesso.",
    logoUrl: logoNormalization.value,
  };
}

export async function saveStoreSettingsAction(
  _prev: StoreSettingsActionState | null,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const rawName = String(formData.get("name") ?? "");
  const rawPhone = String(formData.get("phone") ?? "");
  const rawLogoUrl = String(formData.get("logo_url") ?? "");
  const rawPublicMessage = String(formData.get("public_message") ?? "");
  const rawAcceptsOrders = formData.get("accepts_orders") === "on";

  const validation = validateStoreSettingsInput({
    name: rawName,
    phone: rawPhone,
    logoUrl: rawLogoUrl,
    publicMessage: rawPublicMessage,
    acceptsOrders: rawAcceptsOrders,
  });

  if (validation.hasErrors) {
    return {
      fieldErrors: validation.fieldErrors,
      values: toFormValues(validation.values),
    };
  }

  const { supabase, store } = await getUserStore();

  if (!store) {
    return {
      error: "Nenhuma loja vinculada à sua conta.",
      values: toFormValues(validation.values),
    };
  }

  let readiness: StoreReadinessResult;

  try {
    readiness = await calculateStoreReadiness(supabase, {
      storeId: store.id,
      storeName: validation.values.name,
      storePhone: validation.values.phone,
      storeSlug: store.slug,
    });
  } catch (error) {
    return {
      error: mapUnknownError(error),
      values: toFormValues(validation.values),
    };
  }

  const nextAcceptsOrders = readiness.isReady ? validation.values.acceptsOrders : false;
  const fieldErrors: StoreSettingsFieldErrors = {};

  if (!readiness.isReady && validation.values.acceptsOrders) {
    fieldErrors.accepts_orders = "A loja ainda não está pronta para operar. Resolva as pendências para ativar pedidos.";
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      name: validation.values.name,
      phone: validation.values.phone,
      logo_url: validation.values.logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (storeError) {
    return {
      error: formatPostgrestError(storeError),
      fieldErrors,
      values: toFormValues({ ...validation.values, acceptsOrders: nextAcceptsOrders }),
      readiness,
    };
  }

  const { error: settingsError } = await supabase.from("store_settings").upsert(
    {
      store_id: store.id,
      accepts_orders: nextAcceptsOrders,
      public_message: validation.values.publicMessage,
    },
    { onConflict: "store_id" }
  );

  if (settingsError) {
    return {
      error: formatPostgrestError(settingsError),
      fieldErrors,
      values: toFormValues({ ...validation.values, acceptsOrders: nextAcceptsOrders }),
      readiness,
    };
  }

  revalidatePath("/dashboard/configuracoes");
  revalidatePath(`/${store.slug}`);
  revalidatePath(`/${store.slug}/checkout`);
  revalidatePath(`/${store.slug}/painel`);
  revalidatePath(`/${store.slug}/painel/tv`);

  return {
    success:
      !readiness.isReady && validation.values.acceptsOrders
        ? "Configurações salvas. A loja continua sem aceitar pedidos até ficar pronta para operar."
        : "Configurações salvas com sucesso.",
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    values: toFormValues({ ...validation.values, acceptsOrders: nextAcceptsOrders }),
    readiness,
  };
}