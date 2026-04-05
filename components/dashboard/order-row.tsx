"use client";

import {
  acceptOrderAction,
  finalizeOrderAction,
  markReadyAction,
  rejectOrderAction,
} from "@/app/actions/orders";
import {
  formatOrderCode,
  formatCustomerPhone,
  formatDateTime,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/orders/presenter";
import { formatBRL } from "@/lib/validation/price";
import type { Order, OrderItem } from "@/types";
import { useState } from "react";
import { useFormStatus } from "react-dom";

type OrderItemSummary = Pick<OrderItem, "name" | "quantity">;

type DashboardOrder = Order & {
  order_items?: OrderItemSummary[] | null;
};

type OrderRowProps = {
  order: DashboardOrder;
  isLast: boolean;
};

type ActionButtonProps = {
  label: string;
  className: string;
};

type OrderAction = {
  key: "accept" | "reject" | "ready" | "finalize";
  label: string;
  action: (formData: FormData) => Promise<void>;
  className: string;
};

function ActionButton({ label, className }: ActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {pending ? "Processando..." : label}
    </button>
  );
}

export function OrderRow({ order, isLast }: OrderRowProps) {
  const statusBadge = ORDER_STATUS_BADGE[order.status];
  const statusLabel = ORDER_STATUS_LABELS[order.status];
  const refundLabel = REFUND_STATUS_LABELS[order.refund_status];
  const items = order.order_items ?? [];
  const isOperationalOrder =
    order.status === "aguardando_aceite" || order.status === "em_preparo" || order.status === "pronto_para_retirada";
  const defaultItemsExpanded = isOperationalOrder || items.length === 0;
  const [itemsExpanded, setItemsExpanded] = useState(defaultItemsExpanded);

  const actionsByStatus: Record<Order["status"], OrderAction[]> = {
    aguardando_aceite: [
      {
        key: "accept",
        label: "Aceitar",
        action: acceptOrderAction,
        className:
          "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50",
      },
      {
        key: "reject",
        label: "Recusar",
        action: rejectOrderAction,
        className:
          "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50",
      },
    ],
    em_preparo: [
      {
        key: "ready",
        label: "Marcar pronto",
        action: markReadyAction,
        className:
          "rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50",
      },
    ],
    pronto_para_retirada: [
      {
        key: "finalize",
        label: "Finalizar",
        action: finalizeOrderAction,
        className:
          "rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-50",
      },
    ],
    finalizado: [],
    recusado: [],
  };

  const actions = actionsByStatus[order.status];

  const timeline: Array<{ label: string; value: string | null | undefined; always?: boolean }> = [
    { label: "Recebido", value: order.placed_at, always: true },
    { label: "Aceito", value: order.accepted_at },
    { label: "Pronto", value: order.ready_at },
    { label: "Finalizado", value: order.finalized_at },
    { label: "Recusado", value: order.rejected_at },
    { label: "Atualizado", value: order.updated_at, always: true },
  ];

  return (
    <div className={`flex flex-col gap-3 border-b border-zinc-100 py-4 ${isLast ? "border-b-0" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-zinc-900">{formatOrderCode(order)}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
            {order.refund_status && order.refund_status !== "none" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                Reembolso: {refundLabel}
              </span>
            ) : null}
          </div>

          <div className="grid gap-1 text-sm text-zinc-700 sm:grid-cols-2">
            <p>
              <span className="text-zinc-500">Cliente:</span> {order.customer_name?.trim() || "Não informado"}
            </p>
            <p>
              <span className="text-zinc-500">Telefone:</span> {formatCustomerPhone(order.customer_phone)}
            </p>
            <p>
              <span className="text-zinc-500">Total:</span>{" "}
              <span className="font-semibold text-zinc-800">{formatBRL(order.total_amount)}</span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Itens do pedido {items.length > 0 ? `(${items.length})` : ""}
              </p>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setItemsExpanded((expanded) => !expanded)}
                  className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                >
                  {itemsExpanded ? "Ocultar itens" : "Ver itens"}
                </button>
              ) : null}
            </div>

            {itemsExpanded ? (
              items.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                  {items.map((item, idx) => (
                    <li key={`${item.name}-${idx}`} className="flex gap-2">
                      <span className="font-semibold text-zinc-700">{Math.max(1, Math.floor(item.quantity))}x</span>
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Itens nao disponiveis nesta visualizacao.</p>
              )
            ) : null}
          </div>

          {order.note ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              Observação geral: {order.note}
            </p>
          ) : null}

          <p className="text-[11px] text-zinc-500" title={order.id}>
            ID completo: {order.id}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
            {timeline
              .filter((item) => item.always || item.value)
              .map((item) => (
                <span key={item.label}>
                  {item.label}: {formatDateTime(item.value)}
                </span>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.length === 0 ? (
            <p className="text-xs text-zinc-500">Sem ações disponíveis para este status.</p>
          ) : (
            actions.map((actionItem) => (
              <form key={actionItem.key} action={actionItem.action} className="inline">
                <input type="hidden" name="order_id" value={order.id} />
                <ActionButton label={actionItem.label} className={actionItem.className} />
              </form>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
