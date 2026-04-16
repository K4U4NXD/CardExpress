"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PublicShareLinkActions } from "@/components/public/public-share-link-actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  clearPublicCartFromStorage,
  getPublicCartStorageKey,
  readPublicCartFromStorage,
  writePublicCartToStorage,
} from "@/lib/public/cart";
import { reconcileCartWithMenu } from "@/lib/public/cart-reconcile";
import {
  clearCheckoutRecovery,
  isCheckoutRecoveryExpired,
  readPublicFlowRecovery,
  saveCheckoutRecovery,
  saveOrderRecovery,
} from "@/lib/public/flow-recovery";
import { getPublicStoreOperationalState } from "@/lib/public/store-operational";
import { formatDateTime } from "@/lib/orders/presenter";
import { formatBRL } from "@/lib/validation/price";
import type {
  CancelCheckoutSessionRpcRow,
  CheckoutRpcItemInput,
  CreateCheckoutSessionRpcRow,
  PublicMenuRpcRow,
  PublicStoreRpcRow,
  PublicCheckoutCartItem,
  SimulateCheckoutPaymentSuccessRpcRow,
} from "@/types";

type PublicCheckoutClientProps = {
  slug: string;
  storeName: string;
  acceptsOrders: boolean;
  ordersUnavailableMessage?: string | null;
  menuRows: PublicMenuRpcRow[];
};

type SimulateCheckoutErrorFeedback = {
  message: string;
  isBlockingOperational: boolean;
  isBlockingSession: boolean;
};

type StockIssueItemMessages = Record<string, string>;

const OPERATIONAL_RECHECK_INTERVAL_MS = 12000;

