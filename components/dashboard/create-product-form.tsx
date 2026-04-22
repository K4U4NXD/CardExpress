"use client";

import { createProductAction, type ProductFormState } from "@/app/actions/products";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  buildStoreProductImageObjectPath,
  PRODUCT_IMAGE_BUCKET,
  splitStorageObjectPath,
} from "@/lib/public/store-product-image-storage";
import { useActionState, useEffect, useRef, useState } from "react";

export type CategoryOption = { id: string; name: string };

type CreateProductFormProps = {
  storeId: string;
  categories: CategoryOption[];
  onCancel?: () => void;
};

const initial: ProductFormState = {};
const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const PRODUCT_IMAGE_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

type ImageUploadFeedback = {
  tone: "error" | "success" | "warning";
  text: string;
};

function normalizeImageUrlValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeSerializeDebug(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toDebugErrorObject(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { raw: String(error) };
  }

  const record = error as Record<string, unknown>;
  return {
    name: record.name,
    message: record.message,
    statusCode: record.statusCode,
    error: record.error,
    details: record.details,
    code: record.code,
    full: record,
  };
}

export function CreateProductForm({ storeId, categories, onCancel }: CreateProductFormProps) {
  const [state, formAction, pending] = useActionState(createProductAction, initial);
  const [trackStock, setTrackStock] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadFeedback, setImageUploadFeedback] = useState<ImageUploadFeedback | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const disabled = categories.length === 0;
  const selectedImageFileName = selectedImageFile?.name ?? "";

  useEffect(() => {
    if (typeof trackStock !== "boolean") {
      console.error("[products:create][controlled-warning-candidate] trackStock is not boolean", {
        trackStock,
      });
    }
  }, [trackStock]);

  useEffect(() => {
    if (typeof imageUrlValue !== "string") {
      console.error("[products:create][controlled-warning-candidate] imageUrlValue is not string", {
        imageUrlValue,
      });
    }
  }, [imageUrlValue]);

  useEffect(() => {
    setImagePreviewBroken(false);
  }, [imageUrlValue]);

  useEffect(() => {
    if (imageMode !== "url") {
      return;
    }

    setSelectedImageFile(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  }, [imageMode]);

  function clearUploadInput() {
    setSelectedImageFile(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  }

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedImageFile(nextFile);
    setImageUploadFeedback(null);

    if (!nextFile) {
      return;
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(nextFile.type)) {
      setImageUploadFeedback({
        tone: "warning",
        text: "Use PNG, JPG, WEBP ou SVG para a imagem do produto.",
      });
      clearUploadInput();
      return;
    }

    if (nextFile.size > PRODUCT_IMAGE_MAX_BYTES) {
      setImageUploadFeedback({
        tone: "warning",
        text: "A imagem deve ter no máximo 3 MB.",
      });
      clearUploadInput();
    }
  }

  async function handleImageUpload() {
    if (!selectedImageFile) {
      return;
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(selectedImageFile.type)) {
      setImageUploadFeedback({
        tone: "warning",
        text: "Use PNG, JPG, WEBP ou SVG para a imagem do produto.",
      });
      return;
    }

    if (selectedImageFile.size > PRODUCT_IMAGE_MAX_BYTES) {
      setImageUploadFeedback({
        tone: "warning",
        text: "A imagem deve ter no máximo 3 MB.",
      });
      return;
    }

    const trimmedStoreId = String(storeId ?? "").trim();
    if (!trimmedStoreId) {
      setImageUploadFeedback({
        tone: "error",
        text: "Não foi possível identificar a loja para enviar a imagem.",
      });
      return;
    }

    let objectPath = "";
    try {
      objectPath = buildStoreProductImageObjectPath({
        storeId: trimmedStoreId,
        fileName: selectedImageFile.name,
        mimeType: selectedImageFile.type,
        productId: null,
      });
    } catch (error) {
      setImageUploadFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Não foi possível montar o caminho do upload.",
      });
      return;
    }

    setImageUploadPending(true);
    setImageUploadFeedback(null);

    const supabase =
      supabaseClientRef.current ??
      (() => {
        const client = createBrowserSupabaseClient();
        supabaseClientRef.current = client;
        return client;
      })();

    const [authProbe, storeProbe] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("stores").select("id, owner_id").eq("id", trimmedStoreId).maybeSingle(),
    ]);

    const authUserId = authProbe.data.user?.id ?? null;

    const debugContext = {
      flow: "create",
      bucket: PRODUCT_IMAGE_BUCKET,
      storeId: trimmedStoreId,
      productId: "draft",
      objectPath,
      objectPathSegments: splitStorageObjectPath(objectPath),
      authUserId,
      authError: authProbe.error ? toDebugErrorObject(authProbe.error) : null,
      storeOwnerId: storeProbe.data?.owner_id ?? null,
      storeProbeError: storeProbe.error ? toDebugErrorObject(storeProbe.error) : null,
      file: {
        name: selectedImageFile.name,
        type: selectedImageFile.type,
        size: selectedImageFile.size,
      },
    };

    if (process.env.NODE_ENV !== "production") {
      console.info("[products:image-upload][create][request]", debugContext);
    }

    try {
      const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(objectPath, selectedImageFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: selectedImageFile.type,
      });

      if (uploadError) {
        const debugError = toDebugErrorObject(uploadError);
        if (process.env.NODE_ENV !== "production") {
          console.error("[products:image-upload][create][error]", {
            ...debugContext,
            uploadError: debugError,
          });
        }

        setImageUploadFeedback({
          tone: "error",
          text: `Falha no upload. ${uploadError.message}\n\nDEBUG:\n${safeSerializeDebug({
            ...debugContext,
            uploadError: debugError,
          })}`,
        });
        return;
      }

      const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath);
      const publicUrl = normalizeImageUrlValue(data?.publicUrl);

      if (!publicUrl) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[products:image-upload][create][error] missing publicUrl", debugContext);
        }

        setImageUploadFeedback({
          tone: "error",
          text: `Upload concluído, mas a URL pública não foi gerada.\n\nDEBUG:\n${safeSerializeDebug(debugContext)}`,
        });
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.info("[products:image-upload][create][success]", {
          ...debugContext,
          publicUrl,
        });
      }

      setImageUrlValue(publicUrl);
      setImageMode("upload");
      setImagePreviewBroken(false);
      clearUploadInput();
      setImageUploadFeedback({
        tone: "success",
        text: "Upload concluído. A imagem será salva ao adicionar o produto.",
      });
    } catch (error) {
      setImageUploadFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Não foi possível enviar a imagem agora.",
      });
    } finally {
      setImageUploadPending(false);
    }
  }

  function handleRemoveImage() {
    setImageUrlValue("");
    setImagePreviewBroken(false);
    clearUploadInput();
    setImageUploadFeedback(null);
    setImageMode("url");
  }

  return (
    <form action={formAction} data-testid="create-product-form" className="space-y-4">
      <input type="hidden" name="image_url" value={imageUrlValue.trim()} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="product-name" className="block text-sm font-medium text-zinc-800">
            Nome
          </label>
          <input
            id="product-name"
            name="name"
            type="text"
            required
            disabled={disabled}
            placeholder="Ex.: Refrigerante 350ml"
            data-testid="product-name-input"
            className="cx-input mt-1 disabled:bg-zinc-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="product-description" className="block text-sm font-medium text-zinc-800">
            Descrição
          </label>
          <textarea
            id="product-description"
            name="description"
            rows={2}
            disabled={disabled}
            className="cx-textarea mt-1 disabled:bg-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="product-price" className="block text-sm font-medium text-zinc-800">
            Preço (R$)
          </label>
          <input
            id="product-price"
            name="price"
            type="text"
            required
            disabled={disabled}
            placeholder="Ex.: 8,90"
            data-testid="product-price-input"
            className="cx-input mt-1 disabled:bg-zinc-100"
          />
        </div>
        <div>
          <label htmlFor="product-category" className="block text-sm font-medium text-zinc-800">
            Categoria
          </label>
          <select
            id="product-category"
            name="category_id"
            required
            disabled={disabled}
            data-testid="product-category-select"
            className="cx-select mt-1 disabled:bg-zinc-100"
          >
            <option value="">Selecione…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
            <input
              type="checkbox"
              name="track_stock"
              checked={trackStock}
              onChange={(e) => setTrackStock(e.target.checked)}
              disabled={disabled}
              data-testid="product-track-stock-toggle"
              className="rounded border-zinc-300"
            />
            Controlar estoque?
          </label>
          {trackStock ? (
            <div>
              <label htmlFor="product-stock" className="block text-sm font-medium text-zinc-800">
                Quantidade em estoque
              </label>
              <input
                id="product-stock"
                name="stock_quantity"
                type="number"
                min={0}
                step={1}
                disabled={disabled}
                data-testid="product-stock-input"
                className="cx-input mt-1 max-w-xs disabled:bg-zinc-100"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Com controle de estoque, a visibilidade pública depende da quantidade. A pausa/liberação manual da
                venda pode ser feita na listagem de produtos.
              </p>
            </div>
          ) : (
            <>
              <input type="hidden" name="stock_quantity" value="0" />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  name="is_available"
                  value="on"
                  defaultChecked
                  disabled={disabled}
                  className="rounded border-zinc-300"
                />
                Venda liberada agora
              </label>
              <p className="text-xs text-zinc-500">
                Sem controle de estoque, esta opção controla diretamente a venda do produto.
              </p>
            </>
          )}
        </div>

        <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Imagem do produto (opcional)</p>
              <p className="mt-1 text-xs text-zinc-600">Use link externo ou upload de arquivo. Apenas uma opção será salva no produto.</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled || pending || imageUploadPending || !imageUrlValue}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
            >
              Remover imagem
            </button>
          </div>

          <div className="mt-3 grid gap-4 lg:grid-cols-[170px_1fr]">
            <div className="space-y-2">
              <div className="relative flex h-28 w-full max-w-[170px] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-2">
                {imageUrlValue && !imagePreviewBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrlValue}
                    alt="Preview da imagem do produto"
                    className="h-full w-full object-cover"
                    onError={() => setImagePreviewBroken(true)}
                  />
                ) : (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Sem imagem</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">A imagem aparece no cardápio público.</p>
            </div>

            <div className="space-y-3">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  data-testid="product-image-mode-url"
                  disabled={disabled || pending || imageUploadPending}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    imageMode === "url" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Link da imagem
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  data-testid="product-image-mode-upload"
                  disabled={disabled || pending || imageUploadPending}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    imageMode === "upload" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  Enviar arquivo
                </button>
              </div>

              {imageMode === "url" ? (
                <div key="create-image-mode-url" className="space-y-1.5">
                  <label htmlFor="product-image-url" className="block text-sm font-medium text-zinc-800">
                    URL da imagem
                  </label>
                  <input
                    key="create-image-url-input"
                    id="product-image-url"
                    type="url"
                    value={normalizeImageUrlValue(imageUrlValue)}
                    onChange={(event) => {
                      setImageUrlValue(event.target.value);
                      setImageUploadFeedback(null);
                    }}
                    disabled={disabled || pending || imageUploadPending}
                    placeholder="https://..."
                    className="cx-input disabled:bg-zinc-100"
                  />
                  <p className="text-xs text-zinc-500">Cole um link direto para imagem (PNG, JPG, WEBP ou SVG).</p>
                </div>
              ) : (
                <div key="create-image-mode-upload" className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
                  <label htmlFor="product-image-upload" className="block text-sm font-medium text-zinc-800">
                    Arquivo da imagem
                  </label>
                  <input
                    key="create-image-file-input"
                    id="product-image-upload"
                    ref={imageFileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleImageFileChange}
                    disabled={disabled || pending || imageUploadPending}
                    className="block w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                  />

                  {selectedImageFileName ? (
                    <p className="text-xs text-zinc-700">Arquivo selecionado: <span className="font-medium">{selectedImageFileName}</span></p>
                  ) : (
                    <p className="text-xs text-zinc-500">Nenhum arquivo selecionado.</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleImageUpload()}
                      disabled={disabled || pending || imageUploadPending || !selectedImageFile}
                      data-testid="product-image-upload-submit"
                      className="cx-btn-secondary px-3 py-2 disabled:opacity-60"
                    >
                      {imageUploadPending ? "Enviando..." : "Enviar e usar"}
                    </button>
                    <p className="text-xs text-zinc-500">Tipos: PNG, JPG, WEBP, SVG. Máximo de 3 MB.</p>
                  </div>
                </div>
              )}

              {imageUploadFeedback ? (
                <p
                  className={`text-xs ${
                    imageUploadFeedback.tone === "success"
                      ? "text-emerald-700"
                      : imageUploadFeedback.tone === "warning"
                        ? "text-amber-700"
                        : "text-red-700"
                  }`}
                  role={imageUploadFeedback.tone === "error" ? "alert" : "status"}
                >
                  {imageUploadFeedback.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {disabled ? (
        <p className="text-sm text-amber-800">
          Cadastre pelo menos uma categoria ativa antes de adicionar produtos.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || disabled}
          data-testid="submit-create-product"
          className="cx-btn-primary px-4 py-2 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Adicionar produto"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="cx-btn-secondary px-4 py-2"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
