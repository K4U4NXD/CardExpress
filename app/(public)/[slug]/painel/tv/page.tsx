import { PublicReadyPanelClient } from "@/components/public/public-ready-panel-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

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

export default async function PublicReadyPanelTvPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createServerSupabaseClient();

  const [storeResult, readyResult, historyResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .rpc("get_latest_ready_order_for_store", { p_slug: slug })
      .maybeSingle(),
    supabase.rpc("get_recent_called_orders_for_store", {
      p_slug: slug,
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
    <PublicReadyPanelClient
      slug={slug}
      latestOrder={order}
      recentCalledOrders={recentCalled}
      mode="tv"
      storeName={store.name}
    />
  );
}