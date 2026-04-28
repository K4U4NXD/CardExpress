"use server";

import { getUserStore } from "@/lib/auth/store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/db-errors";
import { parseMoneyInput } from "@/lib/validation/price";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PATH = "/dashboard/produtos";
const PRODUCT_HISTORY_ARCHIVED_NOTICE = "excluido-com-historico";

function revalidateStoreViews(storeSlug: string) {
  revalidatePath(PATH);
  revalidatePath(`/${storeSlug}`);
}

function buildFlashToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type ProductFormState = {
  error?: string;
};

export type BulkProductsActionResult = {
  ok: boolean;
  requested: number;
  updated: number;
  deleted: number;
  archived: number;
  skipped: number;
  failed: number;
  message: string;
  reasons: string[];
};

function redirectWithNotice(notice: string) {
  redirect(`${PATH}?aviso=${encodeURIComponent(notice)}&flash=${buildFlashToken()}`);
}

function emptyBulkProductsResult(requested: number, message: string): BulkProductsActionResult {
  return {
    ok: false,
    requested,
    updated: 0,
    deleted: 0,
    archived: 0,
    skipped: requested,
    failed: 0,
    message,
    reasons: [message],
  };
}

function normalizeBulkIds(ids: string[]) {
  const requested = Array.isArray(ids) ? ids.length : 0;
  const cleanIds = Array.isArray(ids)
    ? ids.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];
  const uniqueIds = Array.from(new Set(cleanIds));
  const invalidCount = requested - cleanIds.length;
  const duplicateCount = cleanIds.length - uniqueIds.length;

  return { requested, uniqueIds, invalidCount, duplicateCount };
}

function buildBulkProductsMessage(input: {
  action: "activate" | "deactivate" | "pause" | "enable" | "delete";
  requested: number;
  updated: number;
  deleted: number;
  archived: number;
  skipped: number;
  failed: number;
  reasons: string[];
}) {
  const changed = input.updated + input.deleted + input.archived;
  const ignored = input.skipped + input.failed;

  if (changed === 0) {
    return "Nenhum produto foi alterado.";
  }

  const ignoredText = ignored > 0 ? ` ${ignored} ${ignored === 1 ? "item ignorado" : "itens ignorados"}.` : "";

  if (input.action === "delete") {
    const parts: string[] = [];
    if (input.deleted > 0) {
      parts.push(`${input.deleted} ${input.deleted === 1 ? "produto excluído" : "produtos excluídos"}`);
    }
    if (input.archived > 0) {
      parts.push(`${input.archived} ${input.archived === 1 ? "produto arquivado" : "produtos arquivados"}`);
    }

    return `${parts.join(" e ")}.${ignoredText}`;
  }

  const actionLabel =
    input.action === "activate"
      ? input.updated === 1
        ? "ativado"
        : "ativados"
      : input.action === "deactivate"
        ? input.updated === 1
          ? "desativado"
          : "desativados"
        : input.action === "enable"
          ? input.updated === 1
            ? "disponibilizado"
            : "disponibilizados"
          : input.updated === 1
            ? "pausado"
            : "pausados";

  return `${input.updated} ${input.updated === 1 ? "produto" : "produtos"} ${actionLabel}.${ignoredText}`;
}

async function fetchProductsForBulk(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  productIds: string[]
) {
  return supabase
    .from("products")
    .select("id, is_active, is_available, archived_at")
    .eq("store_id", storeId)
    .in("id", productIds);
}

function isProductHistoryDeleteError(err: { code?: string; message?: string; details?: string }): boolean {
  if (err.code !== "23503") {
    return false;
  }

  const joined = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  return joined.includes("checkout_session_items_product_id_fkey") || joined.includes("order_items_product_id_fkey");
}

async function archiveProductForHistory(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  productId: string
) {
  const archivedAt = new Date().toISOString();

  const { error: unlinkError } = await supabase
    .from("product_categories")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (unlinkError) {
    return { error: unlinkError };
  }

  return supabase
    .from("products")
    .update({
      category_id: null,
      archived_at: archivedAt,
      is_active: false,
      is_available: false,
      track_stock: false,
      stock_quantity: 0,
      updated_at: archivedAt,
    })
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("archived_at", null);
}

