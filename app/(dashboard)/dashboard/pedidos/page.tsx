import { OrderRow } from "@/components/dashboard/order-row";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Order, OrderItem, OrderStatus } from "@/types";
import Link from "next/link";

const AVISOS: Record<string, string> = {
  em_preparo: "Pedido aceito: movido para preparo.",
  recusado: "Pedido recusado.",
  pronto_para_retirada: "Pedido marcado como pronto.",
  finalizado: "Pedido finalizado.",
  "erro-loja": "Não foi possível identificar sua loja.",
  "erro-pedido": "Pedido não encontrado ou sem permissão.",
};

const ACTIVE_STATUSES: OrderStatus[] = ["aguardando_aceite", "em_preparo", "pronto_para_retirada"];
const HISTORICAL_STATUSES: OrderStatus[] = ["finalizado", "recusado"];
const ALL_DASHBOARD_STATUSES: OrderStatus[] = [...ACTIVE_STATUSES, ...HISTORICAL_STATUSES];

type OrdersScopeFilter = "ativos" | "finalizados" | "recusados" | "todos";

const SCOPE_FILTERS: Array<{ value: OrdersScopeFilter; label: string }> = [
  { value: "ativos", label: "Ativos" },
  { value: "finalizados", label: "Finalizados" },
  { value: "recusados", label: "Recusados" },
  { value: "todos", label: "Todos" },
];

const SCOPE_LABELS: Record<OrdersScopeFilter, string> = {
  ativos: "fila operacional",
  finalizados: "historico de finalizados",
  recusados: "historico de recusados",
  todos: "visao geral",
};

function EmptyOrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21 6 19.5 4 21V5a2 2 0 0 1 2-2Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function parseScopeFilter(value: string | undefined): OrdersScopeFilter {
  if (value === "finalizados" || value === "recusados" || value === "todos") {
    return value;
  }
  return "ativos";
}

function statusesForScope(scope: OrdersScopeFilter): OrderStatus[] {
  if (scope === "finalizados") return ["finalizado"];
  if (scope === "recusados") return ["recusado"];
  if (scope === "todos") return ALL_DASHBOARD_STATUSES;
  return ACTIVE_STATUSES;
}

type OrderableQuery<T> = {
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T;
};

function applyScopeOrdering<T extends OrderableQuery<T>>(query: T, scope: OrdersScopeFilter) {
  if (scope === "ativos") {
    return query.order("placed_at", { ascending: true, nullsFirst: true }).order("created_at", { ascending: true });
  }

  if (scope === "finalizados") {
    return query
      .order("finalized_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  if (scope === "recusados") {
    return query
      .order("rejected_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  return query.order("created_at", { ascending: false }).order("placed_at", { ascending: false });
}

type PageProps = {
  searchParams: Promise<{ aviso?: string; erro?: string; escopo?: string }>;
};

type DashboardOrder = Order & {
  order_items?: Array<Pick<OrderItem, "name" | "quantity">> | null;
};

export default async function DashboardOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase, store } = await getUserStore();
  const selectedScope = parseScopeFilter(params.escopo);
  const selectedStatuses = statusesForScope(selectedScope);

  let orders: DashboardOrder[] = [];
  let loadError: string | null = null;
  let itemsUnavailable = false;

  if (store) {
    const baseSelect =
      "id, store_id, order_number, display_code, status, refund_status, total_amount, note, customer_name, customer_phone, placed_at, accepted_at, ready_at, finalized_at, rejected_at, created_at, updated_at";

    const withItemsQuery = applyScopeOrdering(
      supabase
      .from("orders")
      .select(`${baseSelect}, order_items(name, quantity)`)
      .eq("store_id", store.id)
      .in("status", selectedStatuses),
      selectedScope,
    ).limit(50);

    const withItemsResult = await withItemsQuery;

    if (withItemsResult.error) {
      const fallbackQuery = applyScopeOrdering(
        supabase
        .from("orders")
        .select(baseSelect)
        .eq("store_id", store.id)
        .in("status", selectedStatuses),
        selectedScope,
      ).limit(50);

      const fallbackResult = await fallbackQuery;

      if (fallbackResult.error) {
        loadError = fallbackResult.error.message;
      } else {
        orders = (fallbackResult.data ?? []) as DashboardOrder[];
        itemsUnavailable = true;
      }
    } else {
      orders = (withItemsResult.data ?? []) as DashboardOrder[];
    }
  }

  const avisoText = params.aviso ? AVISOS[params.aviso] : null;
  const erroText = params.erro ? decodeURIComponent(params.erro) : null;
  const selectedScopeLabel = SCOPE_LABELS[selectedScope];
  const isOperationalView = selectedScope === "ativos";

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={isOperationalView ? "Fila operacional de pedidos em andamento." : "Consulta de pedidos no histórico."}
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        bottomContent={
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Escopo atual: {selectedScopeLabel}.</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SCOPE_FILTERS.map((filter) => {
                const isActive = filter.value === selectedScope;
                const href =
                  filter.value === "ativos"
                    ? "/dashboard/pedidos"
                    : `/dashboard/pedidos?escopo=${encodeURIComponent(filter.value)}`;

                return (
                  <Link
                    key={filter.value}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`${isActive ? "cx-chip-active" : "cx-chip"} px-3.5 py-1.5`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {erroText ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
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
        {itemsUnavailable ? (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            Itens do pedido nao estao acessiveis nesta consulta. Exibindo apenas os dados gerais.
          </p>
        ) : null}

        {!store ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar pedidos.
          </div>
        ) : (
          <div className="space-y-4">
            {loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-red-900">Erro ao carregar pedidos</h2>
                <p className="mt-2 text-sm text-red-800">
                  Nao foi possivel buscar os pedidos agora. Atualize a pagina para tentar novamente.
                </p>
                <p className="mt-2 text-xs text-red-700">Detalhe técnico: {loadError}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/80 p-4 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
                    <EmptyOrdersIcon />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-zinc-800">Nenhum pedido em {selectedScopeLabel}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {isOperationalView
                        ? "Quando novos pedidos entrarem, eles aparecerão automaticamente nesta fila."
                        : "Altere o escopo acima para consultar outro conjunto de pedidos."}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Dica: mantenha esta tela aberta durante a operação para acompanhar entradas em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {isOperationalView ? "Pedidos em andamento" : "Historico de pedidos"}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {orders.length} pedido(s) em {selectedScopeLabel}. Exibindo ate 50 registros.
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {orders.map((order) => (
                    <OrderRow key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
