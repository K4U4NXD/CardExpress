import { PageHeader } from "@/components/layout/page-header";
import { PublicStoreMenuClient } from "@/components/public/public-store-menu-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicMenuRpcRow, PublicStoreRpcRow } from "@/types";
import { notFound } from "next/navigation";

type PublicMenuPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const [storeResult, menuResult] = await Promise.all([
    supabase.rpc("get_public_store_by_slug", { p_slug: slug }).maybeSingle<PublicStoreRpcRow>(),
    supabase.rpc("get_public_menu_by_slug", { p_slug: slug }).returns<PublicMenuRpcRow[]>(),
  ]);

  if (storeResult.error || !storeResult.data) {
    notFound();
  }

  if (menuResult.error) {
    throw new Error(`Erro ao carregar cardapio publico: ${menuResult.error.message}`);
  }

  const menuRows = menuResult.data ?? [];
  const store = storeResult.data;

  return (
    <>
      <PageHeader
        title={store.name}
        description={
          store.accepts_orders
            ? "Confira o cardápio digital e faça seu pedido."
            : "A loja está com os pedidos pausados no momento."
        }
        backHref="/"
        backLabel="Início"
        sticky
        compact
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-700">Estabelecimento</p>
              <p className="text-lg font-semibold text-zinc-900">{store.name}</p>
              {store.phone ? (
                <a href={`tel:${store.phone}`} className="text-sm text-zinc-600 hover:text-zinc-900">
                  Telefone: {store.phone}
                </a>
              ) : null}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                store.accepts_orders ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {store.accepts_orders ? "Recebendo pedidos" : "Pedidos pausados"}
            </span>
          </div>

          {store.public_message ? (
            <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">{store.public_message}</p>
          ) : null}
        </section>

        <div className="pb-24 sm:pb-20">
          <PublicStoreMenuClient slug={store.slug} acceptsOrders={store.accepts_orders} menuRows={menuRows} />
        </div>
      </div>
    </>
  );
}
