import { PageHeader } from "@/components/layout/page-header";
import {
  formatOrderCode,
  formatDateTime,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/orders/presenter";
import { PublicOrderRealtimeSync } from "@/components/public/public-order-realtime-sync";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/validation/price";
import type { OrderStatus, RefundStatus } from "@/types";
import { notFound } from "next/navigation";

type OrderStatusPageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
};

type PublicOrderRow = {
  id: string;
  display_code: string | null;
  status: OrderStatus;
  refund_status: RefundStatus;
  customer_name: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  finalized_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  total_amount: number;
  note: string | null;
};

export default async function OrderStatusPage({ params, searchParams }: OrderStatusPageProps) {
  const [{ slug, id }, search] = await Promise.all([params, searchParams]);
  const token = String(search?.token ?? "").trim();
  if (!token) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const [storeResult, orderResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .rpc("get_public_order", { p_slug: slug, p_order_id: id, p_public_token: token })
      .maybeSingle<PublicOrderRow>(),
  ]);

  if (storeResult.error || !storeResult.data) {
    notFound();
  }

  if (orderResult.error || !orderResult.data) {
    notFound();
  }

  const store = storeResult.data;
  const order = orderResult.data;

  const statusLabel = ORDER_STATUS_LABELS[order.status];
  const statusBadge = ORDER_STATUS_BADGE[order.status];
  const refundLabel = REFUND_STATUS_LABELS[order.refund_status];
  const isTerminalStatus = order.status === "finalizado" || order.status === "recusado" || order.status === "cancelado";

  return (
    <>
      <PageHeader
        title={`Pedido ${formatOrderCode(order)}`}
        description={`Acompanhe o status do pedido no estabelecimento ${store.name}.`}
        backHref={`/${store.slug}`}
        backLabel="Voltar ao cardápio"
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white/96 p-6 shadow-[0_24px_46px_-34px_rgba(24,24,27,0.55)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-zinc-900">{formatOrderCode(order)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
            {order.refund_status && order.refund_status !== "none" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                Reembolso: {refundLabel}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs text-zinc-500">Use esta tela para acompanhar atualizacoes automaticas do pedido.</p>
          <PublicOrderRealtimeSync
            orderId={order.id}
            publicToken={token}
            enabled={!isTerminalStatus}
            className="mt-1"
          />

          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p>Total: {formatBRL(order.total_amount)}</p>
            {order.note ? <p>Observações: {order.note}</p> : null}
            {order.customer_name ? <p>Cliente: {order.customer_name}</p> : null}
          </div>

          <div className="mt-6 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Linha do tempo</p>
            <p>
              Recebido: <span className="text-zinc-900">{formatDateTime(order.placed_at)}</span>
            </p>
            <p>
              Aceito: <span className="text-zinc-900">{formatDateTime(order.accepted_at)}</span>
            </p>
            <p>
              Pronto para retirada: <span className="text-zinc-900">{formatDateTime(order.ready_at)}</span>
            </p>
            <p>
              Finalizado: <span className="text-zinc-900">{formatDateTime(order.finalized_at)}</span>
            </p>
            <p>
              Recusado: <span className="text-zinc-900">{formatDateTime(order.rejected_at)}</span>
            </p>
            <p>
              Cancelado: <span className="text-zinc-900">{formatDateTime(order.cancelled_at)}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
