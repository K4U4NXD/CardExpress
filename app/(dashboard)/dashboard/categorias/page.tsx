import type { Metadata } from "next";
import { DashboardCategoriesView } from "@/components/dashboard/dashboard-categories-view";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Category } from "@/types";

export const metadata: Metadata = {
  title: "Categorias",
};

export default async function DashboardCategoriesPage() {
  const { supabase, store } = await getUserStore();

  let categories: Category[] = [];

  if (store) {
    const { data } = await supabase
      .from("categories")
      .select("id, store_id, name, sort_order, is_active, created_at, updated_at")
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    categories = (data ?? []) as Category[];
  }

  if (!store) {
    return (
      <>
        <PageHeader
          title="Categorias"
          description="Organize o cardápio por seções."
          sticky
          compact
          stickyTopClassName="top-14 md:top-0"
          maxWidthClassName="max-w-6xl"
        />

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar categorias.
          </div>
        </div>
      </>
    );
  }

  return (
    <DashboardCategoriesView
      storeId={store.id}
      categories={categories}
    />
  );
}
