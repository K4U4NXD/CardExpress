import { PageHeader } from "@/components/layout/page-header";
import { PublicCheckoutClient } from "@/components/public/public-checkout-client";
import { PublicMenuRealtimeSync } from "@/components/public/public-menu-realtime-sync";
import { getPublicStoreOperationalState } from "@/lib/public/store-operational";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicMenuRpcRow, PublicStoreRpcRow } from "@/types";
import { notFound } from "next/navigation";

type CheckoutPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const [storeResult, menuResult] = await Promise.all([
    supabase.rpc("get_public_store_by_slug", { p_slug: slug }).maybeSingle<PublicStoreRpcRow>(),
    supabase.rpc("get_public_menu_by_slug", { p_slug: slug }).returns<PublicMenuRpcRow[]>(),
  ]);

  const { data: store, error: storeError } = storeResult;

  if (storeError || !store) {
    notFound();
  }

  if (menuResult.error) {
    throw new Error(`Erro ao carregar cardápio público: ${menuResult.error.message}`);
  }

  const menuRows: PublicMenuRpcRow[] = Array.isArray(menuResult.data) ? menuResult.data : [];
  const operationalState = getPublicStoreOperationalState({
    acceptsOrdersSetting: store.accepts_orders,
    acceptsOrdersManual: store.accepts_orders_manual,
    autoAcceptOrdersBySchedule: store.auto_accept_orders_by_schedule,
    openingTime: store.opening_time,
    closingTime: store.closing_time,
    isWithinServiceHours: store.is_within_service_hours,
    menuRows,
  });

  return (
    <>
      <PageHeader
        title={`Checkout - ${store.name}`}
        description="Revise os itens e confirme os dados para concluir esta etapa do pedido."
        backHref={`/${store.slug}`}
        backLabel="Voltar ao cardápio"
        sticky
        compact
        bottomContent={<p className="text-xs text-zinc-500">Etapa atual: revisão do carrinho e dados do cliente.</p>}
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-[0_24px_44px_-34px_rgba(24,24,27,0.55)] sm:p-5">
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
                operationalState.canPlaceOrders ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {operationalState.summaryLabel}
            </span>
          </div>

          {operationalState.unavailableMessage ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status">
              {operationalState.unavailableMessage}
            </p>
          ) : null}

          {store.public_message ? (
            <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{store.public_message}</p>
          ) : null}

          <PublicMenuRealtimeSync slug={store.slug} className="mt-4" />
        </section>

        <PublicCheckoutClient
          slug={store.slug}
          storeName={store.name}
          acceptsOrders={operationalState.canPlaceOrders}
          ordersUnavailableMessage={operationalState.unavailableMessage}
          schedule={{
            autoAcceptOrdersBySchedule: store.auto_accept_orders_by_schedule,
            openingTime: store.opening_time,
            closingTime: store.closing_time,
          }}
          menuRows={menuRows}
        />
      </div>
    </>
  );
}
