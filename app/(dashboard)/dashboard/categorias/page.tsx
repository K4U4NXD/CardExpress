import { DashboardCategoriesView } from "@/components/dashboard/dashboard-categories-view";
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
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar categorias.
          </div>
        </div>
      </>
    );
  }

  return <DashboardCategoriesView categories={categories} avisoText={avisoText} erroText={erroText} />;
}
