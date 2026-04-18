"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import {
  saveStoreSettingsAction,
  type StoreSettingsActionState,
  type StoreSettingsFormValues,
} from "@/app/actions/store-settings";
import { DashboardSettingsRealtimeSync } from "@/components/dashboard/dashboard-settings-realtime-sync";
import type { StoreReadinessResult } from "@/lib/store-readiness";
import {
  STORE_PUBLIC_MESSAGE_MAX_LENGTH,
  validateStoreSettingsInput,
} from "@/lib/validation/store-settings";
import { buildAbsoluteUrlFromOrigin } from "@/lib/public-store-url";
import { useToast } from "@/components/shared/toast-provider";

type StoreSettingsFormProps = {
  initialValues: StoreSettingsFormValues & {
    slug: string;
    public_path: string;
    public_url: string;
  };
  initialReadiness: StoreReadinessResult;
  forcedAcceptsOrdersOff: boolean;
};

const INITIAL_STATE: StoreSettingsActionState = {};

type QrDownloadStatus = "idle" | "error";

function normalizeFormValues(values: StoreSettingsFormValues): StoreSettingsFormValues {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    accepts_orders: values.accepts_orders,
    public_message: values.public_message.trim(),
  };
}

function sameFormValues(a: StoreSettingsFormValues, b: StoreSettingsFormValues): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.accepts_orders === b.accepts_orders &&
    a.public_message === b.public_message
  );
}

