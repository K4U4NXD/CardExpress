import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateStoreReadiness } from "@/lib/store-readiness";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardHomeRealtimeSync } from "@/components/dashboard/dashboard-home-realtime-sync";
import { formatDateTime, formatOrderCode, ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from "@/lib/orders/presenter";
import { getTodayRangeInSaoPaulo } from "@/lib/timezone";
import { formatBRL } from "@/lib/validation/price";
import Link from "next/link";
import type { OrderStatus } from "@/types";

const LOW_STOCK_THRESHOLD = 5;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

type OrderTotalRow = {
  total_amount: number;
};

type TopProductOrderItemRow = {
  name: string;
  quantity: number;
};

type TopProductOrderRow = {
  id: string;
  order_items?: TopProductOrderItemRow[] | null;
};

type RecentOrderRow = {
  id: string;
  display_code: string | null;
  order_number: number | null;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
};

type StockProblemProductRow = {
  id: string;
  name: string;
  stock_quantity: number;
};

function statusLabel(acceptsOrders: boolean, isReady: boolean) {
  if (!isReady) return { text: "Com pendências", badge: "bg-amber-100 text-amber-900" };
  if (acceptsOrders) return { text: "Aceitando pedidos", badge: "bg-emerald-100 text-emerald-900" };
  return { text: "Pedidos pausados", badge: "bg-zinc-200 text-zinc-700" };
}

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, phone")
    .eq("owner_id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Comerciante";

  let acceptsOrders = true;
  let activeCategories = 0;
  let purchasableProducts = 0;
  let waitingOrders = 0;
  let preparingOrders = 0;
  let readyOrders = 0;
  let finalizedTodayCount = 0;
  let soldToday = 0;
  let ticketAverageToday = 0;
  let outOfStockProducts = 0;
  let lowStockProducts = 0;
  let outOfStockProductList: StockProblemProductRow[] = [];
  let lowStockProductList: StockProblemProductRow[] = [];
  let topProducts: Array<{ name: string; quantity: number }> = [];
  let recentOrders: RecentOrderRow[] = [];
  let readiness = null as Awaited<ReturnType<typeof calculateStoreReadiness>> | null;

  if (store) {
    const { startOfTodayIso, startOfTomorrowIso } = getTodayRangeInSaoPaulo(new Date());

    const [
      settingsResult,
      readinessResult,
      activeCategoriesResult,
      waitingOrdersResult,
      preparingOrdersResult,
      readyOrdersResult,
      finalizedTodayResult,
      outOfStockProductsResult,
      lowStockProductsResult,
      outOfStockProductListResult,
      lowStockProductListResult,
      topProductsResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase
        .from("store_settings")
        .select("accepts_orders")
        .eq("store_id", store.id)
        .maybeSingle(),
      calculateStoreReadiness(supabase, {
        storeId: store.id,
        storeName: store.name,
        storePhone: store.phone,
        storeSlug: store.slug,
      }).catch(() => null),
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "aguardando_aceite" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "em_preparo" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "pronto_para_retirada" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", store.id)
        .eq("status", "finalizado" satisfies OrderStatus)
        .gte("finalized_at", startOfTodayIso)
        .lt("finalized_at", startOfTomorrowIso),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .lte("stock_quantity", 0),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .gt("stock_quantity", 0)
        .lte("stock_quantity", LOW_STOCK_THRESHOLD),
      supabase
        .from("products")
        .select("id, name, stock_quantity")
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .lte("stock_quantity", 0)
        .order("stock_quantity", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, stock_quantity")
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .gt("stock_quantity", 0)
        .lte("stock_quantity", LOW_STOCK_THRESHOLD)
        .order("stock_quantity", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("orders")
        .select("id, order_items(name, quantity)")
        .eq("store_id", store.id)
        .eq("status", "finalizado" satisfies OrderStatus)
        .gte("finalized_at", startOfTodayIso)
        .lt("finalized_at", startOfTomorrowIso),
      supabase
        .from("orders")
        .select("id, display_code, order_number, status, total_amount, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(RECENT_ORDERS_LIMIT),
    ]);

    acceptsOrders = settingsResult.data?.accepts_orders ?? true;
    readiness = readinessResult;
    activeCategories = activeCategoriesResult.count ?? 0;
    purchasableProducts = readinessResult?.activeAvailableProducts ?? 0;
    waitingOrders = waitingOrdersResult.count ?? 0;
    preparingOrders = preparingOrdersResult.count ?? 0;
    readyOrders = readyOrdersResult.count ?? 0;

    const finalizedTodayRows = (finalizedTodayResult.data ?? []) as OrderTotalRow[];
    finalizedTodayCount = finalizedTodayRows.length;
    soldToday = finalizedTodayRows.reduce((acc, row) => acc + Number(row.total_amount ?? 0), 0);
    ticketAverageToday = finalizedTodayCount > 0 ? soldToday / finalizedTodayCount : 0;

    outOfStockProducts = outOfStockProductsResult.count ?? 0;
    lowStockProducts = lowStockProductsResult.count ?? 0;
    if (!outOfStockProductListResult.error) {
      outOfStockProductList = (outOfStockProductListResult.data ?? []) as StockProblemProductRow[];
    }
    if (!lowStockProductListResult.error) {
      lowStockProductList = (lowStockProductListResult.data ?? []) as StockProblemProductRow[];
    }

    if (!topProductsResult.error) {
      const topOrders = (topProductsResult.data ?? []) as TopProductOrderRow[];
      const topProductMap = new Map<string, number>();

      for (const order of topOrders) {
        for (const item of order.order_items ?? []) {
          const itemName = (item.name ?? "").trim();
          if (!itemName) continue;
          const current = topProductMap.get(itemName) ?? 0;
          topProductMap.set(itemName, current + Math.max(1, Math.floor(Number(item.quantity) || 0)));
        }
      }

      topProducts = [...topProductMap.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
        .slice(0, TOP_PRODUCTS_LIMIT)
        .map(([name, quantity]) => ({ name, quantity }));
    }

    if (!recentOrdersResult.error) {
      recentOrders = (recentOrdersResult.data ?? []) as RecentOrderRow[];
    }
  }

  const operationStatus = statusLabel(acceptsOrders, readiness?.isReady ?? false);

  return (
    <>
      <PageHeader
        title="Início"
        description="Resumo operacional da loja."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-2 flex justify-end">
          {store ? <DashboardHomeRealtimeSync storeId={store.id} /> : null}
        </div>
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-[0_28px_54px_-40px_rgba(24,24,27,0.58)] backdrop-blur-sm sm:p-6">
          {!store ? (
            <div className="space-y-2 text-left">
              <p className="font-medium text-zinc-800">Nenhuma loja encontrada</p>
              <p className="text-sm text-zinc-600">
                Se você acabou de confirmar o e-mail, o cadastro pode não ter criado a loja. Em desenvolvimento,
                desative a confirmação de e-mail no Supabase para concluir o fluxo em um único passo, ou entre em
                contato para vincular a loja manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100/70 p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Loja</p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">{store.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">Telefone: {store.phone ?? "—"}</p>
                    <p className="mt-1 text-xs text-zinc-500">Conta: {displayName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${operationStatus.badge}`}>
                      {operationStatus.text}
                    </span>
                  </div>
                </div>
              </section>

              {readiness && !readiness.isReady ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Pendências operacionais</p>
                  <p className="mt-1 text-xs text-amber-800">Resolva estes pontos para liberar pedidos e manter a operação estável.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {readiness.pendingItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Visão operacional</h2>
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Catálogo e estoque</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Categorias ativas</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{activeCategories}</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Produtos aptos para compra</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{purchasableProducts}</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Produtos sem estoque</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{outOfStockProducts}</p>
                        <p className="mt-1 text-xs text-zinc-500">Somente itens com controle ativo.</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Estoque baixo</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{lowStockProducts}</p>
                        <p className="mt-1 text-xs text-zinc-500">Entre 1 e {LOW_STOCK_THRESHOLD} unidades.</p>
                      </article>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Fila operacional</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aguardando aceite</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{waitingOrders}</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Em preparo</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{preparingOrders}</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prontos para retirada</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{readyOrders}</p>
                      </article>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Indicadores do dia</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Finalizados hoje</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums">{finalizedTodayCount}</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vendido hoje</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900">{formatBRL(soldToday)}</p>
                        <p className="mt-1 text-xs text-zinc-500">Somatório de pedidos finalizados no dia.</p>
                      </article>

                      <article className="cx-kpi-card">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ticket médio do dia</p>
                        <p className="mt-2 text-3xl font-semibold leading-none tracking-tight text-zinc-900">{formatBRL(ticketAverageToday)}</p>
                        <p className="mt-1 text-xs text-zinc-500">Baseado em pedidos finalizados hoje.</p>
                      </article>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">Produtos com problema de estoque</h2>
                  <span className="text-xs text-zinc-500">Controle de estoque ativo</span>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Sem estoque</p>
                    {outOfStockProductList.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">Nenhum produto sem estoque.</p>
                    ) : (
                      <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {outOfStockProductList.map((product) => (
                          <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
                            <span className="min-w-0 truncate text-sm text-zinc-800">{product.name}</span>
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 tabular-nums">
                              estoque {product.stock_quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Estoque baixo</p>
                    {lowStockProductList.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">Nenhum produto com estoque baixo.</p>
                    ) : (
                      <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {lowStockProductList.map((product) => (
                          <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
                            <span className="min-w-0 truncate text-sm text-zinc-800">{product.name}</span>
                            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 tabular-nums">
                              estoque {product.stock_quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">Top {TOP_PRODUCTS_LIMIT} produtos mais vendidos hoje</h2>
                  <span className="text-xs text-zinc-500">Pedidos finalizados no dia</span>
                </div>

                {topProducts.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-600">Sem vendas finalizadas no dia para montar o ranking.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {topProducts.map((product, index) => (
                      <li key={`${product.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                          {product.quantity} un.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">Últimos pedidos</h2>
                  <Link href="/dashboard/pedidos?escopo=todos" className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline">
                    Ver todos
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-600">Nenhum pedido registrado até o momento.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {recentOrders.map((order) => (
                      <li key={order.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <Link href="/dashboard/pedidos?escopo=todos" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900">Pedido {formatOrderCode(order)}</p>
                            <p className="text-xs text-zinc-500">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}>
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                            <span className="text-sm font-semibold text-zinc-900">{formatBRL(order.total_amount)}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
