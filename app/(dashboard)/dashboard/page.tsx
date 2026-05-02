import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  DashboardIndicatorsPanel,
  type DashboardIndicatorPeriodData,
} from "@/components/dashboard/dashboard-indicators-panel";
import { DashboardHomeRealtimeSync } from "@/components/dashboard/dashboard-home-realtime-sync";
import { PageHeader } from "@/components/layout/page-header";
import { extractPendingSignupData } from "@/lib/auth/onboarding";
import { formatDateTime, formatOrderCode, ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from "@/lib/orders/presenter";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateStoreReadiness } from "@/lib/store-readiness";
import {
  formatDateShortInSaoPaulo,
  formatDateTimeShortInSaoPaulo,
  formatTimeShortInSaoPaulo,
  getCurrentServicePeriodRangeInSaoPaulo,
  getCurrentWeekRangeInSaoPaulo,
  getTodayRangeInSaoPaulo,
  isWithinServiceHoursInSaoPaulo,
} from "@/lib/timezone";
import { formatBRL } from "@/lib/validation/price";
import type { OrderStatus } from "@/types";

const LOW_STOCK_THRESHOLD = 5;
const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

export const metadata: Metadata = {
  title: "Dashboard",
};

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

type StockAlertProductRow = {
  id: string;
  name: string;
  stock_quantity: number | string | null;
};

type ManualOperationalPeriodRow = {
  opened_at: string;
  closed_at: string | null;
};

type DashboardHomePageProps = {
  searchParams: Promise<{
    signup?: string;
  }>;
};

type IndicatorRangeSelection = {
  startIso: string;
  endIso: string;
};

function formatTimeToHHMM(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

function buildTopProducts(orders: TopProductOrderRow[]) {
  const topProductMap = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const itemName = (item.name ?? "").trim();
      if (!itemName) continue;
      const current = topProductMap.get(itemName) ?? 0;
      topProductMap.set(itemName, current + Math.max(1, Math.floor(Number(item.quantity) || 0)));
    }
  }

  return [...topProductMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, TOP_PRODUCTS_LIMIT)
    .map(([name, quantity]) => ({ name, quantity }));
}

function toStockQuantity(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTodayDescription(startIso: string, endIso: string) {
  const endDisplay = new Date(new Date(endIso).getTime() - 60 * 1000);
  return `Hoje, ${formatDateShortInSaoPaulo(startIso)}, das ${formatTimeShortInSaoPaulo(startIso)} às ${formatTimeShortInSaoPaulo(endDisplay)}.`;
}

function formatWeekDescription(startIso: string, endIso: string) {
  const endDisplay = new Date(new Date(endIso).getTime() - 24 * 60 * 60 * 1000);
  return `Semana atual: ${formatDateShortInSaoPaulo(startIso)} a ${formatDateShortInSaoPaulo(endDisplay)}.`;
}

async function loadIndicatorMetrics(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  storeId: string,
  range: IndicatorRangeSelection,
): Promise<NonNullable<DashboardIndicatorPeriodData["metrics"]>> {
  const [salesResult, topProductsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount")
      .eq("store_id", storeId)
      .eq("status", "finalizado" satisfies OrderStatus)
      .gte("finalized_at", range.startIso)
      .lt("finalized_at", range.endIso),
    supabase
      .from("orders")
      .select("id, order_items(name, quantity)")
      .eq("store_id", storeId)
      .eq("status", "finalizado" satisfies OrderStatus)
      .gte("finalized_at", range.startIso)
      .lt("finalized_at", range.endIso),
  ]);

  const salesRows = (salesResult.data ?? []) as OrderTotalRow[];
  const finalizedCount = salesRows.length;
  const soldAmount = salesRows.reduce((acc, row) => acc + Number(row.total_amount ?? 0), 0);

  return {
    finalizedCount,
    soldAmount,
    averageTicket: finalizedCount > 0 ? soldAmount / finalizedCount : 0,
    topProducts: topProductsResult.error ? [] : buildTopProducts((topProductsResult.data ?? []) as TopProductOrderRow[]),
  };
}

