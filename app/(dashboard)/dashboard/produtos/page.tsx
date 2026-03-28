import { CreateProductForm } from "@/components/dashboard/create-product-form";
import { ProductRow } from "@/components/dashboard/product-row";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Category, Product } from "@/types";

const AVISOS: Record<string, string> = {
  criado: "Produto criado com sucesso.",
  atualizado: "Produto atualizado.",
  "estado-alterado": "Status do produto atualizado.",
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

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const categoriesForCreate = categories.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name }));

  const avisoText = q.aviso ? AVISOS[q.aviso] : null;
  const erroText = q.erro ? decodeURIComponent(q.erro) : null;

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Itens do cardápio da sua loja. Apenas produtos e categorias desta loja."
      />

      <div className="mx-auto max-w-4xl px-6 py-8">
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

        {!store ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar produtos.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-zinc-900">Novo produto</h2>
              <CreateProductForm categories={categoriesForCreate} />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Seus produtos</h2>
              {products.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">Nenhum produto ainda. Adicione um acima.</p>
              ) : (
                <div className="mt-2">
                  {products.map((p, i) => {
                    const base = categories
                      .filter((c) => c.is_active || c.id === p.category_id)
                      .map((c) => ({ id: c.id, name: c.name }));
                    const hasCurrent = base.some((o) => o.id === p.category_id);
                    const options = hasCurrent
                      ? base
                      : [
                          {
                            id: p.category_id,
                            name: categoryNameById[p.category_id] ?? "Categoria",
                          },
                          ...base,
                        ];
                    return (
                      <ProductRow
                        key={p.id}
                        product={p}
                        categoryName={categoryNameById[p.category_id] ?? "—"}
                        categoryOptions={options}
                        isFirst={i === 0}
                        isLast={i === products.length - 1}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
