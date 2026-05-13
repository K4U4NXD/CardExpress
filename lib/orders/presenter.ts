import type { Order, OrderStatus, RefundStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  aguardando_aceite: "Aguardando aceite",
  em_preparo: "Em preparo",
  pronto_para_retirada: "Pronto para retirada",
  finalizado: "Finalizado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  aguardando_aceite: "border border-amber-300 bg-amber-50 text-amber-900",
  em_preparo: "border border-indigo-200 bg-indigo-50 text-indigo-800",
  pronto_para_retirada: "border border-teal-300 bg-teal-50 text-teal-800",
  finalizado: "border border-zinc-300 bg-zinc-100 text-zinc-700",
  recusado: "border border-red-200 bg-red-50 text-red-800",
  cancelado: "border border-orange-200 bg-orange-50 text-orange-800",
};

export const ORDER_STATUS_ACCENT: Record<OrderStatus, string> = {
  aguardando_aceite: "border-l-amber-400",
  em_preparo: "border-l-indigo-400",
  pronto_para_retirada: "border-l-teal-400",
  finalizado: "border-l-zinc-300",
  recusado: "border-l-red-300",
  cancelado: "border-l-orange-300",
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  none: "Sem reembolso",
  pendente: "Reembolso pendente",
  reembolsado: "Reembolso concluído",
  falhou: "Reembolso falhou",
};

/** Código curto exibível: usa display_code (já formatado no banco) ou o order_number com padding. */
export function formatOrderCode(order: Pick<Order, "id"> & { display_code?: string | null; order_number?: number | null }) {
  if (order.display_code) return order.display_code;
  if (order.order_number !== null && order.order_number !== undefined) {
    return String(order.order_number).padStart(4, "0");
  }
  return order.id.slice(0, 6);
}

/** Data curta com horário no fuso do servidor. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Telefone de cliente no padrão brasileiro quando possível. */
export function formatCustomerPhone(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "Não informado";

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return raw;
}
