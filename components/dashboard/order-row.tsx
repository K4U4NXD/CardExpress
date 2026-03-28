"use client";

import {
  acceptOrderAction,
  finalizeOrderAction,
  markReadyAction,
  rejectOrderAction,
} from "@/app/actions/orders";
import {
  formatOrderCode,
  formatDateTime,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/orders/presenter";
import { formatBRL } from "@/lib/validation/price";
import type { Order } from "@/types";

type OrderRowProps = {
  order: Order;
  isLast: boolean;
};

export function OrderRow({ order, isLast }: OrderRowProps) {
  const statusBadge = ORDER_STATUS_BADGE[order.status];
  const statusLabel = ORDER_STATUS_LABELS[order.status];
  const refundLabel = REFUND_STATUS_LABELS[order.refund_status];

  const canAccept = order.status === "aguardando_aceite";
  const canReject = order.status === "aguardando_aceite";
  const canMarkReady = order.status === "em_preparo";
  const canFinalize = order.status === "pronto_para_retirada";

  return (
    <div className={`flex flex-col gap-3 border-b border-zinc-100 py-4 ${isLast ? "border-b-0" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-zinc-900">{formatOrderCode(order)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
            {order.refund_status && order.refund_status !== "none" ? (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-900">
                Reembolso: {refundLabel}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-700">Total: {formatBRL(order.total_amount)}</p>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
            <span>Recebido: {formatDateTime(order.placed_at)}</span>
            {order.accepted_at ? <span>Aceito: {formatDateTime(order.accepted_at)}</span> : null}
            {order.ready_at ? <span>Pronto: {formatDateTime(order.ready_at)}</span> : null}
            {order.finalized_at ? <span>Finalizado: {formatDateTime(order.finalized_at)}</span> : null}
            {order.rejected_at ? <span>Recusado: {formatDateTime(order.rejected_at)}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={acceptOrderAction} className="inline">
            <input type="hidden" name="order_id" value={order.id} />
            <button
              type="submit"
              disabled={!canAccept}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aceitar
            </button>
          </form>

          <form action={rejectOrderAction} className="inline">
            <input type="hidden" name="order_id" value={order.id} />
            <button
              type="submit"
              disabled={!canReject}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Recusar
            </button>
          </form>

          <form action={markReadyAction} className="inline">
            <input type="hidden" name="order_id" value={order.id} />
            <button
              type="submit"
              disabled={!canMarkReady}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Marcar pronto
            </button>
          </form>

          <form action={finalizeOrderAction} className="inline">
            <input type="hidden" name="order_id" value={order.id} />
            <button
              type="submit"
              disabled={!canFinalize}
              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
