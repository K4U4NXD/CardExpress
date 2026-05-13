import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicReadyPanelClient } from "@/components/public/public-ready-panel-client";
import { BRANDING } from "@/lib/branding";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type LatestReadyOrder = {
  order_id: string;
  display_code: string | null;
  ready_at: string | null;
};

type RecentCalledOrder = {
  order_id: string;
  display_code: string | null;
  ready_at: string | null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
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
      absolute: `Painel | ${storeLabel}`,
    },
    description: `Painel público de retirada da loja ${storeLabel}.`,
    icons: {
      icon: [{ url: iconUrl }],
      shortcut: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    },
  };
}

/**
 * Painel público de retirada.
 * Exibe o último pedido chamado e um histórico curto para uso em balcão ou monitor compartilhado.
 */
export default async function PublicReadyPanelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createServerSupabaseClient();

  const [storeResult, readyResult, historyResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, logo_url")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .rpc("get_latest_ready_order_for_store", { p_slug: resolvedParams.slug })
      .maybeSingle(),
    supabase.rpc("get_recent_called_orders_for_store", {
      p_slug: resolvedParams.slug,
      p_limit: 5,
    }),
  ]);

  const store = storeResult.data;
  if (!store) {
    notFound();
  }

  const order = readyResult.error ? null : (readyResult.data as LatestReadyOrder | null);
  const recentCalled = historyResult.error ? [] : ((historyResult.data ?? []) as RecentCalledOrder[]);

  return (
    <div className="cx-dark-brand-surface min-h-screen py-5 sm:py-8">
      <div className="mx-auto max-w-5xl px-4 pb-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100/80">CardExpress</p>
        <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Painel de retirada</h1>
        <p className="mt-1 text-sm text-zinc-400">Pedidos liberados para retirada em tempo real.</p>
      </div>
      <div className="pb-8">
        <PublicReadyPanelClient
          slug={slug}
          latestOrder={order}
          recentCalledOrders={recentCalled}
          storeName={store.name}
          storeLogoUrl={store.logo_url}
          tvModeHref={`/${slug}/painel/tv`}
        />
      </div>
    </div>
  );
}
