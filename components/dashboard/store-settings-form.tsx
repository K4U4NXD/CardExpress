"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  saveStoreSettingsAction,
  type StoreSettingsActionState,
  type StoreSettingsFormValues,
} from "@/app/actions/store-settings";
import type { StoreReadinessResult } from "@/lib/store-readiness";
import {
  STORE_PUBLIC_MESSAGE_MAX_LENGTH,
  validateStoreSettingsInput,
} from "@/lib/validation/store-settings";

type StoreSettingsFormProps = {
  initialValues: StoreSettingsFormValues & {
    slug: string;
    public_url: string;
  };
  initialReadiness: StoreReadinessResult;
  forcedAcceptsOrdersOff: boolean;
};

const INITIAL_STATE: StoreSettingsActionState = {};

type CopyStatus = "idle" | "ok" | "error";

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
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [hideServerFeedback, setHideServerFeedback] = useState(false);

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
  const acceptsToggleDisabled = pending || (!readiness.isReady && !values.accepts_orders);
  const serverFeedbackVisible = !hideServerFeedback;

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
    setCopyStatus("idle");
    setHideServerFeedback(true);
  }

  async function handleCopyPublicLink() {
    try {
      await navigator.clipboard.writeText(initialValues.public_url);
      setCopyStatus("ok");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
      onSubmit={() => setHideServerFeedback(false)}
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Dados básicos da loja</h2>
        <p className="mt-1 text-xs text-zinc-500">Edite nome, telefone e mensagem pública exibida para clientes.</p>
      </div>

      {serverFeedbackVisible && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      {serverFeedbackVisible && state.success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

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
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
          />
        </div>

        <div>
          <label htmlFor="settings-store-public-url" className="block text-sm font-medium text-zinc-800">
            Link público da loja (somente leitura)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="settings-store-public-url"
              type="text"
              readOnly
              value={initialValues.public_url}
              className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
            />
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
            >
              Copiar
            </button>
          </div>
          {copyStatus === "ok" ? <p className="mt-1 text-xs text-emerald-700">Link copiado.</p> : null}
          {copyStatus === "error" ? (
            <p className="mt-1 text-xs text-red-700">Não foi possível copiar automaticamente.</p>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
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
          <p>Produtos ativos e disponíveis: {readiness.activeAvailableProducts}</p>
        </div>

        {!readiness.isReady ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {readiness.pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="accepts_orders"
            checked={values.accepts_orders}
            disabled={acceptsToggleDisabled}
            onChange={(event) => updateField("accepts_orders", event.target.checked)}
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
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
        >
          Descartar alterações
        </button>
        <button
          type="submit"
          disabled={saveDisabled}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}