export function PublicCheckoutClient({
  slug,
  storeName,
  acceptsOrders,
  ordersUnavailableMessage,
  menuRows,
}: PublicCheckoutClientProps) {
  const router = useRouter();
  const cartStorageKey = getPublicCartStorageKey(slug);
  const customerStorageKey = `${cartStorageKey}:customer`;
  const unavailableMessage = ordersUnavailableMessage ?? "A loja pausou temporariamente o recebimento de novos pedidos.";

  const [cartItems, setCartItems] = useState<PublicCheckoutCartItem[]>([]);
  const [cartSyncMessage, setCartSyncMessage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isCancellingCheckout, setIsCancellingCheckout] = useState(false);
  const [isRecheckingSimulationAvailability, setIsRecheckingSimulationAvailability] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stockIssueProductIds, setStockIssueProductIds] = useState<string[]>([]);
  const [stockIssueItemMessages, setStockIssueItemMessages] = useState<StockIssueItemMessages>({});
  const [simulationErrorMessage, setSimulationErrorMessage] = useState<string | null>(null);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);
  const [simulationBlockedByOperationalState, setSimulationBlockedByOperationalState] = useState(false);
  const [simulationBlockedBySessionState, setSimulationBlockedBySessionState] = useState(false);
  const [success, setSuccess] = useState<CreateCheckoutSessionRpcRow | null>(null);

  useEffect(() => {
    const loaded = readPublicCartFromStorage(cartStorageKey);
    const reconciled = reconcileCartWithMenu(loaded, menuRows, acceptsOrders);
    const normalized = normalizeCheckoutItems(reconciled.items);

    setCartItems(normalized);

    if (!normalized.length) {
      clearPublicCartFromStorage(cartStorageKey);
    } else {
      writePublicCartToStorage(cartStorageKey, normalized);
    }

    if (reconciled.removedCount > 0) {
      setCartSyncMessage("Alguns itens deixaram de estar disponíveis e foram removidos do seu pedido.");
      return;
    }

    if (reconciled.priceUpdatedCount > 0) {
      setCartSyncMessage("O preço de alguns itens foi atualizado.");
      return;
    }

    if (reconciled.updatedCount > 0) {
      setCartSyncMessage("Seu carrinho foi atualizado com base no cardápio atual.");
      return;
    }

    setCartSyncMessage(null);
  }, [acceptsOrders, cartStorageKey, menuRows]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(customerStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { name?: string; phone?: string };
      if (parsed.name) {
        setCustomerName(parsed.name);
      }
      if (parsed.phone) {
        setCustomerPhone(parsed.phone);
      }
    } catch {
      // Ignora falhas de leitura local para não interromper o checkout.
    }
  }, [customerStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(
        customerStorageKey,
        JSON.stringify({
          name: customerName,
          phone: customerPhone,
        })
      );
    } catch {
      // Ignora falhas de escrita local para manter o fluxo.
    }
  }, [customerName, customerPhone, customerStorageKey]);

  useEffect(() => {
    if (success) {
      return;
    }

    const recovery = readPublicFlowRecovery(slug);
    const checkout = recovery?.checkout;

    if (!checkout) {
      return;
    }

    if (isCheckoutRecoveryExpired(checkout)) {
      clearCheckoutRecovery(slug);
      return;
    }

    setSuccess({
      checkout_session_id: checkout.checkoutSessionId,
      public_token: checkout.checkoutPublicToken,
      store_id: checkout.storeId,
      status: checkout.status,
      total_amount: checkout.totalAmount,
      expires_at: checkout.expiresAt,
    });
    setCancelSuccessMessage(null);
    setSimulationErrorMessage(null);
    setSimulationBlockedByOperationalState(false);
    setSimulationBlockedBySessionState(false);
  }, [slug, success]);

  useEffect(() => {
    if (!success) {
      return;
    }

    if (success.status !== "pending_payment" || isSessionExpired(success.expires_at)) {
      return;
    }

    saveCheckoutRecovery({
      slug,
      checkoutSessionId: success.checkout_session_id,
      checkoutPublicToken: success.public_token,
      storeId: success.store_id,
      status: success.status,
      totalAmount: Number(success.total_amount ?? 0),
      expiresAt: success.expires_at,
      checkoutUrl: `/${slug}/checkout`,
    });
  }, [slug, success]);

  const totalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const localTotalAmount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0),
    [cartItems]
  );
  const stockIssueProductIdsSet = useMemo(() => new Set(stockIssueProductIds), [stockIssueProductIds]);

  useEffect(() => {
    setStockIssueProductIds((current) => current.filter((productId) => cartItems.some((item) => item.product_id === productId)));
    setStockIssueItemMessages((current) => {
      const remainingEntries = Object.entries(current).filter(([productId]) =>
        cartItems.some((item) => item.product_id === productId)
      );

      return Object.fromEntries(remainingEntries);
    });
  }, [cartItems]);

  const customerNameTrimmed = customerName.trim();
  const customerPhoneTrimmed = customerPhone.trim();
  const phoneDigits = customerPhoneTrimmed.replace(/\D/g, "");
  const hasPhoneInput = phoneDigits.length > 0;
  const phoneIsValid = phoneDigits.length === 10 || phoneDigits.length === 11;
  const canSubmit =
    acceptsOrders &&
    totalItems > 0 &&
    customerNameTrimmed.length > 0 &&
    hasPhoneInput &&
    phoneIsValid &&
    !isSubmitting;
  const submitHint = !acceptsOrders
    ? unavailableMessage
    : totalItems <= 0
      ? "Adicione itens no cardapio para continuar."
      : !customerNameTrimmed
        ? "Informe seu nome completo."
        : !hasPhoneInput
          ? "Informe seu telefone para receber atualizacoes do pedido."
          : !phoneIsValid
            ? "Revise o telefone: use 10 ou 11 digitos."
            : null;

  const updateCheckoutCart = useCallback(
    (updater: (current: PublicCheckoutCartItem[]) => PublicCheckoutCartItem[]) => {
      setCartItems((current) => {
        const next = normalizeCheckoutItems(updater(current));

        if (next.length > 0) {
          writePublicCartToStorage(cartStorageKey, next);
        } else {
          clearPublicCartFromStorage(cartStorageKey);
        }

        return next;
      });

      setErrorMessage(null);
      setCartSyncMessage(null);
    },
    [cartStorageKey]
  );

  const increaseItemQuantity = useCallback(
    (productId: string) => {
      updateCheckoutCart((current) =>
        current.map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );
    },
    [updateCheckoutCart]
  );

  const decreaseItemQuantity = useCallback(
    (productId: string) => {
      updateCheckoutCart((current) =>
        current.flatMap((item) => {
          if (item.product_id !== productId) {
            return [item];
          }

          if (item.quantity <= 1) {
            return [];
          }

          return [
            {
              ...item,
              quantity: item.quantity - 1,
            },
          ];
        })
      );
    },
    [updateCheckoutCart]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStockIssueProductIds([]);
    setStockIssueItemMessages({});

    if (!acceptsOrders) {
      setErrorMessage(unavailableMessage);
      return;
    }

    if (totalItems <= 0) {
      setErrorMessage("Seu carrinho esta vazio.");
      return;
    }

    if (!customerNameTrimmed) {
      setErrorMessage("Informe seu nome para continuar.");
      return;
    }

    if (!hasPhoneInput) {
      setErrorMessage("Informe um telefone para continuar.");
      return;
    }

    if (!phoneIsValid) {
      setErrorMessage("Telefone invalido. Informe um numero brasileiro com 10 ou 11 digitos.");
      return;
    }

    const rpcItems: CheckoutRpcItemInput[] = cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();

      const [storeResult, currentMenuResult] = await Promise.all([
        supabase.rpc("get_public_store_by_slug", { p_slug: slug }).maybeSingle<PublicStoreRpcRow>(),
        supabase.rpc("get_public_menu_by_slug", { p_slug: slug }).returns<PublicMenuRpcRow[]>(),
      ]);

      if (storeResult.error || !storeResult.data || currentMenuResult.error) {
        setErrorMessage("Não foi possível validar a disponibilidade da loja agora. Tente novamente.");
        return;
      }

      const currentMenuRows = Array.isArray(currentMenuResult.data) ? currentMenuResult.data : [];
      const currentOperationalState = getPublicStoreOperationalState({
        acceptsOrdersSetting: storeResult.data.accepts_orders,
        visibleMenuItems: currentMenuRows.length,
      });

      if (!currentOperationalState.canPlaceOrders) {
        setErrorMessage(currentOperationalState.unavailableMessage ?? unavailableMessage);
        router.refresh();
        return;
      }

      const localStockDiagnosis = diagnoseStockIssue(cartItems, currentMenuRows);
      const localStockFeedback = buildStockIssueFeedback(localStockDiagnosis, true);

      if (localStockFeedback) {
        setErrorMessage(localStockFeedback.message);
        setStockIssueProductIds(localStockFeedback.problemProductIds);
        setStockIssueItemMessages(localStockFeedback.problemItemMessagesByProductId ?? {});
        setCancelSuccessMessage(null);

        if (localStockFeedback.shouldRefresh) {
          router.refresh();
        }

        return;
      }

      const { data, error } = await supabase
        .rpc("create_checkout_session_by_slug", {
          p_slug: slug,
          p_customer_name: customerNameTrimmed,
          p_customer_phone: phoneDigits,
          p_notes: notes.trim() || null,
          p_items: rpcItems,
        })
        .maybeSingle<CreateCheckoutSessionRpcRow>();

      if (error || !data) {
        const mappedError = mapCreateCheckoutSessionError(
          error?.message,
          unavailableMessage,
          cartItems,
          currentMenuRows
        );
        setErrorMessage(mappedError.message);
        setStockIssueProductIds(mappedError.problemProductIds);
        setStockIssueItemMessages(mappedError.problemItemMessagesByProductId ?? {});
        setCancelSuccessMessage(null);

        if (mappedError.shouldRefresh) {
          router.refresh();
        }

        return;
      }

      clearPublicCartFromStorage(cartStorageKey);
      setCartItems([]);
      setSuccess(data);
      setStockIssueProductIds([]);
      setStockIssueItemMessages({});
      setCancelSuccessMessage(null);
      setSimulationErrorMessage(null);
      setSimulationBlockedByOperationalState(false);
      setSimulationBlockedBySessionState(false);
    } catch {
      setErrorMessage("Erro inesperado ao iniciar checkout. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const recheckSimulationAvailability = useCallback(async () => {
    if (!success || isRecheckingSimulationAvailability) {
      return;
    }

    setIsRecheckingSimulationAvailability(true);

    try {
      const localSessionExpired = isSessionExpired(success.expires_at);
      if (localSessionExpired) {
        clearCheckoutRecovery(slug);
        setSuccess((current) => (current ? { ...current, status: "expired" } : current));
        setSimulationBlockedBySessionState(true);
        setSimulationBlockedByOperationalState(false);
        setSimulationErrorMessage("Esta sessão de checkout expirou. Volte ao cardápio e crie uma nova sessão.");
        return;
      }

      if (success.status !== "pending_payment") {
        const normalizedStatus = normalizeCheckoutSessionStatus(success.status, success.expires_at);
        clearCheckoutRecovery(slug);
        setSimulationBlockedBySessionState(true);
        setSimulationBlockedByOperationalState(false);
        setSimulationErrorMessage(resolveSessionUnavailableMessage(normalizedStatus));
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const [storeResult, menuResult] = await Promise.all([
        supabase.rpc("get_public_store_by_slug", { p_slug: slug }).maybeSingle<PublicStoreRpcRow>(),
        supabase.rpc("get_public_menu_by_slug", { p_slug: slug }).returns<PublicMenuRpcRow[]>(),
      ]);

      if (storeResult.error || !storeResult.data || menuResult.error) {
        setSimulationBlockedByOperationalState(true);
        setSimulationErrorMessage("Não foi possível revalidar a disponibilidade da loja agora. Tente novamente.");
        return;
      }

      const menuRowsNow = Array.isArray(menuResult.data) ? menuResult.data : [];
      const operationalState = getPublicStoreOperationalState({
        acceptsOrdersSetting: storeResult.data.accepts_orders,
        visibleMenuItems: menuRowsNow.length,
      });

      if (!operationalState.canPlaceOrders) {
        setSimulationBlockedByOperationalState(true);
        setSimulationErrorMessage(
          operationalState.unavailableMessage ?? "A loja está indisponível para concluir a conversão neste momento."
        );
        return;
      }

      setSimulationBlockedByOperationalState(false);
      setSimulationBlockedBySessionState(false);
      setSimulationErrorMessage(null);
    } finally {
      setIsRecheckingSimulationAvailability(false);
    }
  }, [isRecheckingSimulationAvailability, slug, success]);

  useEffect(() => {
    if (!success || !simulationBlockedByOperationalState) {
      return;
    }

    void recheckSimulationAvailability();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void recheckSimulationAvailability();
      }
    }, OPERATIONAL_RECHECK_INTERVAL_MS);

    const revalidate = () => {
      if (document.visibilityState === "visible") {
        void recheckSimulationAvailability();
      }
    };

    const onOnline = () => {
      void recheckSimulationAvailability();
    };

    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", onOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", onOnline);
    };
  }, [recheckSimulationAvailability, simulationBlockedByOperationalState, success]);

  async function handleSimulatePaymentApproved() {
    if (!success || isSimulatingPayment || simulationBlockedByOperationalState || simulationBlockedBySessionState) {
      return;
    }

    setSimulationErrorMessage(null);
    setIsSimulatingPayment(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .rpc("simulate_checkout_payment_success", {
          p_checkout_session_id: success.checkout_session_id,
          p_public_token: success.public_token,
        })
        .maybeSingle<SimulateCheckoutPaymentSuccessRpcRow>();

      if (error || !data) {
        const mappedError = mapSimulateCheckoutError(error?.message);
        setSimulationErrorMessage(mappedError.message);
        setSimulationBlockedByOperationalState(mappedError.isBlockingOperational);
        setSimulationBlockedBySessionState(mappedError.isBlockingSession);
        setCancelSuccessMessage(null);

        if (mappedError.isBlockingSession) {
          clearCheckoutRecovery(slug);
        }

        return;
      }

      if (!data.order_id || !data.order_public_token) {
        setSimulationErrorMessage(
          "Pagamento simulado, mas os dados do pedido ainda nao foram disponibilizados."
        );
        return;
      }

      const token = encodeURIComponent(data.order_public_token);
      const orderPath = `/${slug}/pedido/${data.order_id}?token=${token}`;

      saveOrderRecovery({
        slug,
        orderId: data.order_id,
        orderPublicToken: data.order_public_token,
        status: typeof data.order_status === "string" ? data.order_status : "aguardando_aceite",
        displayCode: data.display_code,
        orderUrl: orderPath,
        clearCheckout: true,
      });

      router.push(`/${slug}/pedido/${data.order_id}?token=${token}`);
    } catch {
      setSimulationErrorMessage("Erro inesperado ao simular pagamento. Tente novamente.");
    } finally {
      setIsSimulatingPayment(false);
    }
  }

  async function handleCancelCheckout() {
    if (!success || isCancellingCheckout || isSimulatingPayment) {
      return;
    }

    const normalizedStatus = normalizeCheckoutSessionStatus(success.status, success.expires_at);
    if (normalizedStatus !== "pending_payment") {
      setSimulationBlockedBySessionState(true);
      setSimulationBlockedByOperationalState(false);
      setSimulationErrorMessage(resolveSessionUnavailableMessage(normalizedStatus));
      return;
    }

    setIsCancellingCheckout(true);
    setCancelSuccessMessage(null);
    setSimulationErrorMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await executeCancelCheckoutRpc(supabase, {
        checkoutSessionId: success.checkout_session_id,
        publicToken: success.public_token,
      });

      if (error) {
        const mappedError = mapCancelCheckoutError(error.message);

        if (mappedError.clearRecovery) {
          clearCheckoutRecovery(slug);
        }

        const nextStatus = mappedError.nextStatus;
        if (nextStatus) {
          setSuccess((current) => (current ? { ...current, status: nextStatus } : current));
        }

        setSimulationBlockedBySessionState(mappedError.blockSession);
        setSimulationBlockedByOperationalState(false);
        setSimulationErrorMessage(mappedError.message);
        return;
      }

      const nextStatus =
        normalizeCheckoutSessionStatus(
          data?.status ?? data?.checkout_status ?? "cancelled",
          data?.expires_at ?? success.expires_at
        ) ?? "cancelled";

      clearCheckoutRecovery(slug);
      setSuccess((current) => (current ? { ...current, status: nextStatus } : current));
      setSimulationBlockedBySessionState(true);
      setSimulationBlockedByOperationalState(false);
      setSimulationErrorMessage(null);
      setCancelSuccessMessage("Checkout cancelado com sucesso. Esta sessão não pode mais ser usada.");
    } catch {
      setSimulationErrorMessage("Não foi possível cancelar o checkout agora. Tente novamente em instantes.");
    } finally {
      setIsCancellingCheckout(false);
    }
  }

  if (success) {
    const checkoutStatus = normalizeCheckoutSessionStatus(success.status, success.expires_at);
    const isPendingCheckout = checkoutStatus === "pending_payment";
    const isCancelledCheckout = checkoutStatus === "cancelled";
    const isExpiredCheckout = checkoutStatus === "expired";
    const isConvertedCheckout = checkoutStatus === "converted";
    const simulationActionDisabled =
      isSimulatingPayment ||
      isRecheckingSimulationAvailability ||
      isCancellingCheckout ||
      !isPendingCheckout ||
      simulationBlockedByOperationalState ||
      simulationBlockedBySessionState;

    const canCancelCheckout = isPendingCheckout && !isSimulatingPayment && !isCancellingCheckout;

    return (
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_44px_-34px_rgba(24,24,27,0.55)] sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Sessão de checkout criada</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Sessão registrada para {storeName}. Nesta demonstração, você pode simular a aprovação do pagamento para concluir o fluxo.
            </p>
          </div>

          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPendingCheckout
              ? "bg-emerald-100 text-emerald-900"
              : isCancelledCheckout
                ? "bg-zinc-200 text-zinc-800"
                : isExpiredCheckout
                  ? "bg-amber-100 text-amber-900"
                  : "bg-zinc-100 text-zinc-800"
          }`}>
            {getCheckoutStatusLabel(checkoutStatus)}
          </span>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sessão</p>
            <p className="mt-1 break-all text-sm font-medium text-zinc-900">{success.checkout_session_id}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Token público</p>
            <p className="mt-1 break-all text-sm font-medium text-zinc-900">{success.public_token}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total confirmado</p>
            <p className="mt-1 text-base font-semibold text-zinc-900">{formatBRL(Number(success.total_amount ?? 0))}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Expira em</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{formatDateTime(success.expires_at)}</p>
          </div>
        </div>

        {cancelSuccessMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            {cancelSuccessMessage}
          </p>
        ) : null}

        {(simulationErrorMessage || simulationBlockedByOperationalState || simulationBlockedBySessionState || isCancelledCheckout || isExpiredCheckout || isConvertedCheckout) ? (
          <div
            className={`rounded-xl border px-3 py-3 text-sm ${
              (simulationBlockedBySessionState || isCancelledCheckout || isExpiredCheckout || isConvertedCheckout)
                ? "border-red-200 bg-red-50 text-red-800"
                : simulationBlockedByOperationalState
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700"
            }`}
            role="status"
          >
            {simulationErrorMessage ?? resolveSessionUnavailableMessage(checkoutStatus)}
          </div>
        ) : (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            Sessão pronta para simulação de pagamento.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSimulatePaymentApproved}
            disabled={simulationActionDisabled}
            data-testid="checkout-simulate-payment"
            className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulatingPayment
              ? "Simulando pagamento..."
              : isCancellingCheckout
                ? "Cancelando checkout..."
              : simulationBlockedBySessionState
                ? "Sessão indisponível"
                : simulationBlockedByOperationalState
                  ? "Conversão temporariamente bloqueada"
                  : !isPendingCheckout
                    ? "Checkout indisponível"
                  : "Simular pagamento aprovado"}
          </button>

          {canCancelCheckout ? (
            <button
              type="button"
              onClick={() => void handleCancelCheckout()}
              disabled={isCancellingCheckout || isSimulatingPayment}
              data-testid="checkout-cancel-session"
              className="cx-btn-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancellingCheckout ? "Cancelando checkout..." : "Cancelar checkout"}
            </button>
          ) : null}

          <Link
            href={`/${slug}`}
            className="cx-btn-secondary inline-flex items-center px-4 py-2"
          >
            Retornar ao cardápio
          </Link>
        </div>

        <p className="text-xs text-zinc-500">
          Fluxo de simulação temporário para ambiente acadêmico, até integração com gateway real.
        </p>

        <PublicShareLinkActions
          relativePath={`/${slug}/checkout`}
          microcopy="Guarde este link para retomar o checkout neste aparelho."
        />
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_40px_-30px_rgba(24,24,27,0.45)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Resumo do pedido</h2>
          <span className="text-sm text-zinc-600">{totalItems} {totalItems === 1 ? "item" : "itens"}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Confira os itens antes de criar a sessao de checkout.</p>

        {cartSyncMessage ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            {cartSyncMessage}
          </p>
        ) : null}

        {stockIssueProductIds.length > 0 ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="status">
            Revise os itens destacados em vermelho para continuar com o checkout.
          </p>
        ) : null}

        {cartItems.length > 0 ? (
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.product_id}
                data-testid={`checkout-cart-item-${item.product_id}`}
                data-problematic={stockIssueProductIdsSet.has(item.product_id) ? "true" : "false"}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${
                  stockIssueProductIdsSet.has(item.product_id)
                    ? "border-red-200 bg-red-50"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${stockIssueProductIdsSet.has(item.product_id) ? "text-red-900" : "text-zinc-900"}`}>
                    {item.name}
                  </p>
                  <p className={stockIssueProductIdsSet.has(item.product_id) ? "text-xs text-red-700" : "text-xs text-zinc-600"}>
                    {item.quantity} x {formatBRL(item.unit_price)}
                  </p>

                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() => decreaseItemQuantity(item.product_id)}
                      disabled={isSubmitting}
                      data-testid={`checkout-item-decrease-${item.product_id}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Diminuir quantidade de ${item.name}`}
                    >
                      -
                    </button>

                    <span className="min-w-5 text-center text-xs font-semibold text-zinc-700">{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => increaseItemQuantity(item.product_id)}
                      disabled={isSubmitting}
                      data-testid={`checkout-item-increase-${item.product_id}`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Aumentar quantidade de ${item.name}`}
                    >
                      +
                    </button>
                  </div>

                  {stockIssueProductIdsSet.has(item.product_id) ? (
                    <p
                      data-testid={`checkout-item-problem-${item.product_id}`}
                      className="mt-1 text-[11px] font-medium text-red-700"
                    >
                      {stockIssueItemMessages[item.product_id] ?? "Ajuste a quantidade deste item para continuar."}
                    </p>
                  ) : null}
                </div>
                <p className={stockIssueProductIdsSet.has(item.product_id) ? "text-sm font-semibold text-red-900" : "text-sm font-semibold text-zinc-900"}>
                  {formatBRL(item.unit_price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">Seu carrinho esta vazio.</p>
            <p className="mt-1 text-xs text-zinc-500">Adicione produtos no cardapio para continuar.</p>
            <Link
              href={`/${slug}`}
              className="cx-btn-secondary mt-3 inline-flex px-3 py-1.5 text-xs"
            >
              Voltar ao cardapio
            </Link>
          </div>
        )}

        <div className="mt-4 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">Total estimado</span>
            <span className="font-semibold text-zinc-900">{formatBRL(localTotalAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            O valor oficial e recalculado no servidor no momento da criacao da sessao.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_40px_-30px_rgba(24,24,27,0.45)] sm:p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Dados do cliente</h2>
        <p className="mt-1 text-xs text-zinc-500">Esses dados sao usados para identificar e atualizar o pedido.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="checkout-customer-name" className="block text-sm font-medium text-zinc-800">
              Nome
            </label>
            <input
              id="checkout-customer-name"
              type="text"
              required
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              data-testid="checkout-customer-name"
              className="cx-input mt-1"
              placeholder="Ex.: Maria Silva"
            />
          </div>

          <div>
            <label htmlFor="checkout-customer-phone" className="block text-sm font-medium text-zinc-800">
              Telefone
            </label>
            <input
              id="checkout-customer-phone"
              type="tel"
              required
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              data-testid="checkout-customer-phone"
              className="cx-input mt-1"
              placeholder="(11) 99999-9999"
            />
            {customerPhoneTrimmed.length > 0 && !phoneIsValid ? (
              <p className="mt-1 text-xs text-red-700">
                Telefone invalido. Informe um numero brasileiro com 10 ou 11 digitos.
              </p>
            ) : null}
            <p className="mt-1 text-xs text-zinc-500">Nome e telefone ficam salvos neste aparelho para próximos pedidos.</p>
          </div>

          <div>
            <label htmlFor="checkout-notes" className="block text-sm font-medium text-zinc-800">
              Observacoes do pedido (opcional)
            </label>
            <textarea
              id="checkout-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              data-testid="checkout-notes"
              className="cx-textarea mt-1"
              placeholder="Ex.: sem cebola, retirar no balcao"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="checkout-create-session"
            className="cx-btn-primary w-full px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Criando sessao..." : "Criar sessao de checkout"}
          </button>

          {!canSubmit && !isSubmitting && !errorMessage && submitHint ? (
            <p className="text-xs text-zinc-500">{submitHint}</p>
          ) : null}
        </form>

        <p className="mt-3 text-xs text-zinc-500">
          Ao continuar, os itens do carrinho serao registrados em uma nova sessao de checkout.
        </p>
      </section>
    </div>
  );
}

function normalizeCheckoutItems(items: PublicCheckoutCartItem[]) {
  const map = new Map<string, PublicCheckoutCartItem>();

  for (const item of items) {
    const current = map.get(item.product_id);

    if (!current) {
      map.set(item.product_id, {
        product_id: item.product_id,
        name: item.name,
        unit_price: item.unit_price,
        quantity: Math.max(1, Math.floor(item.quantity)),
      });
      continue;
    }

    map.set(item.product_id, {
      ...current,
      quantity: current.quantity + Math.max(1, Math.floor(item.quantity)),
    });
  }

  return Array.from(map.values());
}

type CreateCheckoutSessionErrorFeedback = {
  message: string;
  shouldRefresh: boolean;
  problemProductIds: string[];
  problemItemMessagesByProductId?: StockIssueItemMessages;
};

type StockIssueItem = {
  productId: string;
  name: string;
  requestedQuantity: number;
  availableQuantity: number | null;
};

type StockIssueDiagnosis = {
  missingItems: StockIssueItem[];
  insufficientItems: StockIssueItem[];
};

type StockHint = {
  productName: string;
  availableQuantity: number | null;
  requestedQuantity: number | null;
};

type ProductUnavailableHint = {
  productName: string;
};

type CancelCheckoutErrorFeedback = {
  message: string;
  blockSession: boolean;
  clearRecovery: boolean;
  nextStatus?: CheckoutSessionStatus;
};

type CheckoutSessionStatus = "pending_payment" | "paid" | "expired" | "cancelled" | "converted";

function normalizeMessage(message: string) {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mapCreateCheckoutSessionError(
  rawMessage: string | null | undefined,
  unavailableMessage: string,
  cartItems: PublicCheckoutCartItem[],
  currentMenuRows: PublicMenuRpcRow[]
): CreateCheckoutSessionErrorFeedback {
  if (!rawMessage) {
    return {
      message: "Não foi possível iniciar o checkout. Tente novamente.",
      shouldRefresh: false,
      problemProductIds: [],
    };
  }

  const normalized = normalizeMessage(rawMessage);
  const localDiagnosis = diagnoseStockIssue(cartItems, currentMenuRows);
  const inferredProblemProductIds = inferProblemProductIdsFromDiagnosis(localDiagnosis, cartItems);
  const inferredProblemItemMessages = buildProblemItemMessagesFromDiagnosis(localDiagnosis, cartItems);

  if (normalized.includes("nao esta aceitando pedidos")) {
    return {
      message: unavailableMessage,
      shouldRefresh: true,
      problemProductIds: [],
    };
  }

  if (normalized.includes("produto") && normalized.includes("nao esta disponivel")) {
    const unavailableHint = extractUnavailableProductHint(rawMessage);
    if (unavailableHint) {
      return buildUnavailableProductFeedback(
        unavailableHint,
        cartItems,
        inferredProblemProductIds,
        inferredProblemItemMessages
      );
    }

    return {
      message: "Um produto do carrinho não está disponível no momento. Revise o pedido para continuar.",
      shouldRefresh: true,
      problemProductIds: inferredProblemProductIds,
      problemItemMessagesByProductId: inferredProblemItemMessages,
    };
  }

  if (normalized.includes("estoque insuficiente para")) {
    const stockHint = extractStockHint(rawMessage);
    if (stockHint) {
      return buildServerStockHintFeedback(
        stockHint,
        cartItems,
        inferredProblemProductIds,
        inferredProblemItemMessages
      );
    }

    const localStockFeedback = buildStockIssueFeedback(localDiagnosis, true);
    if (localStockFeedback) {
      return localStockFeedback;
    }

    return {
      message: "A quantidade solicitada excede o estoque disponível de um ou mais itens. Ajuste as quantidades e tente novamente.",
      shouldRefresh: true,
      problemProductIds: inferredProblemProductIds,
      problemItemMessagesByProductId: inferredProblemItemMessages,
    };
  }

  if (normalized.includes("carrinho contem item invalido") || normalized.includes("indisponivel ou sem estoque")) {
    const stockFeedback = buildStockIssueFeedback(localDiagnosis, true);

    if (stockFeedback) {
      return stockFeedback;
    }

    const stockHint = extractStockHint(rawMessage);
    if (stockHint) {
      return buildServerStockHintFeedback(
        stockHint,
        cartItems,
        inferredProblemProductIds,
        inferredProblemItemMessages
      );
    }

    return {
      message: "A quantidade solicitada excede o estoque disponível de um ou mais itens. Ajuste as quantidades e tente novamente.",
      shouldRefresh: true,
      problemProductIds: inferredProblemProductIds,
      problemItemMessagesByProductId: inferredProblemItemMessages,
    };
  }

  if (normalized.includes("carrinho vazio")) {
    return {
      message: "Seu carrinho esta vazio. Volte ao cardapio para adicionar itens.",
      shouldRefresh: true,
      problemProductIds: [],
    };
  }

  if (normalized.includes("loja nao encontrada")) {
    return {
      message: "Não encontramos mais esta loja pública. Confira o link e tente novamente.",
      shouldRefresh: false,
      problemProductIds: [],
    };
  }

  return {
    message: rawMessage,
    shouldRefresh: false,
    problemProductIds: [],
  };
}

function toInteger(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
}

function diagnoseStockIssue(cartItems: PublicCheckoutCartItem[], currentMenuRows: PublicMenuRpcRow[]): StockIssueDiagnosis {
  const menuByProductId = new Map<string, PublicMenuRpcRow>();

  for (const row of currentMenuRows) {
    if (typeof row.product_id === "string" && row.product_id.length > 0) {
      menuByProductId.set(row.product_id, row);
    }
  }

  const missingItems: StockIssueItem[] = [];
  const insufficientItems: StockIssueItem[] = [];

  for (const item of cartItems) {
    const menuItem = menuByProductId.get(item.product_id);

    if (!menuItem) {
      missingItems.push({
        productId: item.product_id,
        name: item.name,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
      });
      continue;
    }

    const trackStock = menuItem.track_stock === true;
    const stockQuantity = toInteger(menuItem.stock_quantity);

    if (!trackStock || stockQuantity === null) {
      continue;
    }

    if (item.quantity > stockQuantity) {
      insufficientItems.push({
        productId: item.product_id,
        name: item.name,
        requestedQuantity: item.quantity,
        availableQuantity: stockQuantity,
      });
    }
  }

  return {
    missingItems,
    insufficientItems,
  };
}

function collectProblemProductIds(diagnosis: StockIssueDiagnosis) {
  return Array.from(new Set([
    ...diagnosis.missingItems.map((item) => item.productId),
    ...diagnosis.insufficientItems.map((item) => item.productId),
  ]));
}

function buildProblemItemMessagesFromDiagnosis(
  diagnosis: StockIssueDiagnosis,
  cartItems: PublicCheckoutCartItem[] = []
): StockIssueItemMessages {
  const messages: StockIssueItemMessages = {};

  for (const item of diagnosis.insufficientItems) {
    const availableText = item.availableQuantity === null ? "" : `Disponível: ${item.availableQuantity}. `;
    messages[item.productId] = `${availableText}Ajuste a quantidade deste item para continuar.`;
  }

  for (const item of diagnosis.missingItems) {
    messages[item.productId] = "Este item não está disponível no momento.";
  }

  if (Object.keys(messages).length === 0 && cartItems.length === 1) {
    messages[cartItems[0].product_id] = "Ajuste a quantidade deste item para continuar.";
  }

  return messages;
}

function inferProblemProductIdsFromDiagnosis(
  diagnosis: StockIssueDiagnosis,
  cartItems: PublicCheckoutCartItem[]
) {
  const inferredFromDiagnosis = collectProblemProductIds(diagnosis);

  if (inferredFromDiagnosis.length > 0) {
    return inferredFromDiagnosis;
  }

  if (cartItems.length === 1) {
    return [cartItems[0].product_id];
  }

  return [];
}

function mergeProblemProductIds(
  extractedProblemProductIds: string[],
  fallbackProblemProductIds: string[],
  cartItems: PublicCheckoutCartItem[]
) {
  const merged = Array.from(new Set([...extractedProblemProductIds, ...fallbackProblemProductIds]));

  if (merged.length > 0) {
    return merged;
  }

  if (cartItems.length === 1) {
    return [cartItems[0].product_id];
  }

  return [];
}

function mergeProblemItemMessages(
  extractedProblemProductIds: string[],
  extractedMessage: string,
  fallbackProblemItemMessages: StockIssueItemMessages,
  cartItems: PublicCheckoutCartItem[]
) {
  const merged: StockIssueItemMessages = {
    ...fallbackProblemItemMessages,
  };

  for (const productId of extractedProblemProductIds) {
    merged[productId] = extractedMessage;
  }

  if (Object.keys(merged).length === 0 && cartItems.length === 1) {
    merged[cartItems[0].product_id] = extractedMessage;
  }

  return merged;
}

function buildStockIssueFeedback(
  diagnosis: StockIssueDiagnosis,
  shouldRefresh: boolean
): CreateCheckoutSessionErrorFeedback | null {
  const problemProductIds = collectProblemProductIds(diagnosis);
  const problemItemMessagesByProductId = buildProblemItemMessagesFromDiagnosis(diagnosis);

  if (problemProductIds.length === 0) {
    return null;
  }

  if (diagnosis.insufficientItems.length === 1) {
    const item = diagnosis.insufficientItems[0];
    const quantityHint =
      item.availableQuantity === null
        ? "Ajuste a quantidade para continuar."
        : item.availableQuantity <= 0
          ? "Remova este item para continuar."
          : `Ajuste a quantidade para no máximo ${item.availableQuantity} ${item.availableQuantity === 1 ? "unidade" : "unidades"}.`;

    return {
      message: `${item.name} não tem estoque suficiente para a quantidade selecionada. ${quantityHint}`,
      shouldRefresh,
      problemProductIds,
      problemItemMessagesByProductId,
    };
  }

  if (diagnosis.insufficientItems.length > 1) {
    const highlightedItems = diagnosis.insufficientItems.slice(0, 3).map((item) => item.name).join(", ");
    const remainingCount = diagnosis.insufficientItems.length - 3;

    return {
      message:
        remainingCount > 0
          ? `Alguns itens estão com quantidade acima do estoque disponível (${highlightedItems} e mais ${remainingCount}). Ajuste as quantidades para continuar.`
          : `Alguns itens estão com quantidade acima do estoque disponível (${highlightedItems}). Ajuste as quantidades para continuar.`,
      shouldRefresh,
      problemProductIds,
      problemItemMessagesByProductId,
    };
  }

  if (diagnosis.missingItems.length === 1) {
    return {
      message: `O item ${diagnosis.missingItems[0].name} ficou indisponível no momento. Remova este item e tente novamente.`,
      shouldRefresh,
      problemProductIds,
      problemItemMessagesByProductId,
    };
  }

  const highlightedItems = diagnosis.missingItems.slice(0, 3).map((item) => item.name).join(", ");
  const remainingCount = diagnosis.missingItems.length - 3;

  return {
    message:
      remainingCount > 0
        ? `Alguns itens ficaram indisponíveis (${highlightedItems} e mais ${remainingCount}). Revise o pedido e tente novamente.`
        : `Alguns itens ficaram indisponíveis (${highlightedItems}). Revise o pedido e tente novamente.`,
    shouldRefresh,
    problemProductIds,
    problemItemMessagesByProductId,
  };
}

function findProblemProductIdsByName(cartItems: PublicCheckoutCartItem[], productName: string) {
  const normalizedTarget = normalizeMessage(productName).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const targetTokens = normalizedTarget.split(" ").filter((token) => token.length >= 3);

  return cartItems
    .filter((item) => {
      const normalizedItemName = normalizeMessage(item.name).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

      if (!normalizedTarget) {
        return false;
      }

      const hasTokenMatch = targetTokens.some((token) => normalizedItemName.includes(token));

      return (
        normalizedItemName === normalizedTarget ||
        normalizedItemName.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedItemName) ||
        hasTokenMatch
      );
    })
    .map((item) => item.product_id);
}

function extractStockHint(rawMessage: string): StockHint | null {
  const quotedNameMatch = rawMessage.match(/estoque insuficiente para\s+["“']([^"”']+)["”']/iu);
  const plainNameMatch = rawMessage.match(/estoque insuficiente para\s+([^(.]+)(?:\(|\.|$)/iu);
  const productName = quotedNameMatch?.[1]?.trim() ?? plainNameMatch?.[1]?.trim() ?? "";

  if (!productName) {
    return null;
  }

  const availableMatch = rawMessage.match(/dispon[ií]vel\s*:\s*(\d+)/iu);
  const requestedMatch = rawMessage.match(/solicitad[oa]\s*:\s*(\d+)/iu);

  return {
    productName,
    availableQuantity: availableMatch ? Number(availableMatch[1]) : null,
    requestedQuantity: requestedMatch ? Number(requestedMatch[1]) : null,
  };
}

function extractUnavailableProductHint(rawMessage: string): ProductUnavailableHint | null {
  const quotedNameMatch = rawMessage.match(/produto\s+["“']([^"”']+)["”']\s+n[aã]o\s+est[aá]\s+dispon[ií]vel/iu);
  const fallbackNameMatch = rawMessage.match(/produto\s+([^"“'.(]+)\s+n[aã]o\s+est[aá]\s+dispon[ií]vel/iu);
  const productName = quotedNameMatch?.[1]?.trim() ?? fallbackNameMatch?.[1]?.trim() ?? "";

  if (!productName) {
    return null;
  }

  return {
    productName,
  };
}

function buildServerStockHintFeedback(
  stockHint: StockHint,
  cartItems: PublicCheckoutCartItem[],
  fallbackProblemProductIds: string[],
  fallbackProblemItemMessages: StockIssueItemMessages
): CreateCheckoutSessionErrorFeedback {
  const extractedProblemProductIds = findProblemProductIdsByName(cartItems, stockHint.productName);
  const problemProductIds = mergeProblemProductIds(extractedProblemProductIds, fallbackProblemProductIds, cartItems);

  const amountDetail =
    stockHint.availableQuantity !== null && stockHint.requestedQuantity !== null
      ? `Disponível: ${stockHint.availableQuantity}. Solicitado: ${stockHint.requestedQuantity}. `
      : "";

  const quantityHint =
    stockHint.availableQuantity === null
      ? `Ajuste a quantidade de ${stockHint.productName} para continuar.`
      : stockHint.availableQuantity <= 0
        ? `Remova ${stockHint.productName} para continuar.`
        : `Ajuste a quantidade de ${stockHint.productName} para no máximo ${stockHint.availableQuantity} ${stockHint.availableQuantity === 1 ? "unidade" : "unidades"}.`;

  const extractedMessage = `${amountDetail}Ajuste a quantidade deste item para continuar.`.trim();
  const problemItemMessagesByProductId = mergeProblemItemMessages(
    extractedProblemProductIds,
    extractedMessage,
    fallbackProblemItemMessages,
    cartItems
  );

  return {
    message: `${stockHint.productName} não tem estoque suficiente para a quantidade selecionada. ${amountDetail}${quantityHint}`,
    shouldRefresh: true,
    problemProductIds,
    problemItemMessagesByProductId,
  };
}

function buildUnavailableProductFeedback(
  unavailableHint: ProductUnavailableHint,
  cartItems: PublicCheckoutCartItem[],
  fallbackProblemProductIds: string[],
  fallbackProblemItemMessages: StockIssueItemMessages
): CreateCheckoutSessionErrorFeedback {
  const extractedProblemProductIds = findProblemProductIdsByName(cartItems, unavailableHint.productName);
  const problemProductIds = mergeProblemProductIds(extractedProblemProductIds, fallbackProblemProductIds, cartItems);
  const problemItemMessagesByProductId = mergeProblemItemMessages(
    extractedProblemProductIds,
    "Este item não está disponível no momento.",
    fallbackProblemItemMessages,
    cartItems
  );

  return {
    message: `O produto ${unavailableHint.productName} não está disponível no momento. Remova este item para continuar.`,
    shouldRefresh: true,
    problemProductIds,
    problemItemMessagesByProductId,
  };
}

function normalizeCheckoutSessionStatus(status: string | null | undefined, expiresAt: string | null | undefined): CheckoutSessionStatus {
  const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";

  if (normalized === "pending_payment" && isSessionExpired(expiresAt ?? null)) {
    return "expired";
  }

  if (normalized === "paid" || normalized === "expired" || normalized === "cancelled" || normalized === "converted") {
    return normalized;
  }

  return "pending_payment";
}

function getCheckoutStatusLabel(status: CheckoutSessionStatus) {
  if (status === "pending_payment") {
    return "Aguardando pagamento";
  }

  if (status === "cancelled") {
    return "Checkout cancelado";
  }

  if (status === "expired") {
    return "Checkout expirado";
  }

  if (status === "converted") {
    return "Convertido em pedido";
  }

  return "Pagamento registrado";
}

function resolveSessionUnavailableMessage(status: CheckoutSessionStatus) {
  if (status === "cancelled") {
    return "Esta sessão foi cancelada e não pode mais ser usada.";
  }

  if (status === "expired") {
    return "Esta sessão expirou. Volte ao cardápio e crie uma nova sessão.";
  }

  if (status === "converted") {
    return "Esta sessão já foi convertida em pedido e não pode mais ser cancelada.";
  }

  if (status === "paid") {
    return "Esta sessão já recebeu pagamento e está em processamento de conversão.";
  }

  return "A conversão está temporariamente indisponível.";
}

function mapCancelCheckoutError(rawMessage: string | null | undefined): CancelCheckoutErrorFeedback {
  if (!rawMessage) {
    return {
      message: "Não foi possível cancelar o checkout agora. Tente novamente.",
      blockSession: false,
      clearRecovery: false,
    };
  }

  const normalized = normalizeMessage(rawMessage);

  if (normalized.includes("could not find the function public.cancel_checkout_session_by_token") || normalized.includes("schema cache")) {
    return {
      message: "A função de cancelamento ainda não está disponível no serviço de API. Tente novamente em alguns segundos.",
      blockSession: false,
      clearRecovery: false,
    };
  }

  if (normalized.includes("nao encontrada") || normalized.includes("token invalido")) {
    return {
      message: "Sessão de checkout não encontrada ou token inválido.",
      blockSession: true,
      clearRecovery: true,
    };
  }

  if (normalized.includes("sessao expirou") || normalized.includes("sessao de checkout expirou")) {
    return {
      message: "A sessão expirou e não pode mais ser cancelada.",
      blockSession: true,
      clearRecovery: true,
      nextStatus: "expired",
    };
  }

  if (normalized.includes("ja foi convertida") || normalized.includes("nao pode ser cancelada")) {
    return {
      message: "Esta sessão já foi convertida em pedido e não pode ser cancelada.",
      blockSession: true,
      clearRecovery: true,
      nextStatus: "converted",
    };
  }

  if (normalized.includes("sessao foi cancelada") || normalized.includes("ja esta cancelada")) {
    return {
      message: "Esta sessão já foi cancelada.",
      blockSession: true,
      clearRecovery: true,
      nextStatus: "cancelled",
    };
  }

  return {
    message: "Não foi possível cancelar o checkout agora. Tente novamente em instantes.",
    blockSession: false,
    clearRecovery: false,
  };
}

function mapSimulateCheckoutError(rawMessage: string | null | undefined): SimulateCheckoutErrorFeedback {
  if (!rawMessage) {
    return {
      message: "Não foi possível simular o pagamento agora. Tente novamente em instantes.",
      isBlockingOperational: false,
      isBlockingSession: false,
    };
  }

  const normalized = normalizeMessage(rawMessage);

  if (normalized.includes("nao esta aceitando pedidos")) {
    return {
      message: "A loja pausou os pedidos antes da conversão final. O pedido não foi criado.",
      isBlockingOperational: true,
      isBlockingSession: false,
    };
  }

  if (normalized.includes("nao esta pronta para operar")) {
    return {
      message: "A loja não está operacional no momento. O pedido não foi criado.",
      isBlockingOperational: true,
      isBlockingSession: false,
    };
  }

  if (normalized.includes("sessao foi cancelada")) {
    return {
      message: "Esta sessão foi cancelada e não pode mais ser usada.",
      isBlockingOperational: false,
      isBlockingSession: true,
    };
  }

  if (normalized.includes("sessao expirou")) {
    return {
      message: "Esta sessão expirou. Volte ao cardápio e crie uma nova sessão.",
      isBlockingOperational: false,
      isBlockingSession: true,
    };
  }

  if (normalized.includes("ja foi convertida") || normalized.includes("nao pode ser cancelada")) {
    return {
      message: "Esta sessão já foi convertida em pedido e não pode mais ser usada para simulação.",
      isBlockingOperational: false,
      isBlockingSession: true,
    };
  }

  if (normalized.includes("sessao de checkout nao encontrada") || normalized.includes("token invalido")) {
    return {
      message: "Esta sessão não está mais disponível para simulação. Volte ao cardápio e inicie uma nova sessão.",
      isBlockingOperational: false,
      isBlockingSession: true,
    };
  }

  if (normalized.includes("itens da sessao ficaram indisponiveis")) {
    return {
      message: "Os itens desta sessão ficaram indisponíveis para conversão. O pedido não foi criado.",
      isBlockingOperational: false,
      isBlockingSession: false,
    };
  }

  return {
    message: rawMessage,
    isBlockingOperational: false,
    isBlockingSession: false,
  };
}

function isSessionExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return false;
  }

  return expiresAtMs <= Date.now();
}

async function executeCancelCheckoutRpc(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  payload: { checkoutSessionId: string; publicToken: string }
) {
  const primaryAttempt = await supabase
    .rpc("cancel_checkout_session_by_token", {
      p_checkout_session_id: payload.checkoutSessionId,
      p_public_token: payload.publicToken,
    })
    .maybeSingle<CancelCheckoutSessionRpcRow>();

  if (!primaryAttempt.error) {
    return primaryAttempt;
  }

  if (!isCancelRpcSignatureMismatch(primaryAttempt.error.message)) {
    return primaryAttempt;
  }

  const fallbackAttempt = await supabase
    .rpc("cancel_checkout_session_by_token", {
      checkout_session_id: payload.checkoutSessionId,
      public_token: payload.publicToken,
    })
    .maybeSingle<CancelCheckoutSessionRpcRow>();

  if (!fallbackAttempt.error) {
    return fallbackAttempt;
  }

  return primaryAttempt;
}

function isCancelRpcSignatureMismatch(rawMessage: string | null | undefined) {
  if (!rawMessage) {
    return false;
  }

  const normalized = normalizeMessage(rawMessage);
  return normalized.includes("could not find the function public.cancel_checkout_session_by_token") || normalized.includes("schema cache");
}