function resolveOperationStatus({
  readinessOk,
  acceptsOrdersManual,
  autoScheduleEnabled,
  withinServiceHours,
  effectiveAcceptsOrders,
}: {
  readinessOk: boolean;
  acceptsOrdersManual: boolean;
  autoScheduleEnabled: boolean;
  withinServiceHours: boolean;
  effectiveAcceptsOrders: boolean;
}) {
  if (!readinessOk) {
    return { text: "Com pendências", badge: "bg-amber-100 text-amber-900" };
  }

  if (!acceptsOrdersManual) {
    return { text: "Loja offline", badge: "bg-zinc-200 text-zinc-700" };
  }

  if (autoScheduleEnabled && !withinServiceHours) {
    return { text: "Fora do horário", badge: "bg-amber-100 text-amber-900" };
  }

  if (autoScheduleEnabled && effectiveAcceptsOrders) {
    return { text: "Horário automático", badge: "bg-emerald-100 text-emerald-900" };
  }

  if (effectiveAcceptsOrders) {
    return { text: "Aberta manualmente", badge: "bg-emerald-100 text-emerald-900" };
  }

  return { text: "Loja offline", badge: "bg-zinc-200 text-zinc-700" };
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const { signup } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, phone")
    .eq("owner_id", user.id)
    .maybeSingle();

  const pendingSignup = extractPendingSignupData(user);

  if (!store && pendingSignup) {
    redirect("/dashboard/finalizar-cadastro");
  }

  const showSignupSuccess = signup === "email-confirmed" && Boolean(store);
  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Comerciante";

  let readiness = null as Awaited<ReturnType<typeof calculateStoreReadiness>> | null;
  let activeCategories = 0;
  let purchasableProducts = 0;
  let waitingOrders = 0;
  let preparingOrders = 0;
  let readyOrders = 0;
  let outOfStockProducts = 0;
  let lowStockProducts = 0;
  let outOfStockProductAlerts: StockAlertProductRow[] = [];
  let lowStockProductAlerts: StockAlertProductRow[] = [];
  let recentOrders: RecentOrderRow[] = [];

  let acceptsOrdersManual = true;
  let autoScheduleEnabled = false;
  let openingTime: string | null = null;
  let closingTime: string | null = null;
  let withinServiceHours = true;
  let effectiveAcceptsOrders = true;

  let indicatorPeriods: DashboardIndicatorPeriodData[] = [
    {
      key: "today",
      label: "Hoje",
      description: "Hoje, carregando período atual.",
      emptySalesMessage: "Sem pedidos finalizados hoje.",
      emptyTopMessage: "Sem vendas finalizadas hoje para montar o ranking.",
      metrics: { finalizedCount: 0, soldAmount: 0, averageTicket: 0, topProducts: [] },
    },
    {
      key: "week",
      label: "Semana atual",
      description: "Semana atual em carregamento.",
      emptySalesMessage: "Sem pedidos finalizados nesta semana.",
      emptyTopMessage: "Sem vendas finalizadas nesta semana para montar o ranking.",
      metrics: { finalizedCount: 0, soldAmount: 0, averageTicket: 0, topProducts: [] },
    },
    {
      key: "service",
      label: "Período operacional",
      description: "Período operacional atual da loja.",
      emptySalesMessage: "Sem pedidos finalizados no período operacional.",
      emptyTopMessage: "Sem vendas finalizadas no período operacional para montar o ranking.",
      unavailableMessage: "Abra a loja manualmente ou configure o horário automático para usar este filtro.",
    },
  ];

  if (store) {
    const [
      settingsResult,
      readinessResult,
      activeCategoriesResult,
      waitingOrdersResult,
      preparingOrdersResult,
      readyOrdersResult,
      outOfStockProductsResult,
      lowStockProductsResult,
      manualOperationalPeriodResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase
        .from("store_settings")
        .select("accepts_orders, auto_accept_orders_by_schedule, opening_time, closing_time")
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
        .from("products")
        .select("id, name, stock_quantity", { count: "exact" })
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .is("archived_at", null)
        .lte("stock_quantity", 0)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, stock_quantity", { count: "exact" })
        .eq("store_id", store.id)
        .eq("track_stock", true)
        .is("archived_at", null)
        .gt("stock_quantity", 0)
        .lte("stock_quantity", LOW_STOCK_THRESHOLD)
        .order("stock_quantity", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("store_operational_periods")
        .select("opened_at, closed_at")
        .eq("store_id", store.id)
        .eq("mode", "manual")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id, display_code, order_number, status, total_amount, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(RECENT_ORDERS_LIMIT),
    ]);

    acceptsOrdersManual = settingsResult.data?.accepts_orders ?? true;
    autoScheduleEnabled = settingsResult.data?.auto_accept_orders_by_schedule ?? false;
    openingTime = formatTimeToHHMM(settingsResult.data?.opening_time);
    closingTime = formatTimeToHHMM(settingsResult.data?.closing_time);
    withinServiceHours = autoScheduleEnabled
      ? isWithinServiceHoursInSaoPaulo(openingTime, closingTime, new Date()) === true
      : true;
    effectiveAcceptsOrders = acceptsOrdersManual && withinServiceHours;

    readiness = readinessResult;
    activeCategories = activeCategoriesResult.count ?? 0;
    purchasableProducts = readinessResult?.activeAvailableProducts ?? 0;
    waitingOrders = waitingOrdersResult.count ?? 0;
    preparingOrders = preparingOrdersResult.count ?? 0;
    readyOrders = readyOrdersResult.count ?? 0;
    outOfStockProducts = outOfStockProductsResult.count ?? 0;
    lowStockProducts = lowStockProductsResult.count ?? 0;
    outOfStockProductAlerts = (outOfStockProductsResult.data ?? []) as StockAlertProductRow[];
    lowStockProductAlerts = (lowStockProductsResult.data ?? []) as StockAlertProductRow[];

    if (!recentOrdersResult.error) {
      recentOrders = (recentOrdersResult.data ?? []) as RecentOrderRow[];
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { startOfTodayIso, startOfTomorrowIso } = getTodayRangeInSaoPaulo(now);
    const { startOfWeekIso, startOfNextWeekIso } = getCurrentWeekRangeInSaoPaulo(now);
    const currentServiceRange = getCurrentServicePeriodRangeInSaoPaulo(openingTime, closingTime, now);
    const manualOperationalPeriod = manualOperationalPeriodResult.data as ManualOperationalPeriodRow | null;

    const todayRange = { startIso: startOfTodayIso, endIso: startOfTomorrowIso };
    const weekRange = { startIso: startOfWeekIso, endIso: startOfNextWeekIso };

    const [todayMetrics, weekMetrics] = await Promise.all([
      loadIndicatorMetrics(supabase, store.id, todayRange),
      loadIndicatorMetrics(supabase, store.id, weekRange),
    ]);

    let servicePeriod: DashboardIndicatorPeriodData = {
      key: "service",
      label: "Período operacional",
      description: "Período operacional atual da loja.",
      emptySalesMessage: "Sem pedidos finalizados no período operacional.",
      emptyTopMessage: "Sem vendas finalizadas no período operacional para montar o ranking.",
      unavailableMessage: "Abra a loja manualmente ou configure o horário automático para usar este filtro.",
    };

    if (autoScheduleEnabled && currentServiceRange) {
      const serviceMetrics = await loadIndicatorMetrics(supabase, store.id, {
        startIso: currentServiceRange.startIso,
        endIso: currentServiceRange.endIso,
      });
      servicePeriod = {
        key: "service",
        label: "Período operacional",
        description: withinServiceHours
          ? `Período operacional atual: desde ${formatDateTimeShortInSaoPaulo(currentServiceRange.startIso)}.`
          : `Horário programado de hoje: ${currentServiceRange.openingTimeHHMM} às ${currentServiceRange.closingTimeHHMM}.`,
        emptySalesMessage: "Sem pedidos finalizados no período operacional.",
        emptyTopMessage: "Sem vendas finalizadas no período operacional para montar o ranking.",
        metrics: serviceMetrics,
      };
    } else if (manualOperationalPeriod?.opened_at) {
      const manualMetrics = await loadIndicatorMetrics(supabase, store.id, {
        startIso: manualOperationalPeriod.opened_at,
        endIso: manualOperationalPeriod.closed_at ?? nowIso,
      });
      servicePeriod = {
        key: "service",
        label: "Período operacional",
        description: manualOperationalPeriod.closed_at
          ? `Último período manual: ${formatDateTimeShortInSaoPaulo(manualOperationalPeriod.opened_at)} até ${formatDateTimeShortInSaoPaulo(manualOperationalPeriod.closed_at)}.`
          : `Período operacional atual: desde ${formatDateTimeShortInSaoPaulo(manualOperationalPeriod.opened_at)}.`,
        emptySalesMessage: "Sem pedidos finalizados no período operacional.",
        emptyTopMessage: "Sem vendas finalizadas no período operacional para montar o ranking.",
        metrics: manualMetrics,
      };
    }

    indicatorPeriods = [
      {
        key: "today",
        label: "Hoje",
        description: formatTodayDescription(startOfTodayIso, startOfTomorrowIso),
        emptySalesMessage: "Sem pedidos finalizados hoje.",
        emptyTopMessage: "Sem vendas finalizadas hoje para montar o ranking.",
        metrics: todayMetrics,
      },
      {
        key: "week",
        label: "Semana atual",
        description: formatWeekDescription(startOfWeekIso, startOfNextWeekIso),
        emptySalesMessage: "Sem pedidos finalizados nesta semana.",
        emptyTopMessage: "Sem vendas finalizadas nesta semana para montar o ranking.",
        metrics: weekMetrics,
      },
      servicePeriod,
    ];
  }

  const operationStatus = resolveOperationStatus({
    readinessOk: readiness?.isReady ?? false,
    acceptsOrdersManual,
    autoScheduleEnabled,
    withinServiceHours,
    effectiveAcceptsOrders,
  });

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

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
        {showSignupSuccess && store ? (
          <section className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <p className="text-sm font-semibold text-emerald-900">
              E-mail confirmado com sucesso. Sua loja foi criada e já está pronta para configuração.
            </p>
            <div className="mt-3">
              <Link
                href={`/${store.slug}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
              >
                Abrir página pública da loja
              </Link>
            </div>
          </section>
        ) : null}

        <div className="mb-2 flex justify-end">
          {store ? <DashboardHomeRealtimeSync storeId={store.id} /> : null}
        </div>

        <div className="space-y-3 sm:space-y-4 sm:rounded-2xl sm:border sm:border-amber-100/80 sm:bg-white/80 sm:p-6 sm:shadow-[0_28px_54px_-40px_rgba(24,24,27,0.58)] sm:backdrop-blur-sm">
          {!store ? (
            <div className="space-y-2 text-left">
              <p className="font-medium text-zinc-800">Nenhuma loja encontrada</p>
              <p className="text-sm text-zinc-600">
                Não foi possível localizar uma loja vinculada a esta conta. Se você acabou de confirmar o e-mail,
                recarregue a página ou acesse o passo de conclusão do cadastro.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100/70 p-3 shadow-sm sm:rounded-2xl sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Status da loja</p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">{store.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">Telefone: {store.phone ?? "—"}</p>
                    <p className="mt-1 text-xs text-zinc-500">Conta: {displayName}</p>
                    {autoScheduleEnabled && openingTime && closingTime ? (
                      <p className="mt-1 text-xs text-zinc-500">Horário automático: {openingTime} às {closingTime}</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${operationStatus.badge}`}>
                    {operationStatus.text}
                  </span>
                </div>
              </section>

              {readiness && !readiness.isReady ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-amber-900">Pendências operacionais</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Resolva estes pontos para liberar pedidos e manter a operação estável.
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900 sm:text-sm">
                    {readiness.pendingItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <div className="grid gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4">
                  <section className="cx-dashboard-card p-3 sm:p-5">
                    <h2 className="text-sm font-semibold text-zinc-900">Visão operacional</h2>

                    <div className="mt-3 space-y-3">
                      <div className="space-y-2 sm:rounded-xl sm:border sm:border-zinc-200 sm:bg-zinc-50/70 sm:p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Catálogo e estoque</p>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Categorias ativas</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{activeCategories}</p>
                          </article>

                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Produtos aptos</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{purchasableProducts}</p>
                          </article>

                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Sem estoque</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{outOfStockProducts}</p>
                          </article>

                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Estoque baixo</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{lowStockProducts}</p>
                            <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">1 a {LOW_STOCK_THRESHOLD} un.</p>
                          </article>
                        </div>
                      </div>

                      <div className="space-y-2 sm:rounded-xl sm:border sm:border-zinc-200 sm:bg-zinc-50/70 sm:p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Fila operacional</p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Aguardando</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{waitingOrders}</p>
                          </article>

                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Preparo</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{preparingOrders}</p>
                          </article>

                          <article className="cx-kpi-card p-3 sm:p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Prontos</p>
                            <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">{readyOrders}</p>
                          </article>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="cx-dashboard-card p-3 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Alertas de estoque</p>
                        <h2 className="mt-1 text-base font-semibold text-zinc-900">Produtos que pedem atenção</h2>
                      </div>
                      <Link
                        href="/dashboard/produtos"
                        className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                      >
                        Gerenciar produtos
                      </Link>
                    </div>

                    <div className="mt-3 grid gap-2 sm:gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Sem estoque</p>
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                            {outOfStockProducts}
                          </span>
                        </div>
                        {outOfStockProductAlerts.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-600">Nenhum produto sem estoque agora.</p>
                        ) : (
                          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1 sm:max-h-64 lg:max-h-72">
                            {outOfStockProductAlerts.map((product) => (
                              <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 sm:px-3 sm:py-2">
                                <span className="min-w-0 truncate text-xs font-medium text-zinc-900 sm:text-sm">{product.name}</span>
                                <span className="shrink-0 text-xs font-semibold text-red-700">0 un.</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Estoque baixo</p>
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                            {lowStockProducts}
                          </span>
                        </div>
                        {lowStockProductAlerts.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-600">Nenhum produto com estoque baixo agora.</p>
                        ) : (
                          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1 sm:max-h-64 lg:max-h-72">
                            {lowStockProductAlerts.map((product) => (
                              <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 sm:px-3 sm:py-2">
                                <span className="min-w-0 truncate text-xs font-medium text-zinc-900 sm:text-sm">{product.name}</span>
                                <span className="shrink-0 text-xs font-semibold text-amber-800">
                                  {toStockQuantity(product.stock_quantity)} un.
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </section>

                  <DashboardIndicatorsPanel periods={indicatorPeriods} topProductsLimit={TOP_PRODUCTS_LIMIT} />
                </div>

                <section className="cx-dashboard-card p-3 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">Últimos pedidos</h2>
                    <Link
                      href="/dashboard/pedidos?escopo=todos"
                      className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                    >
                      Ver todos
                    </Link>
                  </div>

                  {recentOrders.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">Nenhum pedido registrado até o momento.</p>
                  ) : (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {recentOrders.map((order) => (
                        <li key={order.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:border-zinc-300 hover:bg-white">
                          <Link
                            href={`/dashboard/pedidos?escopo=todos&pedido=${encodeURIComponent(order.id)}`}
                            prefetch
                            className="flex h-full flex-col gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900">Pedido {formatOrderCode(order)}</p>
                              <p className="text-xs text-zinc-500">{formatDateTime(order.created_at)}</p>
                            </div>
                            <div className="flex items-center justify-between gap-2">
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
