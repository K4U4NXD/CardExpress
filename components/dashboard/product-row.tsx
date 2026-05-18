"use client";

import { updateProductAction } from "@/app/actions/products";
import { SelectionCheckbox } from "@/components/dashboard/selection-checkbox";
import {
  buildStoreProductImageObjectPath,
  PRODUCT_IMAGE_BUCKET,
  splitStorageObjectPath,
} from "@/lib/public/store-product-image-storage";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatBRL, formatPriceForInput } from "@/lib/validation/price";
import type { Product } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { CategoryOption } from "./create-product-form";

type ProductRowProps = {
  product: Product;
  categoryName: string;
  categoryOptions: CategoryOption[];
  onEditingChange?: (productId: string, isEditing: boolean) => void;
  isSelected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelected?: () => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMoveBusy?: boolean;
  hasMoveIssue?: boolean;
  editRequestToken?: number;
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

type EditProductClientErrors = Partial<Record<"name" | "price" | "category_id" | "image_url" | "stock_quantity", string>>;

type EditProductSnapshot = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  additional_category_ids: string[];
  track_stock: boolean;
  stock_quantity: string;
  is_available: boolean;
  image_url: string;
};

function normalizeImageUrlValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function buildEditProductSnapshot(product: Product): EditProductSnapshot {
  return {
    name: product.name,
    description: product.description ?? "",
    price: formatPriceForInput(product.price),
    category_id: product.category_id ?? "",
    additional_category_ids: [...(product.additional_category_ids ?? [])].sort(),
    track_stock: Boolean(product.track_stock),
    stock_quantity: String(product.stock_quantity ?? 0),
    is_available: Boolean(product.is_available),
    image_url: normalizeImageUrlValue(product.image_url),
  };
}

function normalizeSnapshot(snapshot: EditProductSnapshot): EditProductSnapshot {
  return {
    ...snapshot,
    name: snapshot.name.trim(),
    description: snapshot.description.trim(),
    price: snapshot.price.trim(),
    category_id: snapshot.category_id.trim(),
    stock_quantity: snapshot.track_stock ? snapshot.stock_quantity.trim() : "0",
    is_available: snapshot.track_stock ? true : snapshot.is_available,
    image_url: snapshot.image_url.trim(),
    additional_category_ids: [...snapshot.additional_category_ids].sort(),
  };
}