function normalizeProductImageUrl(rawImageUrl: string): { value: string | null; error?: string } {
  const normalized = rawImageUrl.trim();

  if (!normalized) {
    return { value: null };
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: null, error: "A URL da imagem precisa iniciar com http:// ou https://." };
    }
  } catch {
    return { value: null, error: "A URL da imagem do produto é inválida." };
  }

  return { value: normalized };
}

function resolveStockAndAvailability(formData: FormData):
  | { ok: true; track_stock: boolean; stock_quantity: number; is_available: boolean }
  | { ok: false; message: string } {
  const track_stock = formData.get("track_stock") === "on";
  const stockRaw = String(formData.get("stock_quantity") ?? "").trim();

  if (track_stock) {
    if (stockRaw === "") {
      return { ok: false, message: "Informe a quantidade em estoque." };
    }
    const n = Number(stockRaw);
    if (!Number.isInteger(n) || n < 0) {
      return {
        ok: false,
        message: "A quantidade em estoque deve ser um número inteiro maior ou igual a zero.",
      };
    }
    return {
      ok: true,
      track_stock: true,
      stock_quantity: n,
      is_available: true,
    };
  }

  const is_available = formData.get("is_available") === "on";
  return {
    ok: true,
    track_stock: false,
    stock_quantity: 0,
    is_available,
  };
}

async function productOwnedOrNull(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  productId: string
) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, sort_order, is_active, category_id, name, description, price, image_url, track_stock, stock_quantity, is_available, archived_at"
    )
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/** Categoria da loja que pode ser usada no produto: ativa ou a mesma já vinculada (edição). */
async function assertCategoryAllowedForProduct(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  categoryId: string,
  previousCategoryId?: string | null
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, is_active")
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return { ok: false as const, message: "Categoria não encontrada nesta loja." };
  if (data.is_active || data.id === previousCategoryId) {
    return { ok: true as const };
  }
  return { ok: false as const, message: "Escolha uma categoria ativa." };
}

function parseAdditionalCategoryIds(formData: FormData, primaryCategoryId: string) {
  const rawIds = formData
    .getAll("additional_category_ids")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set([primaryCategoryId, ...rawIds]));
}

async function assertCategoriesAllowedForProduct(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  categoryIds: string[],
  previousCategoryIds: string[] = []
) {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.map((id) => String(id ?? "").trim()).filter(Boolean)));

  if (uniqueCategoryIds.length === 0) {
    return { ok: false as const, message: "Selecione ao menos uma categoria." };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id, is_active")
    .eq("store_id", storeId)
    .in("id", uniqueCategoryIds);

  if (error) {
    return { ok: false as const, message: formatPostgrestError(error) };
  }

  const previous = new Set(previousCategoryIds);
  const rows = data ?? [];
  const foundIds = new Set(rows.map((row) => row.id));
  const missing = uniqueCategoryIds.some((id) => !foundIds.has(id));
  const inactiveNew = rows.some((row) => !row.is_active && !previous.has(row.id));

  if (missing) {
    return { ok: false as const, message: "Categoria não encontrada nesta loja." };
  }

  if (inactiveNew) {
    return { ok: false as const, message: "Escolha categorias adicionais ativas." };
  }

  return { ok: true as const, categoryIds: uniqueCategoryIds };
}

async function syncProductCategories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  productId: string,
  categoryIds: string[]
) {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.map((id) => String(id ?? "").trim()).filter(Boolean)));

  const { error: deleteError } = await supabase
    .from("product_categories")
    .delete()
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (deleteError) {
    return { error: deleteError };
  }

  if (uniqueCategoryIds.length === 0) {
    return { error: null };
  }

  return supabase.from("product_categories").insert(
    uniqueCategoryIds.map((categoryId) => ({
      store_id: storeId,
      product_id: productId,
      category_id: categoryId,
    }))
  );
}

async function fetchProductCategoryIds(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  productId: string
) {
  const { data, error } = await supabase
    .from("product_categories")
    .select("category_id")
    .eq("store_id", storeId)
    .eq("product_id", productId);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => row.category_id);
}

