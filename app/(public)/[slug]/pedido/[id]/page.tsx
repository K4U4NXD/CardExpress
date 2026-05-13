import { PageHeader } from "@/components/layout/page-header";
import {
  formatOrderCode,
  formatDateTime,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/orders/presenter";
import { PublicOrderRecoveryTools } from "@/components/public/public-order-recovery-tools";
import { PublicOrderRealtimeSync } from "@/components/public/public-order-realtime-sync";
import { PublicOrderStatusAlert } from "@/components/public/public-order-status-alert";
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

/**
 * Acompanhamento público do pedido.
 * O token público é obrigatório para consultar dados do pedido sem autenticar o cliente.
 */
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
  const statusMessage: Record<OrderStatus, string> = {
    aguardando_aceite: "Seu pedido está aguardando aceite.",
    em_preparo: "Seu pedido está em preparo.",
    pronto_para_retirada: "Seu pedido está pronto para retirada.",
    finalizado: "Seu pedido foi finalizado.",
    recusado: "Seu pedido foi recusado.",
    cancelado: "Seu pedido foi cancelado.",
  };
  const statusMessageClass: Record<OrderStatus, string> = {
    aguardando_aceite: "border-amber-200 bg-amber-50 text-amber-950",
    em_preparo: "border-indigo-200 bg-indigo-50 text-indigo-950",
    pronto_para_retirada: "border-teal-200 bg-teal-50 text-teal-950",
    finalizado: "border-zinc-200 bg-zinc-50 text-zinc-800",
    recusado: "border-red-200 bg-red-50 text-red-900",
    cancelado: "border-orange-200 bg-orange-50 text-orange-900",
  };
  const refundLabel = REFUND_STATUS_LABELS[order.refund_status];
  const isTerminalStatus = order.status === "finalizado" || order.status === "recusado" || order.status === "cancelado";
  const timelineEvents = [
    { label: "Recebido", value: order.placed_at },
    { label: "Aceito", value: order.accepted_at },
    { label: "Pronto para retirada", value: order.ready_at },
    { label: "Finalizado", value: order.finalized_at },
    { label: "Recusado", value: order.rejected_at },
    { label: "Cancelado", value: order.cancelled_at },
  ].filter((event) => Boolean(event.value));

  return (
    <div className="cx-public-bg min-h-screen">
      <PageHeader
        title={`Pedido ${formatOrderCode(order)}`}
        description={`Acompanhe o status do pedido no estabelecimento ${store.name}.`}
        backHref={`/${store.slug}`}
        backLabel="Voltar ao cardápio"
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="cx-brand-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Acompanhamento</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-[#171717] sm:text-5xl">{formatOrderCode(order)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
            {order.refund_status && order.refund_status !== "none" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                Reembolso: {refundLabel}
              </span>
            ) : null}
          </div>

          <p className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${statusMessageClass[order.status]}`}>
            {statusMessage[order.status]} Use esta tela para acompanhar atualizações automáticas do pedido.
          </p>
          <PublicOrderStatusAlert orderId={order.id} publicToken={token} status={order.status} />
          <PublicOrderRealtimeSync
            orderId={order.id}
            publicToken={token}
            enabled={!isTerminalStatus}
            className="mt-1"
          />

          <PublicOrderRecoveryTools
            slug={store.slug}
            orderId={order.id}
            publicToken={token}
            status={order.status}
            displayCode={order.display_code}
          />

          <div className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p className="rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total</span>
              <span className="font-semibold text-[#9f1239]">{formatBRL(order.total_amount)}</span>
            </p>
            {order.customer_name ? (
              <p className="rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cliente</span>
                <span className="font-semibold text-zinc-900">{order.customer_name}</span>
              </p>
            ) : null}
            {order.note ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 sm:col-span-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-amber-800">Observações</span>
                <span className="text-amber-900">{order.note}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-3 text-sm text-zinc-700 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9f1239]">Linha do tempo</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {timelineEvents.map((event) => (
                <span key={event.label} className="rounded-lg border border-[#eadfd2] bg-white px-2.5 py-1 text-xs text-zinc-700">
                  <span className="font-semibold text-zinc-600">{event.label}:</span> {formatDateTime(event.value)}
                </span>
              ))}
            </div>
            {!isTerminalStatus ? (
              <p className="mt-2 text-xs text-zinc-500">Aguardando próxima atualização do estabelecimento.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
