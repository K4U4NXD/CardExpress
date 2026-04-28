"use server";

import { getUserStore } from "@/lib/auth/store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/db-errors";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PATH = "/dashboard/categorias";

function revalidateStoreViews(storeSlug: string) {
  revalidatePath(PATH);
  revalidatePath(`/${storeSlug}`);
}

function buildFlashToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type CategoryFormState = {
  error?: string;
};

export type BulkCategoriesActionResult = {
  ok: boolean;
  requested: number;
  changed: number;
  skipped: number;
  failed: number;
  message: string;
  reasons: string[];
};

function redirectWithNotice(notice: string) {
  redirect(`${PATH}?aviso=${encodeURIComponent(notice)}&flash=${buildFlashToken()}`);
}

function emptyBulkCategoriesResult(requested: number, message: string): BulkCategoriesActionResult {
  return {
    ok: false,
    requested,
    changed: 0,
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

function buildBulkCategoriesMessage(input: {
  action: "activate" | "deactivate" | "delete";
  requested: number;
  changed: number;
  skipped: number;
  failed: number;
  reasons: string[];
}) {
  const ignored = input.skipped + input.failed;
  const categoryWord = input.changed === 1 ? "categoria" : "categorias";

  if (input.changed === 0) {
    return "Nenhuma categoria foi alterada.";
  }

  const actionLabel =
    input.action === "activate"
      ? input.changed === 1
        ? "ativada"
        : "ativadas"
      : input.action === "deactivate"
        ? input.changed === 1
          ? "desativada"
          : "desativadas"
        : input.changed === 1
          ? "excluída"
          : "excluídas";

  const changedText = `${input.changed} ${categoryWord} ${actionLabel}.`;

  if (ignored === 0) {
    return changedText;
  }

  if (input.action === "delete") {
    return `${changedText} ${ignored} ${ignored === 1 ? "mantida" : "mantidas"}.`;
  }

  return `${changedText} ${ignored} ${ignored === 1 ? "item ignorado" : "itens ignorados"}.`;
}

function isCategoryProductReferenceError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const joined = `${String(record.message ?? "")} ${String(record.details ?? "")} ${String(record.hint ?? "")}`.toLowerCase();

  return code === "23503" && joined.includes("products") && joined.includes("category");
}

async function findCategoriesWithActiveProducts(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  categoryIds: string[]
) {
  const blockedIds = new Set<string>();

  const { data: directProducts, error: directError } = await supabase
    .from("products")
    .select("category_id")
    .eq("store_id", storeId)
    .in("category_id", categoryIds)
    .is("archived_at", null);

  if (directError) {
    return { blockedIds, error: directError };
  }

  for (const product of directProducts ?? []) {
    if (product.category_id) {
      blockedIds.add(product.category_id);
    }
  }

  const { data: associationRows, error: associationError } = await supabase
    .from("product_categories")
    .select("product_id, category_id")
    .eq("store_id", storeId)
    .in("category_id", categoryIds);

  if (associationError) {
    return { blockedIds, error: associationError };
  }

  const productIds = Array.from(new Set((associationRows ?? []).map((row) => row.product_id)));
  if (productIds.length === 0) {
    return { blockedIds, error: null };
  }

  const { data: activeProducts, error: productsError } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .in("id", productIds)
    .is("archived_at", null);

  if (productsError) {
    return { blockedIds, error: productsError };
  }

  const activeProductIds = new Set((activeProducts ?? []).map((product) => product.id));
  for (const row of associationRows ?? []) {
    if (activeProductIds.has(row.product_id)) {
      blockedIds.add(row.category_id);
    }
  }

  return { blockedIds, error: null };
}

async function unlinkArchivedProductsFromCategories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  categoryIds: string[]
) {
  const { error: productsError } = await supabase
    .from("products")
    .update({ category_id: null, updated_at: new Date().toISOString() })
    .eq("store_id", storeId)
    .in("category_id", categoryIds)
    .not("archived_at", "is", null);

  if (productsError) {
    return { error: productsError };
  }

  return supabase
    .from("product_categories")
    .delete()
    .eq("store_id", storeId)
    .in("category_id", categoryIds);
}

async function categoryOwnedOrNull(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  categoryId: string
) {
  const { data, error } = await supabase
    .from("categories")
    .select("id, sort_order, is_active, name")
    .eq("id", categoryId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function createCategoryAction(
  _prev: void | CategoryFormState,
  formData: FormData
): Promise<void | CategoryFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "O nome da categoria é obrigatório." };
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return { error: "Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de criar categorias." };
  }

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("categories").insert({
    store_id: store.id,
    name,
    sort_order: nextOrder,
    is_active: true,
  });

  if (error) {
    return { error: formatPostgrestError(error) };
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("criada");
}

