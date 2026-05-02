"use client";

import { type ChangeEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Image from "next/image";

import {
  saveStoreUploadedLogoAction,
  saveStoreSettingsAction,
  type StoreSettingsActionState,
  type StoreSettingsFormValues,
} from "@/app/actions/store-settings";
import { DashboardSettingsRealtimeSync } from "@/components/dashboard/dashboard-settings-realtime-sync";
import type { StoreReadinessResult } from "@/lib/store-readiness";
import {
  STORE_LOGO_URL_MAX_LENGTH,
  STORE_PUBLIC_MESSAGE_MAX_LENGTH,
  validateStoreSettingsInput,
} from "@/lib/validation/store-settings";
import { buildStoreLogoObjectPath, STORE_LOGO_BUCKET } from "@/lib/public/store-logo-storage";
import { buildAbsoluteUrlFromOrigin } from "@/lib/public-store-url";
import { useToast } from "@/components/shared/toast-provider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type StoreSettingsFormProps = {
  storeId: string;
  initialValues: StoreSettingsFormValues & {
    slug: string;
    public_path: string;
    public_url: string;
  };
  initialReadiness: StoreReadinessResult;
  forcedAcceptsOrdersOff: boolean;
};

const INITIAL_STATE: StoreSettingsActionState = {};
const STORE_LOGO_MAX_BYTES = 3 * 1024 * 1024;
const STORE_LOGO_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

type QrDownloadStatus = "idle" | "error";
type StoreOperationalMode = "offline" | "manual" | "schedule";

const OPERATIONAL_MODE_OPTIONS: Array<{
  value: StoreOperationalMode;
  title: string;
  description: string;
}> = [
  {
    value: "offline",
    title: "Loja offline",
    description: "Pausa novos pedidos até você abrir a loja novamente.",
  },
  {
    value: "manual",
    title: "Aberta manualmente",
    description: "Mantém a loja aberta até você mudar o modo operacional.",
  },
  {
    value: "schedule",
    title: "Horário automático",
    description: "Recebe pedidos apenas dentro do horário configurado.",
  },
];

function resolveOperationalMode(values: Pick<StoreSettingsFormValues, "accepts_orders" | "auto_accept_orders_by_schedule">): StoreOperationalMode {
  if (!values.accepts_orders) {
    return "offline";
  }

  return values.auto_accept_orders_by_schedule ? "schedule" : "manual";
}

function coerceTextValue(incomingValue: unknown, fallbackValue: unknown): string {
  if (typeof incomingValue === "string") {
    return incomingValue;
  }

  if (typeof fallbackValue === "string") {
    return fallbackValue;
  }

  return "";
}

function coerceBooleanValue(incomingValue: unknown, fallbackValue: unknown): boolean {
  if (typeof incomingValue === "boolean") {
    return incomingValue;
  }

  if (typeof fallbackValue === "boolean") {
    return fallbackValue;
  }

  return false;
}

function coerceFormValues(
  incomingValues: Partial<StoreSettingsFormValues> | null | undefined,
  fallbackValues: StoreSettingsFormValues
): StoreSettingsFormValues {
  return {
    name: coerceTextValue(incomingValues?.name, fallbackValues.name),
    phone: coerceTextValue(incomingValues?.phone, fallbackValues.phone),
    logo_url: coerceTextValue(incomingValues?.logo_url, fallbackValues.logo_url),
    accepts_orders: coerceBooleanValue(incomingValues?.accepts_orders, fallbackValues.accepts_orders),
    auto_accept_orders_by_schedule: coerceBooleanValue(
      incomingValues?.auto_accept_orders_by_schedule,
      fallbackValues.auto_accept_orders_by_schedule
    ),
    opening_time: coerceTextValue(incomingValues?.opening_time, fallbackValues.opening_time),
    closing_time: coerceTextValue(incomingValues?.closing_time, fallbackValues.closing_time),
    public_message: coerceTextValue(incomingValues?.public_message, fallbackValues.public_message),
  };
}

function normalizeFormValues(values: StoreSettingsFormValues): StoreSettingsFormValues {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    logo_url: values.logo_url.trim(),
    accepts_orders: values.accepts_orders,
    auto_accept_orders_by_schedule: values.auto_accept_orders_by_schedule,
    opening_time: values.opening_time.trim(),
    closing_time: values.closing_time.trim(),
    public_message: values.public_message.trim(),
  };
}