function snapshotsEqual(a: EditProductSnapshot, b: EditProductSnapshot) {
  const left = normalizeSnapshot(a);
  const right = normalizeSnapshot(b);

  return JSON.stringify(left) === JSON.stringify(right);
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

function EditProductFormActions({
  isDirty,
  imageUploadPending,
  onCancel,
}: {
  isDirty: boolean;
  imageUploadPending: boolean;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  const saveDisabled = !isDirty || imageUploadPending || pending;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {!isDirty ? (
        <p className="text-xs text-zinc-500">Altere algum campo para salvar.</p>
      ) : (
        <p className="text-xs text-zinc-500">Revise as alterações antes de salvar.</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saveDisabled}
          className="cx-btn-primary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending || imageUploadPending}
          className="cx-btn-secondary px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ProductRow({
  product,
  categoryName,
  categoryOptions,
  onEditingChange,
  isSelected = false,
  selectionDisabled = false,
  onToggleSelected,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  isMoveBusy = false,
  hasMoveIssue = false,
  editRequestToken = 0,
}: ProductRowProps) {
  const [editing, setEditing] = useState(false);
  const initialSnapshot = useMemo(() => buildEditProductSnapshot(product), [product]);
  const [editName, setEditName] = useState(() => initialSnapshot.name);
  const [editDescription, setEditDescription] = useState(() => initialSnapshot.description);
  const [editPrice, setEditPrice] = useState(() => initialSnapshot.price);
  const [trackStock, setTrackStock] = useState<boolean>(() => initialSnapshot.track_stock);
  const [editStockQuantity, setEditStockQuantity] = useState(() => initialSnapshot.stock_quantity);
  const [editIsAvailable, setEditIsAvailable] = useState(() => initialSnapshot.is_available);
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [editImageUrl, setEditImageUrl] = useState<string>(() => initialSnapshot.image_url);
  const [selectedPrimaryCategoryId, setSelectedPrimaryCategoryId] = useState(() => initialSnapshot.category_id);
  const [selectedAdditionalCategoryIds, setSelectedAdditionalCategoryIds] = useState<Set<string>>(
    () => new Set(initialSnapshot.additional_category_ids)
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewBroken, setImagePreviewBroken] = useState(false);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const [imageUploadFeedback, setImageUploadFeedback] = useState<ProductImageUploadFeedback | null>(null);
  const [clientErrors, setClientErrors] = useState<EditProductClientErrors>({});
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseClientRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const selectedImageFileName = selectedImageFile?.name ?? "";
  const currentSnapshot = useMemo<EditProductSnapshot>(
    () => ({
      name: editName,
      description: editDescription,
      price: editPrice,
      category_id: selectedPrimaryCategoryId,
      additional_category_ids: Array.from(selectedAdditionalCategoryIds),
      track_stock: trackStock,
      stock_quantity: editStockQuantity,
      is_available: editIsAvailable,
      image_url: editImageUrl,
    }),
    [
      editDescription,
      editImageUrl,
      editIsAvailable,
      editName,
      editPrice,
      editStockQuantity,
      selectedAdditionalCategoryIds,
      selectedPrimaryCategoryId,
      trackStock,
    ]
  );
  const isDirty = !snapshotsEqual(currentSnapshot, initialSnapshot);

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
    if (editRequestToken > 0) {
      resetEditImageState();
      setEditingState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestToken]);

  useEffect(() => {
    if (!editing) {
      restoreEditSnapshot(initialSnapshot);
    }
  }, [editing, initialSnapshot]);

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
    restoreEditSnapshot(initialSnapshot);
    setSelectedImageFile(null);
    setImagePreviewBroken(false);
    setImageUploadFeedback(null);
    setClientErrors({});
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
  }

  function restoreEditSnapshot(snapshot: EditProductSnapshot) {
    setEditName(snapshot.name);
    setEditDescription(snapshot.description);
    setEditPrice(snapshot.price);
    setEditImageUrl(snapshot.image_url);
    setTrackStock(snapshot.track_stock);
    setEditStockQuantity(snapshot.stock_quantity);
    setEditIsAvailable(snapshot.is_available);
    setSelectedPrimaryCategoryId(snapshot.category_id);
    setSelectedAdditionalCategoryIds(new Set(snapshot.additional_category_ids));
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
          text: "Não foi possível enviar a imagem agora. Tente novamente em instantes.",
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
          text: "O upload foi concluído, mas não foi possível preparar a imagem pública. Tente enviar novamente.",
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
    setEditImageUrl("");
    setImageMode("url");
    setImagePreviewBroken(false);
    setImageUploadFeedback(null);
    clearClientError("image_url");
    clearUploadInput();
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

  function clearClientError(field: keyof EditProductClientErrors) {
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: EditProductClientErrors = {};
    const priceValue = Number(editPrice.replace(",", "."));
    const trimmedImageUrl = editImageUrl.trim();

    if (!editName.trim()) {
      nextErrors.name = "Informe o nome do produto.";
    }
    if (!editPrice.trim()) {
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
      const stockQuantity = Number(editStockQuantity);
      if (!editStockQuantity.trim() || !Number.isInteger(stockQuantity) || stockQuantity < 0) {
        nextErrors.stock_quantity = "Informe uma quantidade de estoque válida.";
      }
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  const isVisibleOnPublicMenu = product.is_active && product.is_available;
  const isPurchasableNow =
    product.is_active && product.is_available && (!product.track_stock || product.stock_quantity > 0);
  const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const stockSummary = product.track_stock
    ? `${product.stock_quantity} ${product.stock_quantity === 1 ? "unidade" : "unidades"}`
    : "sem controle de estoque";
  const additionalCategoryIds = product.additional_category_ids ?? [];
  const additionalCategoryNames = additionalCategoryIds
    .map((categoryId) => categoryOptions.find((category) => category.id === categoryId)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border p-2.5 shadow-[0_16px_34px_-30px_rgba(24,24,27,0.45)] transition md:p-4 ${
          isSelected ? "border-[#9f1239]/35 bg-[#fff7ed] ring-1 ring-[#9f1239]/20" : "border-[#eadfd2] bg-white"
        }`}
      >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#9f1239]/70 via-[#c58a1a]/80 to-transparent" />
      {!editing ? (
        <div className="space-y-2.5 md:space-y-3">
          <div className="mb-0.5 flex items-center justify-between md:hidden">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Ordem na lista</p>
            <div className="flex items-center gap-2">
              <SelectionCheckbox
                checked={isSelected}
                onChange={onToggleSelected ?? (() => undefined)}
                disabled={selectionDisabled}
                label={`Selecionar produto ${product.name}`}
              />
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
          </div>

          <div className="flex flex-wrap items-start justify-between gap-2.5 md:gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-zinc-900 sm:text-lg">{product.name}</p>
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-700">
                  {categoryName}
                </span>
                {additionalCategoryNames.slice(0, 2).map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-600"
                  >
                    {name}
                  </span>
                ))}
                {additionalCategoryNames.length > 2 ? (
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                    +{additionalCategoryNames.length - 2} categorias
                  </span>
                ) : null}
              </div>
              {product.description ? (
                <p className="overflow-hidden text-sm text-zinc-600 [display:-webkit-box] [-webkit-line-clamp:1] md:[-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                  {product.description}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">Sem descrição cadastrada.</p>
              )}
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-right md:rounded-xl md:px-3 md:py-2">
                <p className="hidden text-[10px] font-semibold uppercase tracking-wide text-zinc-500 md:block">Preço</p>
                <p className="text-base font-semibold leading-tight text-[#9f1239] sm:text-lg">{formatBRL(product.price)}</p>
              </div>
              <div className="hidden md:block">
                <SelectionCheckbox
                  checked={isSelected}
                  onChange={onToggleSelected ?? (() => undefined)}
                  disabled={selectionDisabled}
                  label={`Selecionar produto ${product.name}`}
                  testId={`product-select-${product.id}`}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-[11px]">
            <span
              className={`rounded-full px-2 md:px-2.5 py-0.5 font-medium ${
                product.is_active ? "border border-rose-200 bg-rose-50 text-rose-900" : "border border-zinc-200 bg-zinc-100 text-zinc-700"
              }`}
            >
              {product.is_active ? "Ativo" : "Inativo"}
            </span>
            {product.is_active ? (
              <span
                className={`rounded-full px-2 md:px-2.5 py-0.5 font-medium ${
                  product.is_available ? "border border-emerald-200 bg-white text-emerald-700" : "border border-amber-200 bg-amber-50 text-amber-900"
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

          <div className="grid gap-1.5 rounded-xl border border-[#eadfd2] bg-[#fffaf2] px-3 py-2 text-xs text-zinc-600 sm:grid-cols-3">
            <p>
              <span className="font-medium text-zinc-700">Cardápio público:</span>{" "}
              {isVisibleOnPublicMenu ? "visível" : "oculto"}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Compra agora:</span>{" "}
              {isPurchasableNow ? "apta" : "indisponível"}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Estoque:</span> {stockSummary}
            </p>
          </div>

        </div>
      ) : (
        <form action={updateProductAction} noValidate onSubmit={handleEditSubmit} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="image_url" value={editImageUrl.trim()} />
          <div>
            <label className="block text-sm font-medium text-zinc-800">Nome</label>
            <input
              name="name"
              type="text"
              required
              value={editName}
              onChange={(event) => {
                clearClientError("name");
                setEditName(event.target.value);
              }}
              aria-invalid={Boolean(clientErrors.name)}
              aria-describedby={clientErrors.name ? `edit-product-name-error-${product.id}` : undefined}
              className={`cx-input mt-1 ${clientErrors.name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
            />
            {clientErrors.name ? (
              <p id={`edit-product-name-error-${product.id}`} className="mt-1 text-xs text-red-700">
                {clientErrors.name}
              </p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Descrição</label>
            <textarea
              name="description"
              rows={2}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
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
                value={editPrice}
                onChange={(event) => {
                  clearClientError("price");
                  setEditPrice(event.target.value);
                }}
                aria-invalid={Boolean(clientErrors.price)}
                aria-describedby={clientErrors.price ? `edit-product-price-error-${product.id}` : undefined}
                className={`cx-input mt-1 ${clientErrors.price ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              />
              {clientErrors.price ? (
                <p id={`edit-product-price-error-${product.id}`} className="mt-1 text-xs text-red-700">
                  {clientErrors.price}
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Categoria</label>
              <select
                name="category_id"
                required
                value={selectedPrimaryCategoryId}
                onChange={(event) => {
                  clearClientError("category_id");
                  handlePrimaryCategoryChange(event.target.value);
                }}
                aria-invalid={Boolean(clientErrors.category_id)}
                aria-describedby={clientErrors.category_id ? `edit-product-category-error-${product.id}` : undefined}
                className={`cx-select mt-1 ${clientErrors.category_id ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {clientErrors.category_id ? (
                <p id={`edit-product-category-error-${product.id}`} className="mt-1 text-xs text-red-700">
                  {clientErrors.category_id}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="text-sm font-semibold text-zinc-900">Categorias adicionais</p>
            <p className="mt-1 text-xs text-zinc-600">O produto aparecerá em todas as categorias selecionadas.</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categoryOptions.map((category) => {
                const isPrimary = selectedPrimaryCategoryId === category.id;
                const isChecked = isPrimary || selectedAdditionalCategoryIds.has(category.id);

                return (
                  <label
                    key={category.id}
                    className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      isPrimary
                        ? "border-zinc-300 bg-zinc-50 text-zinc-500"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="additional_category_ids"
                      value={category.id}
                      disabled={isPrimary}
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
                  value={editStockQuantity}
                  onChange={(event) => {
                    clearClientError("stock_quantity");
                    setEditStockQuantity(event.target.value);
                  }}
                  aria-invalid={Boolean(clientErrors.stock_quantity)}
                  aria-describedby={clientErrors.stock_quantity ? `edit-product-stock-error-${product.id}` : undefined}
                  className={`cx-input mt-1 max-w-xs ${clientErrors.stock_quantity ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                />
                {clientErrors.stock_quantity ? (
                  <p id={`edit-product-stock-error-${product.id}`} className="mt-1 text-xs text-red-700">
                    {clientErrors.stock_quantity}
                  </p>
                ) : null}
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
                    checked={editIsAvailable}
                    onChange={(event) => setEditIsAvailable(event.target.checked)}
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
                        clearClientError("image_url");
                        setEditImageUrl(event.target.value);
                        setImageUploadFeedback(null);
                      }}
                      aria-invalid={Boolean(clientErrors.image_url)}
                      aria-describedby={clientErrors.image_url ? `edit-product-image-url-error-${product.id}` : undefined}
                      className={`cx-input ${clientErrors.image_url ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                      placeholder="https://..."
                    />
                    {clientErrors.image_url ? (
                      <p id={`edit-product-image-url-error-${product.id}`} className="text-xs text-red-700">
                        {clientErrors.image_url}
                      </p>
                    ) : null}
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
          <EditProductFormActions
            isDirty={isDirty}
            imageUploadPending={imageUploadPending}
            onCancel={() => {
              resetEditImageState();
              setEditingState(false);
            }}
          />
        </form>
      )}
      </div>
      {/*
      {deleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-product-dialog-title-${product.id}`}
        >
          <div className="absolute inset-0 bg-zinc-950/35" onClick={closeDeleteConfirmation} />

          <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_-28px_rgba(24,24,27,0.85)] sm:p-6">
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
      ) : null}
      */}
    </>
  );
}
