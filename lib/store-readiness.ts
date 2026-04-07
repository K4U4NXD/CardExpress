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
  const { data: activeCategoryRows, error: categoriesError } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", input.storeId)
    .eq("is_active", true);

  if (categoriesError) {
    throw categoriesError;
  }

  const activeCategoryIds = (activeCategoryRows ?? []).map((row) => row.id);
  const activeCategories = activeCategoryIds.length;

  let activeAvailableProducts = 0;

  if (activeCategoryIds.length > 0) {
    const { count: readyProductCount, error: productsError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", input.storeId)
      .in("category_id", activeCategoryIds)
      .eq("is_active", true)
      .eq("is_available", true)
      .or("track_stock.eq.false,stock_quantity.gt.0");

    if (productsError) {
      throw productsError;
    }

    activeAvailableProducts = readyProductCount ?? 0;
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

  if (activeCategories < 1) {
    pendingItems.push("Cadastre ao menos uma categoria ativa.");
  }

  if (activeAvailableProducts < 1) {
    pendingItems.push("Cadastre ao menos um produto apto ao cardápio público.");
  }

  return {
    isReady: pendingItems.length === 0,
    pendingItems,
    activeCategories,
    activeAvailableProducts,
  };
}