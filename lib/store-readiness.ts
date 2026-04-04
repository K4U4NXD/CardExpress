import { validateStoreSlug } from "@/lib/auth/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type StoreReadinessInput = {
  storeId: string;
  storeName: string | null;
  storePhone: string | null;
  storeSlug: string | null;
};

export type StoreReadinessResult = {
  isReady: boolean;
  pendingItems: string[];
  activeCategories: number;
  activeAvailableProducts: number;
};

export async function calculateStoreReadiness(
  supabase: ServerSupabaseClient,
  input: StoreReadinessInput
): Promise<StoreReadinessResult> {
  const [{ count: activeCategoryCount, error: categoriesError }, { count: activeProductCount, error: productsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("store_id", input.storeId)
        .eq("is_active", true),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", input.storeId)
        .eq("is_active", true)
        .eq("is_available", true),
    ]);

  if (categoriesError) {
    throw categoriesError;
  }

  if (productsError) {
    throw productsError;
  }

  const pendingItems: string[] = [];
  const storeName = (input.storeName ?? "").trim();
  const storePhone = (input.storePhone ?? "").trim();
  const storeSlug = (input.storeSlug ?? "").trim().toLowerCase();
  const slugError = storeSlug ? validateStoreSlug(storeSlug) : "slug-ausente";

  if (!storeName) {
    pendingItems.push("Informe o nome da loja.");
  }

  if (!storePhone) {
    pendingItems.push("Informe o telefone da loja.");
  }

  if (slugError) {
    pendingItems.push("Defina um slug público válido para a loja.");
  }

  const activeCategories = activeCategoryCount ?? 0;
  const activeAvailableProducts = activeProductCount ?? 0;

  if (activeCategories < 1) {
    pendingItems.push("Cadastre ao menos uma categoria ativa.");
  }

  if (activeAvailableProducts < 1) {
    pendingItems.push("Cadastre ao menos um produto ativo e disponível.");
  }

  return {
    isReady: pendingItems.length === 0,
    pendingItems,
    activeCategories,
    activeAvailableProducts,
  };
}