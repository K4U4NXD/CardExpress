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

export type CategoryFormState = {
  error?: string;
};

function redirectWithNotice(notice: string) {
  redirect(`${PATH}?aviso=${encodeURIComponent(notice)}`);
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

  const { count: productCount, error: productsError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("category_id", categoryId);

  if (productsError) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(productsError))}`);
  }

  if ((productCount ?? 0) > 0) {
    redirect(
      `${PATH}?erro=${encodeURIComponent(
        "Não é possível excluir esta categoria enquanto existirem produtos vinculados. Remova ou associe os produtos a outra categoria e tente novamente."
      )}`
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("store_id", store.id);

  if (error) {
    redirect(`${PATH}?erro=${encodeURIComponent(formatPostgrestError(error))}`);
  }

  revalidateStoreViews(store.slug);
  redirectWithNotice("excluida");
}