export async function createProductAction(
  _prev: void | ProductFormState,
  formData: FormData
): Promise<void | ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const imageUrlRaw = String(formData.get("image_url") ?? "").trim();
  const categoryIds = parseAdditionalCategoryIds(formData, categoryId);

  if (!name) {
    return { error: "O nome do produto é obrigatório." };
  }
  if (!categoryId) {
    return { error: "Selecione uma categoria." };
  }

  const parsed = parseMoneyInput(priceRaw);
  if (!parsed.ok) {
    return { error: parsed.message };
  }

  const stock = resolveStockAndAvailability(formData);
  if (!stock.ok) {
    return { error: stock.message };
  }

  const imageNormalization = normalizeProductImageUrl(imageUrlRaw);
  if (imageNormalization.error) {
    return { error: imageNormalization.error };
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return { error: "Nenhuma loja vinculada à sua conta." };
  }

  const catOk = await assertCategoryAllowedForProduct(supabase, store.id, categoryId, null);
  if (!catOk.ok) {
    return { error: catOk.message };
  }

  const categoriesOk = await assertCategoriesAllowedForProduct(supabase, store.id, categoryIds);
  if (!categoriesOk.ok) {
    return { error: categoriesOk.message };
  }

  const { data: last } = await supabase
    .from("products")
    .select("sort_order")
    .eq("store_id", store.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.sort_order ?? -1) + 1;
  const description = descriptionRaw || null;
  const image_url = imageNormalization.value;

  const { data: insertedProduct, error } = await supabase.from("products").insert({
    store_id: store.id,
    category_id: categoryId,
    name,
    description,
    price: parsed.value,
    image_url,
    is_active: true,
    is_available: stock.is_available,
    track_stock: stock.track_stock,
    stock_quantity: stock.stock_quantity,
    sort_order: nextOrder,
  }).select("id").single();

  if (error || !insertedProduct) {
    return { error: formatPostgrestError(error ?? { message: "Não foi possível criar o produto." }) };
  }

  const { error: syncError } = await syncProductCategories(supabase, store.id, insertedProduct.id, categoriesOk.categoryIds);
  if (syncError) {
    await supabase.from("products").delete().eq("id", insertedProduct.id).eq("store_id", store.id);
    return { error: formatPostgrestError(syncError) };
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("criado");
}

export async function updateProductAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const imageUrlRaw = String(formData.get("image_url") ?? "").trim();
  const categoryIds = parseAdditionalCategoryIds(formData, categoryId);

  if (!productId || !name || !categoryId) {
    redirect(`${PATH}?aviso=erro-campos`);
  }

  const parsed = parseMoneyInput(priceRaw);
  if (!parsed.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(parsed.message)}`);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await productOwnedOrNull(supabase, store.id, productId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const stock = resolveStockAndAvailability(formData);
  if (!stock.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(stock.message)}`);
  }

  const imageNormalization = normalizeProductImageUrl(imageUrlRaw);
  if (imageNormalization.error) {
    redirect(`${PATH}?erro=${encodeURIComponent(imageNormalization.error)}`);
  }

  const catOk = await assertCategoryAllowedForProduct(supabase, store.id, categoryId, row.category_id);
  if (!catOk.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(catOk.message)}`);
  }

  const previousCategoryIds = Array.from(
    new Set(
      [row.category_id, ...(await fetchProductCategoryIds(supabase, store.id, productId))].filter(
        (id): id is string => Boolean(id)
      )
    )
  );
  const categoriesOk = await assertCategoriesAllowedForProduct(supabase, store.id, categoryIds, previousCategoryIds);
  if (!categoriesOk.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(categoriesOk.message)}`);
  }

  const description = descriptionRaw || null;
  const image_url = imageNormalization.value;

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description,
      price: parsed.value,
      category_id: categoryId,
      image_url,
      is_available: stock.track_stock ? row.is_available : stock.is_available,
      track_stock: stock.track_stock,
      stock_quantity: stock.stock_quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  const { error: syncError } = await syncProductCategories(supabase, store.id, productId, categoriesOk.categoryIds);
  if (syncError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(syncError))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("atualizado");
}

