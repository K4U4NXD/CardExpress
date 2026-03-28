"use server";

import { getUserStore } from "@/lib/auth/store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/db-errors";
import { parseMoneyInput } from "@/lib/validation/price";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PATH = "/dashboard/produtos";

export type ProductFormState = {
  error?: string;
};

function redirectWithNotice(notice: string) {
  redirect(`${PATH}?aviso=${encodeURIComponent(notice)}`);
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
      is_available: n > 0,
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
      "id, sort_order, is_active, category_id, name, description, price, image_url, track_stock, stock_quantity, is_available"
    )
    .eq("id", productId)
    .eq("store_id", storeId)
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

export async function createProductAction(
  _prev: void | ProductFormState,
  formData: FormData
): Promise<void | ProductFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const imageUrlRaw = String(formData.get("image_url") ?? "").trim();

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

  const { supabase, store } = await getUserStore();
  if (!store) {
    return { error: "Nenhuma loja vinculada à sua conta." };
  }

  const catOk = await assertCategoryAllowedForProduct(supabase, store.id, categoryId, null);
  if (!catOk.ok) {
    return { error: catOk.message };
  }

  const { data: last } = await supabase
    .from("products")
    .select("sort_order")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.sort_order ?? -1) + 1;
  const description = descriptionRaw || null;
  const image_url = imageUrlRaw || null;

  const { error } = await supabase.from("products").insert({
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
  });

  if (error) {
    return { error: formatPostgrestError(error) };
  }

  revalidatePath(PATH);
  redirectWithNotice("criado");
}

export async function updateProductAction(formData: FormData) {
  const productId = String(formData.get("product_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const descriptionRaw = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const imageUrlRaw = String(formData.get("image_url") ?? "").trim();

  if (!productId || !name || !categoryId) {
    redirect(`${PATH}?aviso=erro-campos`);
  }

  const parsed = parseMoneyInput(priceRaw);
  if (!parsed.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(parsed.message)}`);
  }

  const stock = resolveStockAndAvailability(formData);
  if (!stock.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(stock.message)}`);
  }

  const { supabase, store } = await getUserStore();
  if (!store) {
    redirect(`${PATH}?aviso=erro-loja`);
  }

  const row = await productOwnedOrNull(supabase, store.id, productId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const catOk = await assertCategoryAllowedForProduct(supabase, store.id, categoryId, row.category_id);
  if (!catOk.ok) {
    redirect(`${PATH}?erro=${encodeURIComponent(catOk.message)}`);
  }

  const description = descriptionRaw || null;
  const image_url = imageUrlRaw || null;

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description,
      price: parsed.value,
      category_id: categoryId,
      image_url,
      is_available: stock.is_available,
      track_stock: stock.track_stock,
      stock_quantity: stock.stock_quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidatePath(PATH);
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
    .update({ is_active: !row.is_active, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidatePath(PATH);
  redirectWithNotice("estado-alterado");
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
    revalidatePath(PATH);
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

  revalidatePath(PATH);
  redirectWithNotice("reordenado");
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

  const row = await productOwnedOrNull(supabase, store.id, productId);
  if (!row) {
    redirect(`${PATH}?aviso=erro-permissao`);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidatePath(PATH);
  redirectWithNotice("excluido");
}
