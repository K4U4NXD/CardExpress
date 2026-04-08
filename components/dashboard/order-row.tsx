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

export function OrderRow({ order }: OrderRowProps) {
  const statusBadge = ORDER_STATUS_BADGE[order.status];
  const statusLabel = ORDER_STATUS_LABELS[order.status];
  const refundLabel = REFUND_STATUS_LABELS[order.refund_status];
  const items = order.order_items ?? [];
  const isOperationalOrder =
    order.status === "aguardando_aceite" || order.status === "em_preparo" || order.status === "pronto_para_retirada";
  const defaultItemsExpanded = isOperationalOrder || items.length === 0;
  const [itemsExpanded, setItemsExpanded] = useState(defaultItemsExpanded);
  const accentClassByStatus: Record<Order["status"], string> = {
    aguardando_aceite: "border-l-amber-400",
    em_preparo: "border-l-sky-400",
    pronto_para_retirada: "border-l-emerald-400",
    finalizado: "border-l-zinc-300",
    recusado: "border-l-rose-300",
  };

  const actionsByStatus: Record<Order["status"], OrderAction[]> = {
    aguardando_aceite: [
      {
        key: "accept",
        label: "Aceitar",
        action: acceptOrderAction,
        className: "cx-btn-secondary px-3 py-2",
      },
      {
        key: "reject",
        label: "Recusar",
        action: rejectOrderAction,
        className:
          "rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50",
      },
    ],
    em_preparo: [
      {
        key: "ready",
        label: "Marcar pronto",
        action: markReadyAction,
        className:
          "rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50",
      },
    ],
    pronto_para_retirada: [
      {
        key: "finalize",
        label: "Finalizar",
        action: finalizeOrderAction,
        className:
          "rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-50",
      },
    ],
    finalizado: [],
    recusado: [],
  };

  const actions = actionsByStatus[order.status];
  const accentClass = accentClassByStatus[order.status];

  const timeline: Array<{ label: string; value: string | null | undefined; always?: boolean }> = [
    { label: "Recebido", value: order.placed_at, always: true },
    { label: "Aceito", value: order.accepted_at },
    { label: "Pronto", value: order.ready_at },
    { label: "Finalizado", value: order.finalized_at },
    { label: "Recusado", value: order.rejected_at },
    { label: "Atualizado", value: order.updated_at, always: true },
  ];

  return (
    <article className={`rounded-2xl border border-zinc-200 border-l-4 ${accentClass} bg-white p-4 shadow-[0_18px_36px_-30px_rgba(24,24,27,0.4)] sm:p-5`}>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-sm font-semibold text-white">
                {formatOrderCode(order)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
              {order.refund_status && order.refund_status !== "none" ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  Reembolso: {refundLabel}
                </span>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cliente</p>
                <p className="text-sm font-medium text-zinc-800">{order.customer_name?.trim() || "Nao informado"}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Telefone</p>
                <p className="text-sm font-medium text-zinc-800">{formatCustomerPhone(order.customer_phone)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total</p>
                <p className="text-sm font-semibold text-zinc-900">{formatBRL(order.total_amount)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-2">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {actions.length === 0 ? (
                <p className="px-1 text-xs text-zinc-500">Sem acoes disponiveis para este status.</p>
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

        <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Itens do pedido {items.length > 0 ? `(${items.length})` : ""}
            </p>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => setItemsExpanded((expanded) => !expanded)}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {itemsExpanded ? "Ocultar itens" : "Ver itens"}
              </button>
            ) : null}
          </div>

          {itemsExpanded ? (
            items.length > 0 ? (
              <ul className="mt-2 divide-y divide-zinc-200 text-sm text-zinc-800">
                {items.map((item, idx) => (
                  <li key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate">{item.name}</span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {Math.max(1, Math.floor(item.quantity))}x
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Itens nao disponiveis nesta visualizacao.</p>
            )
          ) : null}
        </section>

        {order.note ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Observacao</p>
            <p className="mt-1 text-sm text-amber-900">{order.note}</p>
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Linha do tempo</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {timeline
              .filter((item) => item.always || item.value)
              .map((item) => (
                <span key={item.label} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
                  <span className="font-semibold text-zinc-600">{item.label}:</span> {formatDateTime(item.value)}
                </span>
              ))}
          </div>
        </section>

        <p className="text-[11px] text-zinc-500" title={order.id}>
          ID completo: {order.id}
        </p>
      </div>
    </article>
  );
}
