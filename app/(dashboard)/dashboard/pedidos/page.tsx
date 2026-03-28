import { OrderRow } from "@/components/dashboard/order-row";
import { PageHeader } from "@/components/layout/page-header";
import { getUserStore } from "@/lib/auth/store";
import type { Order, OrderStatus } from "@/types";

const AVISOS: Record<string, string> = {
  em_preparo: "Pedido aceito: movido para preparo.",
  recusado: "Pedido recusado.",
  pronto_para_retirada: "Pedido marcado como pronto.",
  finalizado: "Pedido finalizado.",
  "erro-loja": "Não foi possível identificar sua loja.",
  "erro-pedido": "Pedido não encontrado ou sem permissão.",
};

const DASHBOARD_STATUSES: OrderStatus[] = [
  "aguardando_aceite",
  "em_preparo",
  "pronto_para_retirada",
  "recusado",
];

type PageProps = {
  searchParams: Promise<{ aviso?: string; erro?: string }>;
};

export default async function DashboardOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { supabase, store } = await getUserStore();

  let orders: Order[] = [];
  let loadError: string | null = null;

  if (store) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, store_id, order_number, display_code, status, refund_status, total_amount, note, customer_name, customer_phone, placed_at, accepted_at, ready_at, finalized_at, rejected_at, created_at, updated_at"
      )
      .eq("store_id", store.id)
      .in("status", DASHBOARD_STATUSES)
      .order("placed_at", { ascending: false })
      .limit(50);

    if (error) {
      loadError = error.message;
    }
    orders = (data ?? []) as Order[];
  }

  const avisoText = params.aviso ? AVISOS[params.aviso] : null;
  const erroText = params.erro ? decodeURIComponent(params.erro) : loadError;

  return (
    <>
      <PageHeader title="Pedidos" description="Fila de pedidos ativos e prontos para retirada." />

      <div className="mx-auto max-w-4xl px-6 py-8">
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

        {!store ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de gerenciar pedidos.
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-600">Nenhum pedido ativo no momento.</p>
            <p className="mt-2 text-xs text-zinc-500">Novos pedidos aparecerão aqui após pagamento aprovado.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Pedidos em andamento</h2>
              <p className="text-xs text-zinc-500">Mostrando até 50 mais recentes.</p>
            </div>
            <div className="mt-3">
              {orders.map((order, idx) => (
                <OrderRow key={order.id} order={order} isLast={idx === orders.length - 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
