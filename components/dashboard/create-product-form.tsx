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

type ProductClientErrors = Partial<Record<"name" | "price" | "category_id" | "image_url" | "stock_quantity", string>>;

const EMPTY_PRODUCT_VALUES = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  is_available: true,
};

function normalizeImageUrlValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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
  const [formValues, setFormValues] = useState(EMPTY_PRODUCT_VALUES);
  const [trackStock, setTrackStock] = useState(false);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageUrlValue, setImageUrlValue] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadFeedback, setImageUploadFeedback] = useState<ImageUploadFeedback | null>(null);
  const [clientErrors, setClientErrors] = useState<ProductClientErrors>({});
  const [selectedPrimaryCategoryId, setSelectedPrimaryCategoryId] = useState("");
  const [selectedAdditionalCategoryIds, setSelectedAdditionalCategoryIds] = useState<Set<string>>(() => new Set());
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const disabled = categories.length === 0;
  const selectedImageFileName = selectedImageFile?.name ?? "";

  useEffect(() => {
    if (!state?.values) {
      return;
    }

    setFormValues({
      name: state.values.name,
      description: state.values.description,
      price: state.values.price,
      stock_quantity: state.values.stock_quantity,
      is_available: state.values.is_available,
    });
    setTrackStock(state.values.track_stock);
    setSelectedPrimaryCategoryId(state.values.category_id);
    setSelectedAdditionalCategoryIds(new Set(state.values.additional_category_ids));
    setImageUrlValue(state.values.image_url);
    setImageMode(state.values.image_url ? "url" : "url");
    setImagePreviewBroken(false);
  }, [state?.values]);

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
    } catch {
      setImageUploadFeedback({
        tone: "error",
        text: "Não foi possível preparar o envio da imagem agora.",
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
          text: "Não foi possível enviar a imagem agora. Tente novamente em instantes.",
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
          text: "O upload foi concluído, mas não foi possível preparar a imagem pública. Tente enviar novamente.",
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
    } catch {
      setImageUploadFeedback({
        tone: "error",
        text: "Não foi possível enviar a imagem agora. Tente novamente em instantes.",
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
    clearClientError("image_url");
    setImageMode("url");
  }

  function handlePrimaryCategoryChange(categoryId: string) {
    setSelectedPrimaryCategoryId(categoryId);
    setSelectedAdditionalCategoryIds((current) => {
      if (!current.has(categoryId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(categoryId);
      return next;
    });
  }

  function handleAdditionalCategoryChange(categoryId: string, checked: boolean) {
    setSelectedAdditionalCategoryIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  }

  function clearClientError(field: keyof ProductClientErrors) {
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: ProductClientErrors = {};
    const priceValue = Number(formValues.price.replace(",", "."));
    const trimmedImageUrl = imageUrlValue.trim();

    if (!formValues.name.trim()) {
      nextErrors.name = "Informe o nome do produto.";
    }
    if (!formValues.price.trim()) {
      nextErrors.price = "Informe o preço.";
    } else if (!Number.isFinite(priceValue) || priceValue < 0) {
      nextErrors.price = "Informe um preço válido.";
    }
    if (!selectedPrimaryCategoryId) {
      nextErrors.category_id = "Selecione uma categoria.";
    }
    if (trimmedImageUrl) {
      try {
        const url = new URL(trimmedImageUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          nextErrors.image_url = "Informe uma URL de imagem válida.";
        }
      } catch {
        nextErrors.image_url = "Informe uma URL de imagem válida.";
      }
    }
    if (trackStock) {
      const stockQuantity = Number(formValues.stock_quantity);
      if (!formValues.stock_quantity.trim() || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
        nextErrors.stock_quantity = "Informe uma quantidade de estoque válida.";
      }
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} data-testid="create-product-form" className="space-y-4">
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
            value={formValues.name}
            onChange={(event) => {
              clearClientError("name");
              setFormValues((current) => ({ ...current, name: event.target.value }));
            }}
            aria-invalid={Boolean(clientErrors.name)}
            aria-describedby={clientErrors.name ? "product-name-error" : undefined}
            data-testid="product-name-input"
            className={`cx-input mt-1 disabled:bg-zinc-100 ${clientErrors.name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          />
          {clientErrors.name ? (
            <p id="product-name-error" className="mt-1 text-xs text-red-700">
              {clientErrors.name}
            </p>
          ) : null}
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
            value={formValues.description}
            onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
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
            value={formValues.price}
            onChange={(event) => {
              clearClientError("price");
              setFormValues((current) => ({ ...current, price: event.target.value }));
            }}
            aria-invalid={Boolean(clientErrors.price)}
            aria-describedby={clientErrors.price ? "product-price-error" : undefined}
            data-testid="product-price-input"
            className={`cx-input mt-1 disabled:bg-zinc-100 ${clientErrors.price ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          />
          {clientErrors.price ? (
            <p id="product-price-error" className="mt-1 text-xs text-red-700">
              {clientErrors.price}
            </p>
          ) : null}
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
            value={selectedPrimaryCategoryId}
            onChange={(event) => {
              clearClientError("category_id");
              handlePrimaryCategoryChange(event.target.value);
            }}
            aria-invalid={Boolean(clientErrors.category_id)}
            aria-describedby={clientErrors.category_id ? "product-category-error" : undefined}
            data-testid="product-category-select"
            className={`cx-select mt-1 disabled:bg-zinc-100 ${clientErrors.category_id ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
          >
            <option value="">Selecione…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {clientErrors.category_id ? (
            <p id="product-category-error" className="mt-1 text-xs text-red-700">
              {clientErrors.category_id}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4">
          <p className="text-sm font-semibold text-zinc-900">Categorias adicionais</p>
          <p className="mt-1 text-xs text-zinc-600">O produto aparecerá em todas as categorias selecionadas.</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {categories.map((category) => {
              const isPrimary = selectedPrimaryCategoryId === category.id;
              const isChecked = isPrimary || selectedAdditionalCategoryIds.has(category.id);

              return (
                <label
                  key={category.id}
                  className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    isPrimary
                      ? "border-zinc-300 bg-white text-zinc-500"
                      : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="additional_category_ids"
                    value={category.id}
                    disabled={disabled || isPrimary}
                    checked={isChecked}
                    onChange={(event) => handleAdditionalCategoryChange(category.id, event.target.checked)}
                    data-testid={`product-additional-category-${category.id}`}
                    className="rounded border-zinc-300 disabled:opacity-70"
                  />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  {isPrimary ? <span className="text-[11px] font-medium text-zinc-500">Principal</span> : null}
                </label>
              );
            })}
          </div>
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
                value={formValues.stock_quantity}
                onChange={(event) => {
                  clearClientError("stock_quantity");
                  setFormValues((current) => ({ ...current, stock_quantity: event.target.value }));
                }}
                aria-invalid={Boolean(clientErrors.stock_quantity)}
                aria-describedby={clientErrors.stock_quantity ? "product-stock-error" : undefined}
                data-testid="product-stock-input"
                className={`cx-input mt-1 max-w-xs disabled:bg-zinc-100 ${clientErrors.stock_quantity ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              />
              {clientErrors.stock_quantity ? (
                <p id="product-stock-error" className="mt-1 text-xs text-red-700">
                  {clientErrors.stock_quantity}
                </p>
              ) : null}
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
                  checked={formValues.is_available}
                  onChange={(event) => setFormValues((current) => ({ ...current, is_available: event.target.checked }))}
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
                      clearClientError("image_url");
                      setImageUrlValue(event.target.value);
                      setImageUploadFeedback(null);
                    }}
                    disabled={disabled || pending || imageUploadPending}
                    placeholder="https://..."
                    aria-invalid={Boolean(clientErrors.image_url)}
                    aria-describedby={clientErrors.image_url ? "product-image-url-error" : undefined}
                    className={`cx-input disabled:bg-zinc-100 ${clientErrors.image_url ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                  />
                  {clientErrors.image_url ? (
                    <p id="product-image-url-error" className="text-xs text-red-700">
                      {clientErrors.image_url}
                    </p>
                  ) : null}
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
