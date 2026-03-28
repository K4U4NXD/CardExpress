import { CreateCategoryForm } from "@/components/dashboard/create-category-form";
import { CategoryRow } from "@/components/dashboard/category-row";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Category } from "@/types";

const AVISOS: Record<string, string> = {
  criada: "Categoria criada com sucesso.",
  "nome-atualizado": "Nome da categoria atualizado.",
  "estado-alterado": "Status da categoria atualizado.",
  reordenada: "Ordem das categorias atualizada.",
  excluida: "Categoria excluída com sucesso.",
  "erro-nome": "Informe um nome válido para salvar.",
  "erro-loja": "Não foi possível identificar sua loja.",
  "erro-permissao": "Categoria não encontrada ou você não tem permissão.",
};

type PageProps = {
  searchParams: Promise<{ aviso?: string; erro?: string }>;
};

export default async function DashboardCategoriesPage({ searchParams }: PageProps) {
  const q = await searchParams;
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

  const avisoText = q.aviso ? AVISOS[q.aviso] : null;
  const erroText = q.erro ? decodeURIComponent(q.erro) : null;

  return (
    <>
      <PageHeader title="Categorias" description="Organize o cardápio por seções. Apenas categorias da sua loja." />

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
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar categorias.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <CreateCategoryForm />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Suas categorias</h2>
              {categories.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">Nenhuma categoria ainda. Adicione uma acima.</p>
              ) : (
                <div className="mt-2">
                  {categories.map((cat, i) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      isFirst={i === 0}
                      isLast={i === categories.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
