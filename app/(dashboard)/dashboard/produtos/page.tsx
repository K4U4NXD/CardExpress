import { DashboardProductsView } from "@/components/dashboard/dashboard-products-view";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Category, Product } from "@/types";

const AVISOS: Record<string, string> = {
  criado: "Produto criado com sucesso.",
  atualizado: "Produto atualizado.",
  desativado: "Produto desativado.",
  ativado: "Produto ativado.",
  "venda-pausada": "Venda do produto pausada.",
  "venda-liberada": "Produto disponibilizado para venda.",
  reordenado: "Ordem dos produtos atualizada.",
  excluido: "Produto excluído com sucesso.",
  "erro-campos": "Preencha nome, preço e categoria.",
  "erro-loja": "Não foi possível identificar sua loja.",
  "erro-permissao": "Produto não encontrado ou sem permissão.",
};

type PageProps = {
  searchParams: Promise<{ aviso?: string; erro?: string }>;
};

export default async function DashboardProductsPage({ searchParams }: PageProps) {
  const q = await searchParams;
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

  const avisoText = q.aviso ? AVISOS[q.aviso] : null;
  const erroText = q.erro ? decodeURIComponent(q.erro) : null;

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
          {erroText ? (
            <p
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {erroText}
            </p>
          ) : null}
          {avisoText ? (
            <p
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              role="status"
            >
              {avisoText}
            </p>
          ) : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar produtos.
          </div>
        </div>
      </>
    );
  }

  return (
    <DashboardProductsView categories={categories} products={products} avisoText={avisoText} erroText={erroText} />
  );
}
