"use server";

import { getUserStore } from "@/lib/auth/store";
import { formatPostgrestError } from "@/lib/db-errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrderStatus, RefundStatus } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PATH = "/dashboard/pedidos";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  aguardando_aceite: ["em_preparo", "recusado"],
  em_preparo: ["pronto_para_retirada"],
  pronto_para_retirada: ["finalizado"],
  finalizado: [],
  recusado: [],
  cancelado: [],
};

type MinimalOrder = {
  id: string;
  store_id: string;
  status: OrderStatus;
  display_code: string | null;
  order_number: number | null;
};

function transitionError(current: OrderStatus, next: OrderStatus): string | null {
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    return `Transição não permitida: ${current} → ${next}.`;
  }
  return null;
}

async function loadOwnedOrder(storeId: string, orderId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, store_id, status, display_code, order_number")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    return { order: null, error: formatPostgrestError(error) };
  }

  return { order: data as MinimalOrder | null, error: null };
}

function redirectWithMessage(message: string) {
  redirect(`${PATH}?${message}`);
}

function buildFlashToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function redirectWithNotice(notice: string) {
  redirectWithMessage(`aviso=${encodeURIComponent(notice)}&flash=${buildFlashToken()}`);
}

function revalidateOrderPaths(storeSlug: string, orderId: string) {
  revalidatePath(PATH);
  revalidatePath("/dashboard");
  revalidatePath(`/${storeSlug}`);
  revalidatePath(`/${storeSlug}/painel`);
  revalidatePath(`/${storeSlug}/pedido/${orderId}`);
}

async function transitionOrderToTerminal(orderId: string, targetStatus: "recusado" | "cancelado") {
  const { store } = await getUserStore();
  if (!store) {
    redirectWithMessage("erro=erro-loja");
  }

  const { order, error } = await loadOwnedOrder(store!.id, orderId);
  if (error) {
    redirectWithMessage(`erro=${encodeURIComponent(error)}`);
  }
  if (!order) {
    redirectWithMessage("erro=erro-pedido");
  }

  const supabase = await createServerSupabaseClient();
  const { error: rpcError } = await supabase.rpc("transition_order_to_terminal", {
    p_order_id: order!.id,
    p_target_status: targetStatus,
  });

  if (rpcError) {
    redirectWithMessage(`erro=${encodeURIComponent(formatPostgrestError(rpcError))}`);
  }

  revalidateOrderPaths(store!.slug, order!.id);
  redirectWithNotice(targetStatus);
}

async function performTransition(
  orderId: string,
  targetStatus: OrderStatus,
  options?: { timestampField?: "accepted_at" | "ready_at" | "finalized_at" | "rejected_at"; refundStatus?: RefundStatus }
) {
  const { store } = await getUserStore();
  if (!store) {
    redirectWithMessage("erro=erro-loja");
  }

  const { order, error } = await loadOwnedOrder(store!.id, orderId);
  if (error) {
    redirectWithMessage(`erro=${encodeURIComponent(error)}`);
  }
  if (!order) {
    redirectWithMessage("erro=erro-pedido");
  }

  const tErr = transitionError(order!.status, targetStatus);
  if (tErr) {
    redirectWithMessage(`erro=${encodeURIComponent(tErr)}`);
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: targetStatus,
    updated_at: now,
  };
  if (options?.timestampField) {
    updatePayload[options.timestampField] = now;
  }
  if (options?.refundStatus) {
    updatePayload["refund_status"] = options.refundStatus;
  }

  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", order!.id)
    .eq("store_id", store!.id);

  if (updateError) {
    redirectWithMessage(`erro=${encodeURIComponent(formatPostgrestError(updateError))}`);
  }

  revalidatePath(PATH);
  revalidatePath(`/${store!.slug}/painel`);
  revalidatePath(`/${store!.slug}/pedido/${order!.id}`);
  redirectWithNotice(targetStatus);
}

export async function acceptOrderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) redirectWithMessage("erro=erro-pedido");
  await performTransition(orderId, "em_preparo", { timestampField: "accepted_at" });
}

export async function rejectOrderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) redirectWithMessage("erro=erro-pedido");
  await transitionOrderToTerminal(orderId, "recusado");
}

export async function cancelOrderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) redirectWithMessage("erro=erro-pedido");
  await transitionOrderToTerminal(orderId, "cancelado");
}

export async function markReadyAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) redirectWithMessage("erro=erro-pedido");
  await performTransition(orderId, "pronto_para_retirada", { timestampField: "ready_at" });
}

export async function finalizeOrderAction(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) redirectWithMessage("erro=erro-pedido");
  await performTransition(orderId, "finalizado", { timestampField: "finalized_at" });
}