export async function toggleProductActiveAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await productOwnedOrNull(supabase, store.id, productId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_active: !row.is_active,
      is_available: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice(row.is_active ? "desativado" : "ativado");
}

export async function toggleProductAvailabilityAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await productOwnedOrNull(supabase, store.id, productId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { error } = await supabase
    .from("products")
    .update({ is_available: !row.is_available, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice(row.is_available ? "venda-pausada" : "venda-liberada");
}

export async function moveProductAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  if (!productId || (direction !== "up" && direction !== "down")) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const owned = await productOwnedOrNull(supabase, store.id, productId);
  if (!owned) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { data: list, error: listError } = await supabase
    .from("products")
    .select("id, sort_order")
    .eq("store_id", store.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError || !list?.length) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(listError ?? { message: "Lista vazia" }))}`);
  }

  const idx = list.findIndex((p) => p.id === productId);
  if (idx < 0) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) {
    revalidateStoreViews(store.slug);
    redirect(PATH);
  }

  const a = list[idx];
  const b = list[swapIdx];
  const ao = a.sort_order;
  const bo = b.sort_order;
  const temp = Math.max(ao, bo, ...list.map((x) => x.sort_order)) + 1_000_000;

  const { error: e1 } = await supabase.from("products").update({ sort_order: temp }).eq("id", a.id);
  if (e1) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e1))}`);
  }

  const { error: e2 } = await supabase.from("products").update({ sort_order: ao }).eq("id", b.id);
  if (e2) {
    await supabase.from("products").update({ sort_order: ao }).eq("id", a.id);
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e2))}`);
  }

  const { error: e3 } = await supabase.from("products").update({ sort_order: bo }).eq("id", a.id);
  if (e3) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e3))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("reordenado");
}

export type ReorderProductsActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reorderProductsAction(orderedProductIds: string[]): Promise<ReorderProductsActionResult> {
  if (!Array.isArray(orderedProductIds) || orderedProductIds.length === 0) {
    return { ok: false, error: "Não foi possível identificar a nova ordem dos produtos." };
  }

  const cleanIds = orderedProductIds.map((id) => String(id ?? "").trim());
  if (cleanIds.some((id) => !id)) {
    return { ok: false, error: "A lista de produtos contém identificadores inválidos." };
  }

  const uniqueIds = new Set(cleanIds);
  if (uniqueIds.size !== cleanIds.length) {
    return { ok: false, error: "A lista de produtos contém itens repetidos." };
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return { ok: false, error: "Nenhuma loja vinculada à sua conta." };
  }

  const { data: list, error: listError } = await supabase
    .from("products")
    .select("id, sort_order")
    .eq("store_id", store.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError || !list?.length) {
    return { ok: false, error: formatPostgrestError(listError ?? { message: "Lista vazia" }) };
  }

  if (cleanIds.length !== list.length) {
    return { ok: false, error: "A lista de produtos está desatualizada. Atualize a página e tente novamente." };
  }

  const existingIds = new Set(list.map((item) => item.id));
  if (cleanIds.some((id) => !existingIds.has(id))) {
    return { ok: false, error: "Não foi possível validar alguns produtos para reordenação." };
  }

  const maxSortOrder = Math.max(...list.map((item) => item.sort_order), 0);
  const tempBase = maxSortOrder + 1_000_000;

  for (const [index, id] of cleanIds.entries()) {
    const { error } = await supabase
      .from("products")
      .update({ sort_order: tempBase + index })
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      return { ok: false, error: formatPostgrestError(error) };
    }
  }

  for (const [index, id] of cleanIds.entries()) {
    const { error } = await supabase
      .from("products")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      return { ok: false, error: formatPostgrestError(error) };
    }
  }

  revalidateStoreViews(store.slug);
  return { ok: true };
}

export async function bulkSetProductsActiveAction(
  productIds: string[],
  active: boolean
): Promise<BulkProductsActionResult> {
  const { requested, uniqueIds, invalidCount, duplicateCount } = normalizeBulkIds(productIds);

  if (requested === 0 || uniqueIds.length === 0) {
    return emptyBulkProductsResult(requested, "Selecione ao menos um produto para continuar.");
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return emptyBulkProductsResult(requested, "Nenhuma loja vinculada à sua conta.");
  }

  const reasons: string[] = [];
  if (invalidCount > 0) {
    reasons.push(`${invalidCount} ${invalidCount === 1 ? "ID inválido foi ignorado" : "IDs inválidos foram ignorados"}.`);
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} ${duplicateCount === 1 ? "seleção repetida foi ignorada" : "seleções repetidas foram ignoradas"}.`);
  }

  const { data: rows, error: rowsError } = await fetchProductsForBulk(supabase, store.id, uniqueIds);

  if (rowsError) {
    return {
      ok: false,
      requested,
      updated: 0,
      deleted: 0,
      archived: 0,
      skipped: invalidCount + duplicateCount,
      failed: uniqueIds.length,
      message: "Não foi possível atualizar os produtos selecionados.",
      reasons: [formatPostgrestError(rowsError)],
    };
  }

  const foundIds = new Set((rows ?? []).map((row) => row.id));
  const activeRows = (rows ?? []).filter((row) => !row.archived_at);
  const archivedCount = (rows ?? []).length - activeRows.length;
  const missingCount = uniqueIds.length - foundIds.size;

  if (missingCount > 0) {
    reasons.push(
      `${missingCount} ${
        missingCount === 1
          ? "produto não pertence a esta loja ou não existe"
          : "produtos não pertencem a esta loja ou não existem"
      }.`
    );
  }
  if (archivedCount > 0) {
    reasons.push(`${archivedCount} ${archivedCount === 1 ? "produto já estava arquivado" : "produtos já estavam arquivados"}.`);
  }

  let updated = 0;
  let failed = 0;
  const targetIds = activeRows.map((row) => row.id);

  if (targetIds.length > 0) {
    const payload = active
      ? { is_active: true, updated_at: new Date().toISOString() }
      : { is_active: false, is_available: false, updated_at: new Date().toISOString() };

    const { data: updatedRows, error } = await supabase
      .from("products")
      .update(payload)
      .eq("store_id", store.id)
      .is("archived_at", null)
      .in("id", targetIds)
      .select("id");

    if (error) {
      failed = targetIds.length;
      reasons.push(formatPostgrestError(error));
    } else {
      updated = updatedRows?.length ?? targetIds.length;
    }
  }

  const skipped = invalidCount + duplicateCount + missingCount + archivedCount;
  const message = buildBulkProductsMessage({
    action: active ? "activate" : "deactivate",
    requested,
    updated,
    deleted: 0,
    archived: 0,
    skipped,
    failed,
    reasons,
  });

  revalidateStoreViews(store.slug);
  return {
    ok: failed === 0,
    requested,
    updated,
    deleted: 0,
    archived: 0,
    skipped,
    failed,
    message,
    reasons,
  };
}

