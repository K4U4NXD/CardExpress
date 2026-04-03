import { PageHeader } from "@/components/layout/page-header";
import { PublicCheckoutClient } from "@/components/public/public-checkout-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicStoreRpcRow } from "@/types";
import { notFound } from "next/navigation";

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: store, error: storeError } = await supabase
    .rpc("get_public_store_by_slug", { p_slug: slug })
    .maybeSingle<PublicStoreRpcRow>();

  if (storeError || !store) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Checkout - ${store.name}`}
        description="Revise seus itens e confirme os dados para criar a sessao de checkout."
        backHref={`/${store.slug}`}
        backLabel="Voltar ao cardápio"
      />

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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

          {!store.accepts_orders ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Esta loja nao esta aceitando pedidos no momento.
            </p>
          ) : null}
        </section>

        <PublicCheckoutClient slug={store.slug} storeName={store.name} acceptsOrders={store.accepts_orders} />
      </div>
    </>
  );
}
