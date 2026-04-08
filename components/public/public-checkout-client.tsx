"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  clearPublicCartFromStorage,
  getPublicCartStorageKey,
  readPublicCartFromStorage,
} from "@/lib/public/cart";
import { formatDateTime } from "@/lib/orders/presenter";
import { formatBRL } from "@/lib/validation/price";
import type {
  CheckoutRpcItemInput,
  CreateCheckoutSessionRpcRow,
  PublicCheckoutCartItem,
  SimulateCheckoutPaymentSuccessRpcRow,
} from "@/types";

type PublicCheckoutClientProps = {
  slug: string;
  storeName: string;
  acceptsOrders: boolean;
};

export function PublicCheckoutClient({ slug, storeName, acceptsOrders }: PublicCheckoutClientProps) {
  const router = useRouter();
  const cartStorageKey = getPublicCartStorageKey(slug);
  const customerStorageKey = `${cartStorageKey}:customer`;

  const [cartItems, setCartItems] = useState<PublicCheckoutCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulationErrorMessage, setSimulationErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateCheckoutSessionRpcRow | null>(null);

  useEffect(() => {
    setCartItems(normalizeCheckoutItems(readPublicCartFromStorage(cartStorageKey)));
  }, [cartStorageKey]);

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

  const totalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const localTotalAmount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0),
    [cartItems]
  );

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
    ? "A loja pausou os pedidos no momento."
    : totalItems <= 0
      ? "Adicione itens no cardapio para continuar."
      : !customerNameTrimmed
        ? "Informe seu nome completo."
        : !hasPhoneInput
          ? "Informe seu telefone para receber atualizacoes do pedido."
          : !phoneIsValid
            ? "Revise o telefone: use 10 ou 11 digitos."
            : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!acceptsOrders) {
      setErrorMessage("Esta loja nao esta aceitando pedidos no momento.");
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
        setErrorMessage(error?.message ?? "Nao foi possivel iniciar o checkout. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      clearPublicCartFromStorage(cartStorageKey);
      setCartItems([]);
      setSuccess(data);
      setSimulationErrorMessage(null);
      setIsSubmitting(false);
    } catch {
      setErrorMessage("Erro inesperado ao iniciar checkout. Tente novamente em instantes.");
      setIsSubmitting(false);
    }
  }

  async function handleSimulatePaymentApproved() {
    if (!success || isSimulatingPayment) {
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
        setSimulationErrorMessage("Nao foi possivel simular o pagamento agora. Tente novamente em instantes.");
        return;
      }

      if (!data.order_id || !data.order_public_token) {
        setSimulationErrorMessage(
          "Pagamento simulado, mas os dados do pedido ainda nao foram disponibilizados."
        );
        return;
      }

      const token = encodeURIComponent(data.order_public_token);
      router.push(`/${slug}/pedido/${data.order_id}?token=${token}`);
    } catch {
      setSimulationErrorMessage("Erro inesperado ao simular pagamento. Tente novamente.");
    } finally {
      setIsSimulatingPayment(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-emerald-900">Checkout criado com sucesso</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Sessao registrada para {storeName}. Nesta demonstracao, o pagamento pode ser simulado para concluir o fluxo.
        </p>

        <dl className="mt-4 grid gap-3 text-sm text-emerald-900">
          <div>
            <dt className="font-medium">Sessao de checkout</dt>
            <dd>{success.checkout_session_id}</dd>
          </div>
          <div>
            <dt className="font-medium">Token publico</dt>
            <dd>{success.public_token}</dd>
          </div>
          <div>
            <dt className="font-medium">Status</dt>
            <dd>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                {success.status} (aguardando pagamento)
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium">Total confirmado</dt>
            <dd>{formatBRL(Number(success.total_amount ?? 0))}</dd>
          </div>
          <div>
            <dt className="font-medium">Expira em</dt>
            <dd>{formatDateTime(success.expires_at)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-emerald-700">
          Botao temporario de simulacao para ambiente academico, ate a integracao real com gateway.
        </p>

        {simulationErrorMessage ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {simulationErrorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSimulatePaymentApproved}
            disabled={isSimulatingPayment}
            className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulatingPayment ? "Simulando pagamento..." : "Simular pagamento aprovado"}
          </button>

          <Link
            href={`/${slug}`}
            className="cx-btn-secondary inline-flex items-center px-4 py-2"
          >
            Retornar ao cardapio
          </Link>
        </div>
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

        {cartItems.length > 0 ? (
          <div className="mt-4 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.product_id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                  <p className="text-xs text-zinc-600">{item.quantity} x {formatBRL(item.unit_price)}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{formatBRL(item.unit_price * item.quantity)}</p>
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
              className="cx-textarea mt-1"
              placeholder="Ex.: sem cebola, retirar no balcao"
            />
          </div>

          {!acceptsOrders ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">A loja nao esta aceitando pedidos no momento.</p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
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
