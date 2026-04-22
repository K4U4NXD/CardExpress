"use client";

import {
  deleteProductAction,
  toggleProductActiveAction,
  toggleProductAvailabilityAction,
  updateProductAction,
} from "@/app/actions/products";
import {
  buildStoreProductImageObjectPath,
  PRODUCT_IMAGE_BUCKET,
  splitStorageObjectPath,
} from "@/lib/public/store-product-image-storage";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatBRL, formatPriceForInput } from "@/lib/validation/price";
import type { Product } from "@/types";
import { useEffect, useRef, useState } from "react";
import type { CategoryOption } from "./create-product-form";

type ProductRowProps = {
  product: Product;
  categoryName: string;
  categoryOptions: CategoryOption[];
  onEditingChange?: (productId: string, isEditing: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMoveBusy?: boolean;
  hasMoveIssue?: boolean;
};

const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const PRODUCT_IMAGE_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

type ProductImageUploadFeedback = {
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

export function ProductRow({
  product,
  categoryName,
  categoryOptions,
  onEditingChange,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isMoveBusy = false,
  hasMoveIssue = false,
}: ProductRowProps) {
  const [editing, setEditing] = useState(false);
  const [trackStock, setTrackStock] = useState<boolean>(() => Boolean(product.track_stock));
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [editImageUrl, setEditImageUrl] = useState<string>(() => normalizeImageUrlValue(product.image_url));
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadFeedback, setImageUploadFeedback] = useState<ProductImageUploadFeedback | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const pendingDeleteFormRef = useRef<HTMLFormElement | null>(null);
  const skipDeleteConfirmRef = useRef(false);
  const deleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedImageFileName = selectedImageFile?.name ?? "";

  const setEditingState = (isEditing: boolean) => {
    setEditing(isEditing);
    onEditingChange?.(product.id, isEditing);
  };

  useEffect(() => {
    return () => {
      onEditingChange?.(product.id, false);
    };
  }, [onEditingChange, product.id]);

  useEffect(() => {
    setImagePreviewBroken(false);
  }, [editImageUrl]);

  useEffect(() => {
    if (!editing) {
      setEditImageUrl(normalizeImageUrlValue(product.image_url));
      setTrackStock(Boolean(product.track_stock));
    }
  }, [editing, product.image_url, product.track_stock]);

  useEffect(() => {
    if (typeof trackStock !== "boolean") {
      console.error("[products:edit][controlled-warning-candidate] trackStock is not boolean", {
        productId: product.id,
        trackStock,
      });
    }
  }, [product.id, trackStock]);

  useEffect(() => {
    if (typeof editImageUrl !== "string") {
      console.error("[products:edit][controlled-warning-candidate] editImageUrl is not string", {
        productId: product.id,
        editImageUrl,
      });
    }
  }, [editImageUrl, product.id]);

  useEffect(() => {
    if (!deleteConfirmOpen) {
      return;
    }

    deleteCancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setDeleteConfirmOpen(false);
      pendingDeleteFormRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteConfirmOpen]);

  useEffect(() => {
    if (imageMode !== "url") {
      return;
    }

    setSelectedImageFile(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  }, [imageMode]);

  function resetEditImageState() {
    setImageMode("url");
    setEditImageUrl(normalizeImageUrlValue(product.image_url));
    setTrackStock(Boolean(product.track_stock));
    setSelectedImageFile(null);
    setImagePreviewBroken(false);
    setImageUploadFeedback(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  }

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

    const trimmedStoreId = String(product.store_id ?? "").trim();
    if (!trimmedStoreId) {
      setImageUploadFeedback({
        tone: "error",
        text: "Não foi possível identificar a loja deste produto para enviar a imagem.",
      });
      return;
    }

    let objectPath = "";
    try {
      objectPath = buildStoreProductImageObjectPath({
        storeId: trimmedStoreId,
        fileName: selectedImageFile.name,
        mimeType: selectedImageFile.type,
        productId: product.id,
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
      flow: "edit",
      bucket: PRODUCT_IMAGE_BUCKET,
      storeId: trimmedStoreId,
      productId: String(product.id ?? "").trim(),
      productStoreId: String(product.store_id ?? "").trim(),
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
      console.info("[products:image-upload][edit][request]", debugContext);
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
          console.error("[products:image-upload][edit][error]", {
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
          console.error("[products:image-upload][edit][error] missing publicUrl", debugContext);
        }

        setImageUploadFeedback({
          tone: "error",
          text: `Upload concluído, mas a URL pública não foi gerada.\n\nDEBUG:\n${safeSerializeDebug(debugContext)}`,
        });
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.info("[products:image-upload][edit][success]", {
          ...debugContext,
          publicUrl,
        });
      }

      setEditImageUrl(publicUrl);
      setImageMode("upload");
      setImagePreviewBroken(false);
      clearUploadInput();
      setImageUploadFeedback({
        tone: "success",
        text: "Upload concluído. Salve o produto para persistir a nova imagem.",
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
    setEditImageUrl("");
    setImageMode("url");
    setImagePreviewBroken(false);
    setImageUploadFeedback(null);
    clearUploadInput();
  }

  function requestDeleteConfirmation(event: React.FormEvent<HTMLFormElement>) {
    if (skipDeleteConfirmRef.current) {
      skipDeleteConfirmRef.current = false;
      return;
    }

    event.preventDefault();
    pendingDeleteFormRef.current = event.currentTarget;
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirmation() {
    setDeleteConfirmOpen(false);
    pendingDeleteFormRef.current = null;
  }

  function confirmDeleteProduct() {
    const form = pendingDeleteFormRef.current;
    if (!form) {
      setDeleteConfirmOpen(false);
      return;
    }

    skipDeleteConfirmRef.current = true;
    form.requestSubmit();
    setDeleteConfirmOpen(false);
    pendingDeleteFormRef.current = null;
  }

  const isVisibleOnPublicMenu = product.is_active && product.is_available;
  const isPurchasableNow =
    product.is_active && product.is_available && (!product.track_stock || product.stock_quantity > 0);
  const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const stockSummary = product.track_stock
    ? `${product.stock_quantity} ${product.stock_quantity === 1 ? "unidade" : "unidades"}`
    : "sem controle de estoque";

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 md:p-4 shadow-[0_16px_34px_-30px_rgba(24,24,27,0.45)]">
      {!editing ? (
        <div className="space-y-2.5 md:space-y-3">
          <div className="mb-0.5 flex items-center justify-between md:hidden">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ordem na lista</p>
            <div
              className={`inline-flex items-center gap-1 rounded-lg border bg-white px-1 py-1 ${
                hasMoveIssue ? "border-red-300" : "border-zinc-200"
              }`}
            >
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst || isMoveBusy}
                aria-label={`Mover produto ${product.name} para cima`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <span aria-hidden>↑</span>
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast || isMoveBusy}
                aria-label={`Mover produto ${product.name} para baixo`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <span aria-hidden>↓</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-2.5 md:gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-zinc-900 sm:text-lg">{product.name}</p>
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                  {categoryName}
                </span>
              </div>
              {product.description ? (
                <p className="overflow-hidden text-sm text-zinc-600 [display:-webkit-box] [-webkit-line-clamp:1] md:[-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                  {product.description}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">Sem descrição cadastrada.</p>
              )}
            </div>

            <div className="shrink-0 rounded-lg md:rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 md:px-3 md:py-2 text-right">
              <p className="hidden md:block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Preço</p>
              <p className="text-base font-semibold leading-tight text-zinc-900 sm:text-lg">{formatBRL(product.price)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-[11px]">
            <span
              className={`rounded-full px-2 md:px-2.5 py-0.5 font-medium ${
                product.is_active ? "bg-sky-100 text-sky-900" : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {product.is_active ? "Ativo" : "Inativo"}
            </span>
            {product.is_active ? (
              <span
                className={`rounded-full px-2 md:px-2.5 py-0.5 font-medium ${
                  product.is_available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {product.is_available ? "Venda liberada" : "Venda pausada"}
              </span>
            ) : null}
            {product.track_stock && product.stock_quantity <= 0 ? (
              <span className="rounded-full bg-amber-100 px-2 md:px-2.5 py-0.5 font-medium text-amber-900">
                Sem estoque
              </span>
            ) : product.track_stock && isLowStock ? (
              <span className="rounded-full bg-orange-100 px-2 md:px-2.5 py-0.5 font-medium text-orange-900">
                Estoque baixo
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
            <p>
              <span className="font-medium text-zinc-700">Cardápio público:</span>{" "}
              {isVisibleOnPublicMenu ? "visível" : "oculto"}
            </p>
            <p className="mt-1">
              <span className="font-medium text-zinc-700">Compra agora:</span>{" "}
              {isPurchasableNow ? "apta" : "indisponível"}
            </p>
            <p className="mt-1">
              <span className="font-medium text-zinc-700">Estoque:</span> {stockSummary}
            </p>
          </div>

          <div className="md:hidden border-t border-zinc-200/80 pt-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTrackStock(Boolean(product.track_stock));
                  resetEditImageState();
                  setEditingState(true);
                }}
                className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs"
              >
                Editar
              </button>
              <form action={toggleProductActiveAction} className="w-full">
                <input type="hidden" name="product_id" value={product.id} />
                <button type="submit" className="cx-btn-secondary w-full justify-center px-2.5 py-1.5 text-xs">
                  {product.is_active ? "Desativar" : "Ativar"}
                </button>
              </form>

              {product.is_active ? (
                <form action={toggleProductAvailabilityAction} className="col-span-2">
                  <input type="hidden" name="product_id" value={product.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
                  >
                    {product.is_available ? "Pausar venda" : "Disponibilizar"}
                  </button>
                </form>
              ) : null}

              <form
                action={deleteProductAction}
                className="col-span-2"
                onSubmit={requestDeleteConfirmation}
              >
                <input type="hidden" name="product_id" value={product.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                >
                  Excluir
                </button>
              </form>
            </div>
          </div>

          <div className="hidden md:block rounded-xl border border-zinc-200 bg-zinc-50/80 p-2.5">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrackStock(Boolean(product.track_stock));
                    resetEditImageState();
                    setEditingState(true);
                  }}
                  className="cx-btn-secondary px-3 py-2"
                >
                  Editar
                </button>
                {product.is_active ? (
                  <form action={toggleProductAvailabilityAction} className="inline">
                    <input type="hidden" name="product_id" value={product.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                    >
                      {product.is_available ? "Pausar venda" : "Disponibilizar"}
                    </button>
                  </form>
                ) : null}
                <form action={toggleProductActiveAction} className="inline">
                  <input type="hidden" name="product_id" value={product.id} />
                  <button type="submit" className="cx-btn-secondary px-3 py-2">
                    {product.is_active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>

              <div className="flex sm:justify-end">
                <form
                  action={deleteProductAction}
                  className="inline"
                  onSubmit={requestDeleteConfirmation}
                >
                  <input type="hidden" name="product_id" value={product.id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form action={updateProductAction} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="image_url" value={editImageUrl.trim()} />
          <div>
            <label className="block text-sm font-medium text-zinc-800">Nome</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={product.name}
              className="cx-input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Descrição</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={product.description ?? ""}
              className="cx-textarea mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Preço (R$)</label>
              <input
                name="price"
                type="text"
                required
                defaultValue={formatPriceForInput(product.price)}
                className="cx-input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Categoria</label>
              <select
                name="category_id"
                required
                defaultValue={product.category_id}
                className="cx-select mt-1"
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                name="track_stock"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="rounded border-zinc-300"
              />
              Controlar estoque?
            </label>
            {trackStock ? (
              <div>
                <label className="block text-sm font-medium text-zinc-800">Quantidade em estoque</label>
                <input
                  name="stock_quantity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={product.stock_quantity}
                  className="cx-input mt-1 max-w-xs"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Com controle de estoque, o produto continua visível no cardápio, mas pode ficar indisponível para
                  compra quando zerar. A pausa/liberação manual da venda é feita no botão da listagem de produtos.
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
                    defaultChecked={product.is_available}
                    className="rounded border-zinc-300"
                  />
                  Venda liberada agora
                </label>
              </>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Imagem do produto</p>
                <p className="mt-1 text-xs text-zinc-600">Escolha link externo ou upload. Apenas uma opção será salva no produto.</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={imageUploadPending || !editImageUrl}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
              >
                Remover imagem
              </button>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-[170px_1fr]">
              <div className="space-y-2">
                <div className="relative flex h-28 w-full max-w-[170px] items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-2">
                  {editImageUrl && !imagePreviewBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editImageUrl}
                      alt={`Preview de ${product.name}`}
                      className="h-full w-full object-cover"
                      onError={() => setImagePreviewBroken(true)}
                    />
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Sem imagem</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">Preview atual da imagem no cardápio.</p>
              </div>

              <div className="space-y-3">
                <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      imageMode === "url" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Link da imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      imageMode === "upload" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    Enviar arquivo
                  </button>
                </div>

                {imageMode === "url" ? (
                  <div key="edit-image-mode-url" className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-800">URL da imagem</label>
                    <input
                      key="edit-image-url-input"
                      type="url"
                      value={normalizeImageUrlValue(editImageUrl)}
                      onChange={(event) => {
                        setEditImageUrl(event.target.value);
                        setImageUploadFeedback(null);
                      }}
                      className="cx-input"
                      placeholder="https://..."
                    />
                    <p className="text-xs text-zinc-500">Cole um link direto para imagem (PNG, JPG, WEBP ou SVG).</p>
                  </div>
                ) : (
                  <div key="edit-image-mode-upload" className="space-y-2.5 rounded-xl border border-zinc-200 bg-white p-3">
                    <label htmlFor={`product-image-upload-${product.id}`} className="block text-sm font-medium text-zinc-800">
                      Arquivo da imagem
                    </label>
                    <input
                      key="edit-image-file-input"
                      id={`product-image-upload-${product.id}`}
                      ref={imageFileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleImageFileChange}
                      disabled={imageUploadPending}
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
                        disabled={imageUploadPending || !selectedImageFile}
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="cx-btn-primary px-3 py-2"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                resetEditImageState();
                setEditingState(false);
              }}
              className="cx-btn-secondary px-3 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      </div>

      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[80]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-product-dialog-title-${product.id}`}
        >
          <div className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[1px]" onClick={closeDeleteConfirmation} />

          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
              <h2 id={`delete-product-dialog-title-${product.id}`} className="text-base font-semibold text-zinc-900">
                Excluir produto?
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Excluir o produto &quot;{product.name}&quot;? Se ele tiver histórico, será removido da operação e preservado no histórico.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  ref={deleteCancelButtonRef}
                  type="button"
                  onClick={closeDeleteConfirmation}
                  className="cx-btn-secondary px-3 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Confirmar exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