function sameFormValues(a: StoreSettingsFormValues, b: StoreSettingsFormValues): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.logo_url === b.logo_url &&
    a.accepts_orders === b.accepts_orders &&
    a.auto_accept_orders_by_schedule === b.auto_accept_orders_by_schedule &&
    a.opening_time === b.opening_time &&
    a.closing_time === b.closing_time &&
    a.public_message === b.public_message
  );
}

export function StoreSettingsForm({
  storeId,
  initialValues,
  initialReadiness,
  forcedAcceptsOrdersOff,
}: StoreSettingsFormProps) {
  const initialSnapshot = useMemo<StoreSettingsFormValues>(
    () =>
      normalizeFormValues({
        name: coerceTextValue(initialValues.name, ""),
        phone: coerceTextValue(initialValues.phone, ""),
        logo_url: coerceTextValue(initialValues.logo_url, ""),
        accepts_orders: coerceBooleanValue(initialValues.accepts_orders, false),
        auto_accept_orders_by_schedule: coerceBooleanValue(initialValues.auto_accept_orders_by_schedule, false),
        opening_time: coerceTextValue(initialValues.opening_time, ""),
        closing_time: coerceTextValue(initialValues.closing_time, ""),
        public_message: coerceTextValue(initialValues.public_message, ""),
      }),
    [
      initialValues.name,
      initialValues.phone,
      initialValues.logo_url,
      initialValues.accepts_orders,
      initialValues.auto_accept_orders_by_schedule,
      initialValues.opening_time,
      initialValues.closing_time,
      initialValues.public_message,
    ]
  );

  const [state, formAction, pending] = useActionState(saveStoreSettingsAction, INITIAL_STATE);
  const [values, setValues] = useState<StoreSettingsFormValues>(() => coerceFormValues(initialSnapshot, initialSnapshot));
  const [savedSnapshot, setSavedSnapshot] = useState<StoreSettingsFormValues>(() =>
    coerceFormValues(initialSnapshot, initialSnapshot)
  );
  const [qrDownloadStatus, setQrDownloadStatus] = useState<QrDownloadStatus>("idle");
  const [hideServerFeedback, setHideServerFeedback] = useState(false);
  const [hasPendingRefresh, setHasPendingRefresh] = useState(false);
  const [manualRefreshToken, setManualRefreshToken] = useState(0);
  const [logoUploadPending, setLogoUploadPending] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewBroken, setLogoPreviewBroken] = useState(false);
  const [logoUploadMode, setLogoUploadMode] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const submitAttemptRef = useRef(0);
  const toastedSubmitAttemptRef = useRef(0);
  const { enqueueToast } = useToast();
  const serverFeedbackVisible = !hideServerFeedback;

  useEffect(() => {
    if (state?.values) {
      setValues((currentValues) => coerceFormValues(state.values, currentValues));
      if (state.success) {
        setSavedSnapshot((currentValues) => normalizeFormValues(coerceFormValues(state.values, currentValues)));
      }
    }
  }, [state]);

  useEffect(() => {
    setSavedSnapshot(coerceFormValues(initialSnapshot, initialSnapshot));
    setValues(coerceFormValues(initialSnapshot, initialSnapshot));
  }, [initialSnapshot]);

  useEffect(() => {
    setLogoPreviewBroken(false);
  }, [values.logo_url]);

  useEffect(() => {
    if (logoUploadMode === "url") {
      setSelectedLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [logoUploadMode]);

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
  const operationalMode = resolveOperationalMode(values);
  const validation = useMemo(
    () =>
      validateStoreSettingsInput({
        name: values.name,
        phone: values.phone,
        logoUrl: values.logo_url,
        publicMessage: values.public_message,
        acceptsOrders: values.accepts_orders,
        autoAcceptOrdersBySchedule: values.auto_accept_orders_by_schedule,
        openingTime: values.opening_time,
        closingTime: values.closing_time,
      }),
    [values]
  );
  const readinessToggleError =
    !readiness.isReady && operationalMode !== "offline"
      ? "A loja ainda não está pronta para operar. Resolva as pendências para ativar pedidos."
      : undefined;
  const normalizedCurrent = useMemo(() => normalizeFormValues(values), [values]);
  const isDirty = !sameFormValues(normalizedCurrent, savedSnapshot);
  const hasClientValidationError =
    validation.hasErrors || Boolean(readinessToggleError);
  const saveDisabled = pending || !isDirty || hasClientValidationError;
  const isRefreshBlocked = pending || isDirty;
  const canonicalPublicUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return initialValues.public_url;
    }

    return buildAbsoluteUrlFromOrigin(initialValues.public_path, window.location.origin);
  }, [initialValues.public_path, initialValues.public_url]);

  const nameError = validation.fieldErrors.name ?? (serverFeedbackVisible ? state.fieldErrors?.name : undefined);
  const phoneError = validation.fieldErrors.phone ?? (serverFeedbackVisible ? state.fieldErrors?.phone : undefined);
  const logoUrlError =
    validation.fieldErrors.logo_url ?? (serverFeedbackVisible ? state.fieldErrors?.logo_url : undefined);
  const publicMessageError =
    validation.fieldErrors.public_message ?? (serverFeedbackVisible ? state.fieldErrors?.public_message : undefined);
  const operationalModeError =
    readinessToggleError ??
    validation.fieldErrors.auto_accept_orders_by_schedule ??
    (serverFeedbackVisible ? state.fieldErrors?.accepts_orders ?? state.fieldErrors?.auto_accept_orders_by_schedule : undefined);
  const openingTimeError =
    validation.fieldErrors.opening_time ?? (serverFeedbackVisible ? state.fieldErrors?.opening_time : undefined);
  const closingTimeError =
    validation.fieldErrors.closing_time ?? (serverFeedbackVisible ? state.fieldErrors?.closing_time : undefined);
  const uploadDisabled = logoUploadPending || pending || !selectedLogoFile;
  const logoUrlValue = coerceTextValue(values.logo_url, "");
  const logoPreviewUrl = logoUrlValue.trim();
  const selectedLogoFileName = selectedLogoFile?.name ?? "";

  function updateField<K extends keyof StoreSettingsFormValues>(key: K, value: StoreSettingsFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (hideServerFeedback) {
      setHideServerFeedback(false);
    }
  }

  function updateOperationalMode(nextMode: StoreOperationalMode) {
    setValues((current) => ({
      ...current,
      accepts_orders: nextMode !== "offline",
      auto_accept_orders_by_schedule: nextMode === "schedule",
    }));
    if (hideServerFeedback) {
      setHideServerFeedback(false);
    }
  }

  function handleDiscardChanges() {
    setValues(savedSnapshot);
    setLogoUploadMode("url");
    setLogoPreviewBroken(false);
    setSelectedLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedLogoFile(nextFile);

    if (!nextFile) {
      return;
    }

    if (!STORE_LOGO_ALLOWED_TYPES.has(nextFile.type)) {
      enqueueToast({
        tone: "warning",
        title: "Formato não suportado",
        text: "Use PNG, JPG, WEBP ou SVG para a logo da loja.",
      });
      setSelectedLogoFile(null);
      event.currentTarget.value = "";
      return;
    }

    if (nextFile.size > STORE_LOGO_MAX_BYTES) {
      enqueueToast({
        tone: "warning",
        title: "Arquivo muito grande",
        text: "A logo deve ter no máximo 3 MB.",
      });
      setSelectedLogoFile(null);
      event.currentTarget.value = "";
    }
  }

  async function handleLogoUpload() {
    if (!selectedLogoFile) {
      return;
    }

    if (!STORE_LOGO_ALLOWED_TYPES.has(selectedLogoFile.type)) {
      enqueueToast({
        tone: "warning",
        title: "Formato não suportado",
        text: "Use PNG, JPG, WEBP ou SVG para a logo da loja.",
      });
      return;
    }

    if (selectedLogoFile.size > STORE_LOGO_MAX_BYTES) {
      enqueueToast({
        tone: "warning",
        title: "Arquivo muito grande",
        text: "A logo deve ter no máximo 3 MB.",
      });
      return;
    }

    if (!storeId) {
      enqueueToast({
        tone: "error",
        title: "Falha ao enviar logo",
        text: "Não foi possível identificar a loja para salvar a imagem.",
      });
      return;
    }

    const objectPath = buildStoreLogoObjectPath({
      storeId,
      fileName: selectedLogoFile.name,
      mimeType: selectedLogoFile.type,
    });

    setLogoUploadPending(true);

    try {
      const supabase =
        supabaseClientRef.current ??
        (() => {
          const client = createBrowserSupabaseClient();
          supabaseClientRef.current = client;
          return client;
        })();

      const { error: uploadError } = await supabase.storage.from(STORE_LOGO_BUCKET).upload(objectPath, selectedLogoFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: selectedLogoFile.type,
      });

      if (uploadError) {
        enqueueToast({
          tone: "error",
          title: "Falha ao enviar logo",
          text: uploadError.message,
        });
        return;
      }

      const { data } = supabase.storage.from(STORE_LOGO_BUCKET).getPublicUrl(objectPath);
      const publicUrl = data.publicUrl;

      const persistResult = await saveStoreUploadedLogoAction(publicUrl);

      if (persistResult.error) {
        updateField("logo_url", publicUrl);
        enqueueToast({
          tone: "warning",
          title: "Upload concluído, mas falta salvar",
          text: `${persistResult.error} Você ainda pode salvar manualmente em "Salvar configurações".`,
        });
      } else {
        const persistedLogoUrl = persistResult.logoUrl ?? publicUrl;
        updateField("logo_url", persistedLogoUrl);
        setSavedSnapshot((currentSnapshot) => ({
          ...currentSnapshot,
          logo_url: persistedLogoUrl,
        }));
      }

      setLogoUploadMode("upload");
      setLogoPreviewBroken(false);
      setSelectedLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (!persistResult.error) {
        enqueueToast({
          tone: "success",
          title: "Logo enviada e salva",
          text: "A nova logo foi aplicada e já está persistida para as páginas públicas.",
        });
      }
    } catch (error) {
      enqueueToast({
        tone: "error",
        title: "Falha ao enviar logo",
        text: error instanceof Error ? error.message : "Não foi possível enviar a logo agora.",
      });
    } finally {
      setLogoUploadPending(false);
    }
  }

  function handleRemoveLogo() {
    updateField("logo_url", "");
    setLogoUploadMode("url");
    setLogoPreviewBroken(false);
    setSelectedLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

      <input type="hidden" name="logo_url" value={logoUrlValue} />
      <input type="hidden" name="accepts_orders" value={values.accepts_orders ? "on" : "off"} />
      <input
        type="hidden"
        name="auto_accept_orders_by_schedule"
        value={values.auto_accept_orders_by_schedule ? "on" : "off"}
      />

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Dados básicos da loja</h2>
        <p className="mt-1 text-xs text-zinc-500">Edite nome, telefone, logo e mensagem pública exibida para clientes.</p>
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

        <div className="sm:col-span-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Logo da loja</p>
              <p className="mt-1 text-xs text-zinc-600">Escolha um link ou envie um arquivo para atualizar a logo pública da loja.</p>
            </div>

            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={pending || logoUploadPending || (!logoUrlValue && !selectedLogoFile)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              Remover logo
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <div
                data-testid="settings-logo-preview"
                className="relative flex h-40 w-full max-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm"
              >
                {logoPreviewUrl && !logoPreviewBroken ? (
                  <Image
                    src={logoPreviewUrl}
                    alt={`Logo da loja ${values.name || initialValues.slug}`}
                    fill
                    sizes="220px"
                    unoptimized
                    className="object-contain p-3"
                    onError={() => setLogoPreviewBroken(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">Sem logo</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">Preview da logo atual no cardápio e no painel público.</p>
            </div>

            <div className="space-y-4">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setLogoUploadMode("url")}
                  data-testid="settings-logo-mode-url"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    logoUploadMode === "url" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Link da imagem
                </button>
                <button
                  type="button"
                  onClick={() => setLogoUploadMode("upload")}
                  data-testid="settings-logo-mode-upload"
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    logoUploadMode === "upload" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Enviar arquivo
                </button>
              </div>

              {logoUploadMode === "url" ? (
                <div key="logo-mode-url" className="space-y-1.5">
                  <label htmlFor="settings-store-logo-url" className="block text-sm font-medium text-zinc-800">
                    URL da logo
                  </label>
                  <input
                    id="settings-store-logo-url"
                    type="url"
                    value={logoUrlValue}
                    onChange={(event) => updateField("logo_url", event.target.value)}
                    aria-invalid={Boolean(logoUrlError)}
                    maxLength={STORE_LOGO_URL_MAX_LENGTH}
                    className="cx-input"
                    placeholder="https://..."
                  />
                  <p className="text-xs text-zinc-500">Cole um link direto para imagem (PNG, JPG, WEBP ou SVG).</p>
                </div>
              ) : (
                <div key="logo-mode-upload" className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
                  <label htmlFor="settings-store-logo-upload" className="block text-sm font-medium text-zinc-800">
                    Arquivo da logo
                  </label>
                  <input
                    id="settings-store-logo-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                  />

                  {selectedLogoFileName ? (
                    <p className="text-xs text-zinc-700">Arquivo selecionado: <span className="font-medium">{selectedLogoFileName}</span></p>
                  ) : (
                    <p className="text-xs text-zinc-500">Nenhum arquivo selecionado.</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleLogoUpload()}
                      disabled={uploadDisabled}
                      className="cx-btn-secondary px-3 py-2 disabled:opacity-60"
                    >
                      {logoUploadPending ? "Enviando..." : "Enviar e aplicar"}
                    </button>
                    <p className="text-xs text-zinc-500">Tipos: PNG, JPG, WEBP, SVG. Máximo de 3 MB.</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-zinc-500">Após alterar, use “Salvar configurações” para garantir o estado final da tela.</p>

              {logoUrlError ? <p className="text-xs text-red-700">{logoUrlError}</p> : null}
              {!logoUrlError && logoPreviewBroken && logoPreviewUrl ? (
                <p className="text-xs text-amber-700">Não foi possível carregar essa imagem. Verifique o link ou envie um arquivo.</p>
              ) : null}
            </div>
          </div>
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
          <p className="mt-1 text-xs text-zinc-500">
            Este slug identifica o endereço público da loja e está bloqueado nesta fase. Ainda não é possível
            alterá-lo.
          </p>
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

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/85 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-900">Modo operacional da loja</p>
          <p className="text-xs text-zinc-600">
            Escolha um estado único para evitar controles conflitantes. A loja só recebe pedidos quando estiver pronta
            para operar e o modo escolhido permitir.
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {OPERATIONAL_MODE_OPTIONS.map((option) => {
            const checked = operationalMode === option.value;
            const disabled = pending || (!readiness.isReady && option.value !== "offline");

            return (
              <label
                key={option.value}
                className={`rounded-xl border bg-white p-3 text-sm transition ${
                  checked ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300"
                } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <span className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="operational_mode"
                    value={option.value}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => updateOperationalMode(option.value)}
                    data-testid={`settings-operational-mode-${option.value}`}
                    className="mt-1 border-zinc-300"
                  />
                  <span>
                    <span className="block font-semibold text-zinc-900">{option.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-600">{option.description}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {operationalModeError ? <p className="mt-3 text-sm text-amber-800">{operationalModeError}</p> : null}

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Horário de atendimento</p>
          <p className="mt-1 text-xs text-zinc-600">
            No modo automático, a loja aceita pedidos somente dentro da janela configurada. Intervalos que cruzam a
            meia-noite, como 18:00 até 02:00, são permitidos.
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-opening-time" className="block text-sm font-medium text-zinc-800">
                Abertura
              </label>
              <input
                id="settings-opening-time"
                name="opening_time"
                type="time"
                value={values.opening_time}
                disabled={pending || operationalMode !== "schedule"}
                onChange={(event) => updateField("opening_time", event.target.value)}
                aria-invalid={Boolean(openingTimeError)}
                data-testid="settings-opening-time"
                className="cx-input mt-1"
              />
              {openingTimeError ? <p className="mt-1 text-xs text-red-700">{openingTimeError}</p> : null}
            </div>

            <div>
              <label htmlFor="settings-closing-time" className="block text-sm font-medium text-zinc-800">
                Fechamento
              </label>
              <input
                id="settings-closing-time"
                name="closing_time"
                type="time"
                value={values.closing_time}
                disabled={pending || operationalMode !== "schedule"}
                onChange={(event) => updateField("closing_time", event.target.value)}
                aria-invalid={Boolean(closingTimeError)}
                data-testid="settings-closing-time"
                className="cx-input mt-1"
              />
              {closingTimeError ? <p className="mt-1 text-xs text-red-700">{closingTimeError}</p> : null}
            </div>
          </div>
        </div>
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          type="button"
          onClick={handleDiscardChanges}
          disabled={pending}
          className="cx-btn-secondary min-h-11 px-4 py-2 disabled:opacity-60"
        >
          Descartar alterações
        </button>
        <button
          type="submit"
          disabled={saveDisabled}
          data-testid="settings-save-button"
          className="cx-btn-primary min-h-11 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