export async function bulkSetProductsAvailabilityAction(
  productIds: string[],
  available: boolean
): Promise<BulkProductsActionResult> {
  const { requested, uniqueIds, invalidCount, duplicateCount } = normalizeBulkIds(productIds);

  if (requested === 0 || uniqueIds.length === 0) {
    return emptyBulkProductsResult(requested, "Selecione ao menos um produto para continuar.");
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return emptyBulkProductsResult(requested, "Nenhuma loja vinculada à sua conta.");
  }

  const reasons: string[] = [];
  if (invalidCount > 0) {
    reasons.push(`${invalidCount} ${invalidCount === 1 ? "ID inválido foi ignorado" : "IDs inválidos foram ignorados"}.`);
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} ${duplicateCount === 1 ? "seleção repetida foi ignorada" : "seleções repetidas foram ignoradas"}.`);
  }

  const { data: rows, error: rowsError } = await fetchProductsForBulk(supabase, store.id, uniqueIds);

  if (rowsError) {
    return {
      ok: false,
      requested,
      updated: 0,
      deleted: 0,
      archived: 0,
      skipped: invalidCount + duplicateCount,
      failed: uniqueIds.length,
      message: "Não foi possível atualizar os produtos selecionados.",
      reasons: [formatPostgrestError(rowsError)],
    };
  }

  const foundIds = new Set((rows ?? []).map((row) => row.id));
  const notArchivedRows = (rows ?? []).filter((row) => !row.archived_at);
  const archivedCount = (rows ?? []).length - notArchivedRows.length;
  const inactiveCount = available ? notArchivedRows.filter((row) => !row.is_active).length : 0;
  const targetRows = available ? notArchivedRows.filter((row) => row.is_active) : notArchivedRows;
  const missingCount = uniqueIds.length - foundIds.size;

  if (missingCount > 0) {
    reasons.push(
      `${missingCount} ${
        missingCount === 1
          ? "produto não pertence a esta loja ou não existe"
          : "produtos não pertencem a esta loja ou não existem"
      }.`
    );
  }
  if (archivedCount > 0) {
    reasons.push(`${archivedCount} ${archivedCount === 1 ? "produto já estava arquivado" : "produtos já estavam arquivados"}.`);
  }
  if (inactiveCount > 0) {
    reasons.push(
      `${inactiveCount} ${
        inactiveCount === 1
          ? "produto inativo não teve a venda disponibilizada"
          : "produtos inativos não tiveram a venda disponibilizada"
      }.`
    );
  }

  let updated = 0;
  let failed = 0;
  const targetIds = targetRows.map((row) => row.id);

  if (targetIds.length > 0) {
    const { data: updatedRows, error } = await supabase
      .from("products")
      .update({ is_available: available, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .is("archived_at", null)
      .in("id", targetIds)
      .select("id");

    if (error) {
      failed = targetIds.length;
      reasons.push(formatPostgrestError(error));
    } else {
      updated = updatedRows?.length ?? targetIds.length;
    }
  }

  const skipped = invalidCount + duplicateCount + missingCount + archivedCount + inactiveCount;
  const message = buildBulkProductsMessage({
    action: available ? "enable" : "pause",
    requested,
    updated,
    deleted: 0,
    archived: 0,
    skipped,
    failed,
    reasons,
  });

  revalidateStoreViews(store.slug);
  return {
    ok: failed === 0,
    requested,
    updated,
    deleted: 0,
    archived: 0,
    skipped,
    failed,
    message,
    reasons,
  };
}

export async function bulkDeleteProductsAction(productIds: string[]): Promise<BulkProductsActionResult> {
  const { requested, uniqueIds, invalidCount, duplicateCount } = normalizeBulkIds(productIds);

  if (requested === 0 || uniqueIds.length === 0) {
    return emptyBulkProductsResult(requested, "Selecione ao menos um produto para continuar.");
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return emptyBulkProductsResult(requested, "Nenhuma loja vinculada à sua conta.");
  }

  const reasons: string[] = [];
  if (invalidCount > 0) {
    reasons.push(`${invalidCount} ${invalidCount === 1 ? "ID inválido foi ignorado" : "IDs inválidos foram ignorados"}.`);
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} ${duplicateCount === 1 ? "seleção repetida foi ignorada" : "seleções repetidas foram ignoradas"}.`);
  }

  const { data: rows, error: rowsError } = await fetchProductsForBulk(supabase, store.id, uniqueIds);

  if (rowsError) {
    return {
      ok: false,
      requested,
      updated: 0,
      deleted: 0,
      archived: 0,
      skipped: invalidCount + duplicateCount,
      failed: uniqueIds.length,
      message: "Não foi possível concluir a ação.",
      reasons: [formatPostgrestError(rowsError)],
    };
  }

  const foundIds = new Set((rows ?? []).map((row) => row.id));
  const targetIds = (rows ?? []).filter((row) => !row.archived_at).map((row) => row.id);
  const archivedBeforeCount = (rows ?? []).length - targetIds.length;
  const missingCount = uniqueIds.length - foundIds.size;

  if (missingCount > 0) {
    reasons.push(
      `${missingCount} ${
        missingCount === 1
          ? "produto não pertence a esta loja ou não existe"
          : "produtos não pertencem a esta loja ou não existem"
      }.`
    );
  }
  if (archivedBeforeCount > 0) {
    reasons.push(
      `${archivedBeforeCount} ${
        archivedBeforeCount === 1 ? "produto já estava arquivado" : "produtos já estavam arquivados"
      }.`
    );
  }

  let deleted = 0;
  let archived = 0;
  let failed = 0;

  for (const productId of targetIds) {
    const [orderItemsHistoryResult, checkoutItemsHistoryResult] = await Promise.all([
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
      supabase
        .from("checkout_session_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId),
    ]);

    if (orderItemsHistoryResult.error || checkoutItemsHistoryResult.error) {
      failed += 1;
      reasons.push(
        formatPostgrestError(orderItemsHistoryResult.error ?? checkoutItemsHistoryResult.error ?? { message: "Erro ao validar histórico." })
      );
      continue;
    }

    const hasHistory =
      (orderItemsHistoryResult.count ?? 0) > 0 || (checkoutItemsHistoryResult.count ?? 0) > 0;

    if (hasHistory) {
      const { error: archiveError } = await archiveProductForHistory(supabase, store.id, productId);
      if (archiveError) {
        failed += 1;
        reasons.push(formatPostgrestError(archiveError));
      } else {
        archived += 1;
      }
      continue;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("store_id", store.id)
      .is("archived_at", null);

    if (error) {
      if (isProductHistoryDeleteError(error)) {
        const { error: archiveError } = await archiveProductForHistory(supabase, store.id, productId);
        if (archiveError) {
          failed += 1;
          reasons.push(formatPostgrestError(archiveError));
        } else {
          archived += 1;
        }
      } else {
        failed += 1;
        reasons.push(formatPostgrestError(error));
      }
    } else {
      deleted += 1;
    }
  }

  const skipped = invalidCount + duplicateCount + missingCount + archivedBeforeCount;
  const uniqueReasons = Array.from(new Set(reasons));
  const message = buildBulkProductsMessage({
    action: "delete",
    requested,
    updated: 0,
    deleted,
    archived,
    skipped,
    failed,
    reasons: uniqueReasons,
  });

  revalidateStoreViews(store.slug);
  return {
    ok: failed === 0,
    requested,
    updated: 0,
    deleted,
    archived,
    skipped,
    failed,
    message,
    reasons: uniqueReasons,
  };
}

export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const { data: row, error: rowError } = await supabase
    .from("products")
    .select("id, archived_at")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (rowError || !row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  if (row.archived_at) {
    revalidateStoreViews(store.slug);
    redirectWithNotice(PRODUCT_HISTORY_ARCHIVED_NOTICE);
  }

  const [orderItemsHistoryResult, checkoutItemsHistoryResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
    supabase
      .from("checkout_session_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
  ]);

  const { count: orderItemsHistoryCount, error: orderItemsHistoryError } = orderItemsHistoryResult;
  const { count: checkoutItemsHistoryCount, error: checkoutItemsHistoryError } = checkoutItemsHistoryResult;

  if (orderItemsHistoryError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(orderItemsHistoryError))}`);
  }

  if (checkoutItemsHistoryError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(checkoutItemsHistoryError))}`);
  }

  const hasHistory = (orderItemsHistoryCount ?? 0) > 0 || (checkoutItemsHistoryCount ?? 0) > 0;

  if (hasHistory) {
    const { error: archiveError } = await archiveProductForHistory(supabase, store.id, productId);
    if (archiveError) {
      redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(archiveError))}`);
    }

    revalidateStoreViews(store.slug);
    redirectWithNotice(PRODUCT_HISTORY_ARCHIVED_NOTICE);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    if (isProductHistoryDeleteError(error)) {
      const { error: archiveError } = await archiveProductForHistory(supabase, store.id, productId);
      if (archiveError) {
        redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(archiveError))}`);
      }

      revalidateStoreViews(store.slug);
      redirectWithNotice(PRODUCT_HISTORY_ARCHIVED_NOTICE);
    }
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("excluido");
}
