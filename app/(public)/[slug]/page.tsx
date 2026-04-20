import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PublicFlowRecoveryBanner } from "@/components/public/public-flow-recovery-banner";
import { PublicMenuRealtimeSync } from "@/components/public/public-menu-realtime-sync";
import { PublicStoreBrandBadge } from "@/components/public/public-store-brand-badge";
import { BRANDING } from "@/lib/branding";
import { PublicStoreMenuClient } from "@/components/public/public-store-menu-client";
import { getPublicStoreOperationalState } from "@/lib/public/store-operational";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicMenuRpcRow, PublicStoreRpcRow } from "@/types";
import { notFound } from "next/navigation";

type PublicMenuPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicMenuPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, slug, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const storeLabel = store?.name ?? store?.slug ?? slug;
  const iconUrl = store?.logo_url?.trim() || BRANDING.iconPath;

  return {
    title: {
      absolute: `Cardápio | ${storeLabel}`,
    },
    description: `Cardápio público da loja ${storeLabel}.`,
    icons: {
      icon: [{ url: iconUrl }],
      shortcut: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    },
  };
}

export default async function PublicMenuPage({ params }: PublicMenuPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const [storeResult, menuResult, storeBrandResult] = await Promise.all([
    supabase.rpc("get_public_store_by_slug", { p_slug: slug }).maybeSingle<PublicStoreRpcRow>(),
    supabase.rpc("get_public_menu_by_slug", { p_slug: slug }).returns<PublicMenuRpcRow[]>(),
    supabase
      .from("stores")
      .select("logo_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (storeResult.error || !storeResult.data) {
    notFound();
  }

  if (menuResult.error) {
    throw new Error(`Erro ao carregar cardapio publico: ${menuResult.error.message}`);
  }

  const menuRows: PublicMenuRpcRow[] = Array.isArray(menuResult.data) ? menuResult.data : [];
  const store = storeResult.data;
  const storeLogoUrl = storeBrandResult.data?.logo_url ?? null;
  const operationalState = getPublicStoreOperationalState({
    acceptsOrdersSetting: store.accepts_orders,
    menuRows,
  });

  return (
    <>
      <PageHeader
        title={store.name}
        description={
          operationalState.canPlaceOrders
            ? "Cardapio digital atualizado para pedidos com retirada."
            : "Pedidos indisponiveis no momento."
        }
        sticky
        compact
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PublicFlowRecoveryBanner slug={store.slug} />

        <section className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-[0_24px_44px_-34px_rgba(24,24,27,0.55)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700">Estabelecimento</p>

              <PublicStoreBrandBadge
                storeName={store.name}
                slug={store.slug}
                logoUrl={storeLogoUrl}
                showSlug={false}
              />

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

        <div className="pb-24 sm:pb-20">
          <PublicStoreMenuClient
            slug={store.slug}
            acceptsOrders={operationalState.canPlaceOrders}
            ordersUnavailableMessage={operationalState.unavailableMessage}
            menuRows={menuRows}
          />
        </div>
      </div>
    </>
  );
}
