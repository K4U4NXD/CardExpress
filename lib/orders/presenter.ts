import type { Order, OrderStatus, RefundStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  aguardando_aceite: "Aguardando aceite",
  em_preparo: "Em preparo",
  pronto_para_retirada: "Pronto para retirada",
  finalizado: "Finalizado",
  recusado: "Recusado",
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  aguardando_aceite: "bg-amber-100 text-amber-900",
  em_preparo: "bg-sky-100 text-sky-900",
  pronto_para_retirada: "bg-emerald-100 text-emerald-800",
  finalizado: "bg-zinc-200 text-zinc-700",
  recusado: "bg-rose-100 text-rose-800",
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