export async function updateCategoryNameAction(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!categoryId || !name) {
    redirect(`${PATH}?aviso=erro-nome`);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await categoryOwnedOrNull(supabase, store.id, categoryId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { error } = await supabase
    .from("categories")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("nome-atualizado");
}

export async function toggleCategoryActiveAction(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await categoryOwnedOrNull(supabase, store.id, categoryId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { error } = await supabase
    .from("categories")
    .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("estado-alterado");
}

export async function moveCategoryAction(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  if (!categoryId || (direction !== "up" && direction !== "down")) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const owned = await categoryOwnedOrNull(supabase, store.id, categoryId);
  if (!owned) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { data: list, error: listError } = await supabase
    .from("categories")
    .select("id, sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError || !list?.length) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(listError ?? { message: "Lista vazia" }))}`);
  }

  const idx = list.findIndex((c) => c.id === categoryId);
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

  const { error: e1 } = await supabase.from("categories").update({ sort_order: temp }).eq("id", a.id);
  if (e1) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e1))}`);
  }

  const { error: e2 } = await supabase.from("categories").update({ sort_order: ao }).eq("id", b.id);
  if (e2) {
    await supabase.from("categories").update({ sort_order: ao }).eq("id", a.id);
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e2))}`);
  }

  const { error: e3 } = await supabase.from("categories").update({ sort_order: bo }).eq("id", a.id);
  if (e3) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(e3))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("reordenada");
}

