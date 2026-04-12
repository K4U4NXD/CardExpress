import { DashboardProductsView } from "@/components/dashboard/dashboard-products-view";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Category, Product } from "@/types";
export default async function DashboardProductsPage() {
  const { supabase, store } = await getUserStore();

  let products: Product[] = [];
  let categories: Category[] = [];

  if (store) {
    const [{ data: prodData }, { data: catData }] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, store_id, category_id, name, description, price, image_url, is_active, is_available, track_stock, stock_quantity, sort_order, created_at, updated_at"
        )
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("id, store_id, name, sort_order, is_active, created_at, updated_at")
        .eq("store_id", store.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    products = (prodData ?? []) as Product[];
    categories = (catData ?? []) as Category[];
  }

  if (!store) {
    return (
      <>
        <PageHeader
          title="Produtos"
          description="Itens do cardápio da sua loja."
          sticky
          compact
          stickyTopClassName="top-14 md:top-0"
        />

        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar produtos.
          </div>
        </div>
      </>
    );
  }

  return (
    <DashboardProductsView
      storeId={store.id}
      categories={categories}
      products={products}
    />
  );
}