export function StoreSettingsForm({
  initialValues,
  initialReadiness,
  forcedAcceptsOrdersOff,
}: StoreSettingsFormProps) {
  const initialSnapshot = useMemo<StoreSettingsFormValues>(
    () =>
      normalizeFormValues({
        name: initialValues.name,
        phone: initialValues.phone,
        accepts_orders: initialValues.accepts_orders,
        public_message: initialValues.public_message,
      }),
    [initialValues.name, initialValues.phone, initialValues.accepts_orders, initialValues.public_message]
  );

  const [state, formAction, pending] = useActionState(saveStoreSettingsAction, INITIAL_STATE);
  const [values, setValues] = useState<StoreSettingsFormValues>(initialSnapshot);
  const [savedSnapshot, setSavedSnapshot] = useState<StoreSettingsFormValues>(initialSnapshot);
  const [qrDownloadStatus, setQrDownloadStatus] = useState<QrDownloadStatus>("idle");
  const [hideServerFeedback, setHideServerFeedback] = useState(false);
  const [hasPendingRefresh, setHasPendingRefresh] = useState(false);
  const [manualRefreshToken, setManualRefreshToken] = useState(0);
  const submitAttemptRef = useRef(0);
  const toastedSubmitAttemptRef = useRef(0);
  const { enqueueToast } = useToast();
  const serverFeedbackVisible = !hideServerFeedback;

  useEffect(() => {
    if (state?.values) {
      setValues(state.values);
      if (state.success) {
        setSavedSnapshot(normalizeFormValues(state.values));
      }
    }
  }, [state]);

  useEffect(() => {
    setSavedSnapshot(initialSnapshot);
    setValues(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!serverFeedbackVisible) {
      return;
    }

    if (!state.error && !state.success) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setHideServerFeedback(true);
    }, 4800);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [serverFeedbackVisible, state.error, state.success]);

  useEffect(() => {
    if (!state.error && !state.success) {
      return;
    }

    if (pending) {
      return;
    }

    if (submitAttemptRef.current === 0) {
      return;
    }

    if (toastedSubmitAttemptRef.current === submitAttemptRef.current) {
      return;
    }

    toastedSubmitAttemptRef.current = submitAttemptRef.current;

    if (state.error) {
      enqueueToast({
        tone: "error",
        title: "Falha ao salvar configurações",
        text: state.error,
      });
    }

    if (state.success) {
      enqueueToast({
        tone: "success",
        title: "Configurações atualizadas",
        text: state.success,
      });
    }
  }, [enqueueToast, pending, state.error, state.success]);

  const readiness = state.readiness ?? initialReadiness;
  const validation = useMemo(
    () =>
      validateStoreSettingsInput({
        name: values.name,
        phone: values.phone,
        publicMessage: values.public_message,
        acceptsOrders: values.accepts_orders,
      }),
    [values]
  );
  const readinessToggleError =
    !readiness.isReady && values.accepts_orders
      ? "A loja ainda não está pronta para operar. Resolva as pendências para ativar pedidos."
      : undefined;
  const normalizedCurrent = useMemo(() => normalizeFormValues(values), [values]);
  const isDirty = !sameFormValues(normalizedCurrent, savedSnapshot);
  const hasClientValidationError =
    validation.hasErrors || Boolean(readinessToggleError);
  const saveDisabled = pending || !isDirty || hasClientValidationError;
  const isRefreshBlocked = pending || isDirty;
  const acceptsToggleDisabled = pending || (!readiness.isReady && !values.accepts_orders);
  const canonicalPublicUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return initialValues.public_url;
    }

    return buildAbsoluteUrlFromOrigin(initialValues.public_path, window.location.origin);
  }, [initialValues.public_path, initialValues.public_url]);

  const nameError = validation.fieldErrors.name ?? (serverFeedbackVisible ? state.fieldErrors?.name : undefined);
  const phoneError = validation.fieldErrors.phone ?? (serverFeedbackVisible ? state.fieldErrors?.phone : undefined);
  const publicMessageError =
    validation.fieldErrors.public_message ?? (serverFeedbackVisible ? state.fieldErrors?.public_message : undefined);
  const acceptsOrdersError =
    readinessToggleError ?? (serverFeedbackVisible ? state.fieldErrors?.accepts_orders : undefined);

  function updateField<K extends keyof StoreSettingsFormValues>(key: K, value: StoreSettingsFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (hideServerFeedback) {
      setHideServerFeedback(false);
    }
  }

  function handleDiscardChanges() {
    setValues(savedSnapshot);
    setHideServerFeedback(true);
  }

  function handleDownloadPublicQrCode() {
    const qrCanvas = document.getElementById("settings-public-url-qr") as HTMLCanvasElement | null;

    if (!qrCanvas) {
      setQrDownloadStatus("error");
      return;
    }

    try {
      const downloadLink = document.createElement("a");
      downloadLink.href = qrCanvas.toDataURL("image/png");
      downloadLink.download = `${initialValues.slug}-cardapio-publico.png`;
      downloadLink.click();
      setQrDownloadStatus("idle");
    } catch {
      setQrDownloadStatus("error");
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-zinc-200 bg-white/96 p-4 shadow-[0_24px_44px_-34px_rgba(24,24,27,0.55)] sm:p-6"
      onSubmit={() => {
        submitAttemptRef.current += 1;
        setHideServerFeedback(false);
      }}
    >
      <DashboardSettingsRealtimeSync
        slug={initialValues.slug}
        blockAutoRefresh={isRefreshBlocked}
        refreshNowToken={manualRefreshToken}
        onPendingRefreshChange={setHasPendingRefresh}
      />

      {hasPendingRefresh ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>Há atualizações nesta página.</p>
            <button
              type="button"
              onClick={() => {
                setHasPendingRefresh(false);
                setManualRefreshToken((value) => value + 1);
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Atualizar agora
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Dados básicos da loja</h2>
        <p className="mt-1 text-xs text-zinc-500">Edite nome, telefone e mensagem pública exibida para clientes.</p>
      </div>

      {forcedAcceptsOrdersOff && !readiness.isReady ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A loja estava marcada para aceitar pedidos, mas foi colocada em pausa porque ainda há pendências de operação.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="settings-store-name" className="block text-sm font-medium text-zinc-800">
            Nome da loja
          </label>
          <input
            id="settings-store-name"
            name="name"
            type="text"
            required
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            aria-invalid={Boolean(nameError)}
            className="cx-input mt-1"
          />
          {nameError ? <p className="mt-1 text-xs text-red-700">{nameError}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="settings-store-phone" className="block text-sm font-medium text-zinc-800">
            Telefone da loja
          </label>
          <input
            id="settings-store-phone"
            name="phone"
            type="tel"
            required
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            aria-invalid={Boolean(phoneError)}
            className="cx-input mt-1"
            placeholder="(11) 99999-9999"
          />
          {phoneError ? <p className="mt-1 text-xs text-red-700">{phoneError}</p> : null}
        </div>

        <div>
          <label htmlFor="settings-store-slug" className="block text-sm font-medium text-zinc-800">
            Slug público (somente leitura)
          </label>
          <input
            id="settings-store-slug"
            type="text"
            readOnly
            value={initialValues.slug}
            className="mt-1 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
          />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/85 p-4">
          <p className="text-sm font-medium text-zinc-800">QR Code do cardápio público</p>
          <p className="mt-1 text-xs text-zinc-600">Use para compartilhar o link da loja em balcão, mesa ou embalagem.</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-[176px_1fr] sm:items-start">
            <div className="w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
              <QRCodeCanvas
                id="settings-public-url-qr"
                value={canonicalPublicUrl}
                size={160}
                level="M"
                includeMargin
                className="h-auto w-full"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-600">Este QR abre diretamente o cardápio público da loja.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPublicQrCode}
                  className="cx-btn-secondary px-3 py-2"
                >
                  Baixar QR Code
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">Destino: {initialValues.public_path}</p>
              <p className="text-[11px] text-zinc-500">Arquivo exportado em PNG com nome baseado no slug da loja.</p>
            </div>
          </div>

          {qrDownloadStatus === "error" ? (
            <p className="mt-2 text-xs text-red-700">Não foi possível baixar o QR Code agora.</p>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Prontidão operacional</p>
            <p className="text-xs text-zinc-600">Separada do estado de aceitação de pedidos.</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              readiness.isReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
            }`}
          >
            {readiness.isReady ? "Loja pronta para operar" : "Loja ainda não está pronta para operar"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600">
          <p>Categorias ativas: {readiness.activeCategories}</p>
          <p>Produtos aptos para compra no cardápio público: {readiness.activeAvailableProducts}</p>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Itens sem estoque podem continuar visíveis no cardápio, mas não entram na prontidão operacional.
        </p>

        {!readiness.isReady ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {readiness.pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="accepts_orders"
            checked={values.accepts_orders}
            disabled={acceptsToggleDisabled}
            onChange={(event) => updateField("accepts_orders", event.target.checked)}
            data-testid="settings-accepts-orders-toggle"
            className="rounded border-zinc-300"
          />
          Loja aceitando pedidos
        </label>
        <p className="mt-2 text-xs text-zinc-600">
          Só é possível ativar pedidos quando a loja estiver pronta para operar.
        </p>
        {acceptsOrdersError ? (
          <p className="mt-2 text-sm text-amber-800">{acceptsOrdersError}</p>
        ) : null}
      </section>

      <section>
        <label htmlFor="settings-public-message" className="block text-sm font-medium text-zinc-800">
          Mensagem pública da loja (opcional)
        </label>
        <textarea
          id="settings-public-message"
          name="public_message"
          rows={4}
          value={values.public_message}
          maxLength={STORE_PUBLIC_MESSAGE_MAX_LENGTH}
          onChange={(event) => updateField("public_message", event.target.value)}
          aria-invalid={Boolean(publicMessageError)}
          className="cx-textarea mt-1"
          placeholder="Ex.: Retirada no balcão em até 25 minutos."
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          {publicMessageError ? (
            <p className="text-red-700">{publicMessageError}</p>
          ) : (
            <span className="text-zinc-500">Essa mensagem pode aparecer no cardápio e checkout públicos.</span>
          )}
          <span className="text-zinc-500">
            {values.public_message.length}/{STORE_PUBLIC_MESSAGE_MAX_LENGTH}
          </span>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleDiscardChanges}
          disabled={pending}
          className="cx-btn-secondary px-4 py-2 disabled:opacity-60"
        >
          Descartar alterações
        </button>
        <button
          type="submit"
          disabled={saveDisabled}
          data-testid="settings-save-button"
          className="cx-btn-primary px-4 py-2 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}