export type ReorderCategoriesActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reorderCategoriesAction(orderedCategoryIds: string[]): Promise<ReorderCategoriesActionResult> {
  if (!Array.isArray(orderedCategoryIds) || orderedCategoryIds.length === 0) {
    return { ok: false, error: "Não foi possível identificar a nova ordem das categorias." };
  }

  const cleanIds = orderedCategoryIds.map((id) => String(id ?? "").trim());
  if (cleanIds.some((id) => !id)) {
    return { ok: false, error: "A lista de categorias contém identificadores inválidos." };
  }

  const uniqueIds = new Set(cleanIds);
  if (uniqueIds.size !== cleanIds.length) {
    return { ok: false, error: "A lista de categorias contém itens repetidos." };
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return { ok: false, error: "Nenhuma loja vinculada à sua conta." };
  }

  const { data: list, error: listError } = await supabase
    .from("categories")
    .select("id, sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError || !list?.length) {
    return { ok: false, error: formatPostgrestError(listError ?? { message: "Lista vazia" }) };
  }

  if (cleanIds.length !== list.length) {
    return { ok: false, error: "A lista de categorias está desatualizada. Atualize a página e tente novamente." };
  }

  const existingIds = new Set(list.map((item) => item.id));
  if (cleanIds.some((id) => !existingIds.has(id))) {
    return { ok: false, error: "Não foi possível validar algumas categorias para reordenação." };
  }

  const maxSortOrder = Math.max(...list.map((item) => item.sort_order), 0);
  const tempBase = maxSortOrder + 1_000_000;

  for (const [index, id] of cleanIds.entries()) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: tempBase + index })
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) {
      return { ok: false, error: formatPostgrestError(error) };
    }
  }

  for (const [index, id] of cleanIds.entries()) {
    const { error } = await supabase
      .from("categories")
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

export async function bulkSetCategoriesActiveAction(
  categoryIds: string[],
  active: boolean
): Promise<BulkCategoriesActionResult> {
  const { requested, uniqueIds, invalidCount, duplicateCount } = normalizeBulkIds(categoryIds);

  if (requested === 0 || uniqueIds.length === 0) {
    return emptyBulkCategoriesResult(requested, "Selecione ao menos uma categoria para continuar.");
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return emptyBulkCategoriesResult(requested, "Nenhuma loja vinculada à sua conta.");
  }

  const reasons: string[] = [];
  if (invalidCount > 0) {
    reasons.push(`${invalidCount} ${invalidCount === 1 ? "ID inválido foi ignorado" : "IDs inválidos foram ignorados"}.`);
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} ${duplicateCount === 1 ? "seleção repetida foi ignorada" : "seleções repetidas foram ignoradas"}.`);
  }

  const { data: ownedRows, error: ownedError } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", store.id)
    .in("id", uniqueIds);

  if (ownedError) {
    return {
      ok: false,
      requested,
      changed: 0,
      skipped: invalidCount + duplicateCount,
      failed: uniqueIds.length,
      message: "Não foi possível concluir a ação.",
      reasons: [formatPostgrestError(ownedError)],
    };
  }

  const ownedIds = (ownedRows ?? []).map((row) => row.id);
  const missingCount = uniqueIds.length - ownedIds.length;
  if (missingCount > 0) {
    reasons.push(
      `${missingCount} ${
        missingCount === 1
          ? "categoria não pertence a esta loja ou não existe"
          : "categorias não pertencem a esta loja ou não existem"
      }.`
    );
  }

  let changed = 0;
  let failed = 0;

  if (ownedIds.length > 0) {
    const { data: updatedRows, error } = await supabase
      .from("categories")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .in("id", ownedIds)
      .select("id");

    if (error) {
      failed = ownedIds.length;
      reasons.push(formatPostgrestError(error));
    } else {
      changed = updatedRows?.length ?? ownedIds.length;
    }
  }

  const skipped = invalidCount + duplicateCount + missingCount;
  const message = buildBulkCategoriesMessage({
    action: active ? "activate" : "deactivate",
    requested,
    changed,
    skipped,
    failed,
    reasons,
  });

  revalidateStoreViews(store.slug);
  return {
    ok: failed === 0,
    requested,
    changed,
    skipped,
    failed,
    message,
    reasons,
  };
}

export async function bulkDeleteCategoriesAction(categoryIds: string[]): Promise<BulkCategoriesActionResult> {
  const { requested, uniqueIds, invalidCount, duplicateCount } = normalizeBulkIds(categoryIds);

  if (requested === 0 || uniqueIds.length === 0) {
    return emptyBulkCategoriesResult(requested, "Selecione ao menos uma categoria para continuar.");
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    return emptyBulkCategoriesResult(requested, "Nenhuma loja vinculada à sua conta.");
  }

  const reasons: string[] = [];
  if (invalidCount > 0) {
    reasons.push(`${invalidCount} ${invalidCount === 1 ? "ID inválido foi ignorado" : "IDs inválidos foram ignorados"}.`);
  }
  if (duplicateCount > 0) {
    reasons.push(`${duplicateCount} ${duplicateCount === 1 ? "seleção repetida foi ignorada" : "seleções repetidas foram ignoradas"}.`);
  }

  const { data: ownedRows, error: ownedError } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", store.id)
    .in("id", uniqueIds);

  if (ownedError) {
    return {
      ok: false,
      requested,
      changed: 0,
      skipped: invalidCount + duplicateCount,
      failed: uniqueIds.length,
      message: "Não foi possível concluir a ação.",
      reasons: [formatPostgrestError(ownedError)],
    };
  }

  const ownedIds = (ownedRows ?? []).map((row) => row.id);
  const missingCount = uniqueIds.length - ownedIds.length;
  if (missingCount > 0) {
    reasons.push(
      `${missingCount} ${
        missingCount === 1
          ? "categoria não pertence a esta loja ou não existe"
          : "categorias não pertencem a esta loja ou não existem"
      }.`
    );
  }

  let blockedCount = 0;
  let changed = 0;
  let failed = 0;

  if (ownedIds.length > 0) {
    const { blockedIds, error: productsError } = await findCategoriesWithActiveProducts(supabase, store.id, ownedIds);

    if (productsError) {
      failed = ownedIds.length;
      reasons.push(formatPostgrestError(productsError));
    } else {
      const deletableIds = ownedIds.filter((id) => !blockedIds.has(id));
      blockedCount = ownedIds.length - deletableIds.length;

      if (blockedCount > 0) {
        reasons.push(
          `${blockedCount} ${
            blockedCount === 1
              ? "categoria foi preservada por ter produtos ativos ou não arquivados vinculados"
              : "categorias foram preservadas por terem produtos ativos ou não arquivados vinculados"
          }.`
        );
      }

      if (deletableIds.length > 0) {
        const { error: unlinkError } = await unlinkArchivedProductsFromCategories(supabase, store.id, deletableIds);
        if (unlinkError) {
          failed = deletableIds.length;
          reasons.push(formatPostgrestError(unlinkError));
        } else {
          const { data: deletedRows, error } = await supabase
            .from("categories")
            .delete()
            .eq("store_id", store.id)
            .in("id", deletableIds)
            .select("id");

          if (error) {
            failed = deletableIds.length;
            reasons.push(
              isCategoryProductReferenceError(error)
                ? "Algumas categorias ainda possuem histórico vinculado."
                : formatPostgrestError(error)
            );
          } else {
            changed = deletedRows?.length ?? deletableIds.length;
          }
        }
      }
    }
  }

  const skipped = invalidCount + duplicateCount + missingCount + blockedCount;
  const message = buildBulkCategoriesMessage({
    action: "delete",
    requested,
    changed,
    skipped,
    failed,
    reasons,
  });

  revalidateStoreViews(store.slug);
  return {
    ok: failed === 0,
    requested,
    changed,
    skipped,
    failed,
    message,
    reasons,
  };
}

export async function deleteCategoryAction(formData: FormData) {
  const categoryId = String(formData.get("category_id") ?? "").trim();
  if (!categoryId) {
    redirect(PATH);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await categoryOwnedOrNull(supabase, store.id, categoryId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { blockedIds, error: productsError } = await findCategoriesWithActiveProducts(supabase, store.id, [categoryId]);

  if (productsError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(productsError))}`);
  }

  if (blockedIds.has(categoryId)) {
    redirect(
      `${PATH}?erro=${encodeURIComponent(
        "Não foi possível excluir esta categoria. Ela ainda possui produtos ativos vinculados."
      )}`
    );
  }

  const { error: unlinkError } = await unlinkArchivedProductsFromCategories(supabase, store.id, [categoryId]);
  if (unlinkError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(unlinkError))}`);
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", store.id);

  if (error) {
    if (isCategoryProductReferenceError(error)) {
      redirect(
        `${PATH}?erro=${encodeURIComponent(
          "Não foi possível excluir esta categoria."
        )}`
      );
    }

    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("excluida");
}
