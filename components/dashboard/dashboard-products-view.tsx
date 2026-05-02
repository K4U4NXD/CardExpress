"use client";

import {
  bulkDeleteProductsAction,
  bulkSetProductsActiveAction,
  bulkSetProductsAvailabilityAction,
  reorderProductsAction,
  type BulkProductsActionResult,
} from "@/app/actions/products";
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { CreateProductForm } from "@/components/dashboard/create-product-form";
import { ProductRow } from "@/components/dashboard/product-row";
import { SelectionCheckbox } from "@/components/dashboard/selection-checkbox";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/shared/toast-provider";
import type { Category, Product } from "@/types";

type DashboardProductsViewProps = {
  storeId: string;
  categories: Category[];
  products: Product[];
};

function reorderById<T extends { id: string }>(items: T[], draggedId: string, targetId: string) {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const toIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function DashboardProductsView({ storeId, categories, products }: DashboardProductsViewProps) {
  const router = useRouter();
  const { enqueueToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState(products);
  const [editingById, setEditingById] = useState<Record<string, boolean>>({});
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [dropTargetProductId, setDropTargetProductId] = useState<string | null>(null);
  const [pendingReorderProductId, setPendingReorderProductId] = useState<string | null>(null);
  const [reorderIssueProductId, setReorderIssueProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [productEditRequest, setProductEditRequest] = useState<{ id: string; token: number } | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<BulkProductsActionResult | null>(null);
  const [bulkDetailsOpen, setBulkDetailsOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();
  const bulkDeleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOrderedProducts(products);
    const currentIds = new Set(products.map((product) => product.id));
    setSelectedProductIds((previous) => {
      const next = new Set(Array.from(previous).filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [products]);

  useEffect(() => {
    if (!reorderIssueProductId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReorderIssueProductId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reorderIssueProductId]);

  const isAnyEditing = useMemo(() => Object.values(editingById).some(Boolean), [editingById]);
  const selectedCount = selectedProductIds.size;
  const selectedProductId = selectedCount === 1 ? Array.from(selectedProductIds)[0] : null;
  const hasSelection = selectedCount > 0;
  const visibleProductIds = useMemo(() => orderedProducts.map((product) => product.id), [orderedProducts]);
  const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => selectedProductIds.has(id));
  const selectionDisabled = isCreateOpen || isAnyEditing || Boolean(pendingReorderProductId) || isBulkPending;
  const bulkActionsDisabled = isCreateOpen || isAnyEditing || isBulkPending || selectedCount === 0;
  const editActionDisabled = selectionDisabled || selectedCount !== 1;
  const canDrag = !isCreateOpen && !isAnyEditing && !pendingReorderProductId && !hasSelection;
  const showBulkToolbar = hasSelection && !isCreateOpen && !isAnyEditing;

  const clearBulkSelection = useCallback(() => {
    setSelectedProductIds(new Set());
    setBulkDeleteConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (isCreateOpen || isAnyEditing) {
      clearBulkSelection();
    }
  }, [clearBulkSelection, isCreateOpen, isAnyEditing]);

  useEffect(() => {
    if (selectedCount === 0) {
      setMobileActionsOpen(false);
    }
  }, [selectedCount]);

  useEffect(() => {
    if (!bulkDeleteConfirmOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    bulkDeleteCancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setBulkDeleteConfirmOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [bulkDeleteConfirmOpen]);

  const setEditingStateForProduct = useCallback((productId: string, isEditing: boolean) => {
    if (isEditing) {
      clearBulkSelection();
      setBulkFeedback(null);
      setBulkDetailsOpen(false);
    }

    setEditingById((prev) => {
      if (!isEditing && !prev[productId]) {
        return prev;
      }

      if (!isEditing) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }

      return { ...prev, [productId]: true };
    });
  }, [clearBulkSelection]);

  const clearDragState = () => {
    setDraggingProductId(null);
    setDropTargetProductId(null);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, productId: string) => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }

    setReorderIssueProductId(null);
    setDraggingProductId(productId);
    setDropTargetProductId(productId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", productId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, productId: string) => {
    if (!canDrag || !draggingProductId || draggingProductId === productId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dropTargetProductId !== productId) {
      setDropTargetProductId(productId);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetProductId: string) => {
    event.preventDefault();

    if (!canDrag || !draggingProductId || draggingProductId === targetProductId) {
      clearDragState();
      return;
    }

    const previousOrder = orderedProducts;
    const nextOrder = reorderById(previousOrder, draggingProductId, targetProductId);

    clearDragState();

    if (!nextOrder) {
      return;
    }

    persistProductOrder(nextOrder, previousOrder, draggingProductId);
  };

  const persistProductOrder = (nextOrder: Product[], previousOrder: Product[], productId: string) => {
    setPendingReorderProductId(productId);
    setReorderIssueProductId(null);
    setOrderedProducts(nextOrder);

    void (async () => {
      try {
        const result = await reorderProductsAction(nextOrder.map((item) => item.id));
        if (!result.ok) {
          setOrderedProducts(previousOrder);
          setReorderIssueProductId(productId);
        }
      } catch {
        setOrderedProducts(previousOrder);
        setReorderIssueProductId(productId);
      } finally {
        setPendingReorderProductId(null);
      }
    })();
  };

  const handleMobileStepReorder = (productId: string, direction: "up" | "down") => {
    if (!canDrag) {
      return;
    }

    const previousOrder = orderedProducts;
    const currentIndex = previousOrder.findIndex((item) => item.id === productId);

    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= previousOrder.length) {
      return;
    }

    const target = previousOrder[targetIndex];
    const nextOrder = reorderById(previousOrder, productId, target.id);
    if (!nextOrder) {
      return;
    }

    persistProductOrder(nextOrder, previousOrder, productId);
  };

  const handleToggleProduct = (productId: string) => {
    if (selectionDisabled) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setSelectedProductIds((previous) => {
      const next = new Set(previous);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleToggleAllProducts = () => {
    if (selectionDisabled || visibleProductIds.length === 0) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setSelectedProductIds((previous) => {
      if (visibleProductIds.every((id) => previous.has(id))) {
        return new Set();
      }
      return new Set(visibleProductIds);
    });
  };

  const showBulkResult = (result: BulkProductsActionResult) => {
    const changed = result.updated + result.deleted + result.archived;
    const hasIssue = result.failed > 0 || result.skipped > 0;
    const tone = result.failed > 0 && changed === 0 ? "error" : hasIssue ? "warning" : "success";

    setBulkFeedback(result);
    setBulkDetailsOpen(false);
    enqueueToast({
      tone,
      title: hasIssue ? "Ação concluída com observações" : "Ação concluída",
      text: result.message,
    });
  };

  const runBulkAction = (action: "activate" | "deactivate" | "pause" | "enable" | "delete") => {
    if (bulkActionsDisabled || selectionDisabled) {
      return;
    }

    const ids = Array.from(selectedProductIds);
    startBulkTransition(() => {
      void (async () => {
        const result =
          action === "delete"
            ? await bulkDeleteProductsAction(ids)
            : action === "pause" || action === "enable"
              ? await bulkSetProductsAvailabilityAction(ids, action === "enable")
              : await bulkSetProductsActiveAction(ids, action === "activate");

        setSelectedProductIds(new Set());
        setBulkDeleteConfirmOpen(false);
        showBulkResult(result);
        router.refresh();
      })();
    });
  };

  const openBulkDeleteModal = () => {
    if (bulkActionsDisabled || selectionDisabled) {
      return;
    }

    setBulkDeleteConfirmOpen(true);
  };

  const openSelectedProductEditor = () => {
    if (editActionDisabled || !selectedProductId) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setProductEditRequest({ id: selectedProductId, token: Date.now() });
  };

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const categoriesForCreate = useMemo(
    () => categories.filter((category) => category.is_active).map((category) => ({ id: category.id, name: category.name })),
    [categories]
  );

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Gerencie os itens exibidos no cardápio público da loja."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-5xl"
        actions={
          <button
            type="button"
            onClick={() => {
              clearBulkSelection();
              setBulkFeedback(null);
              setBulkDetailsOpen(false);
              setIsCreateOpen((open) => !open);
            }}
            data-testid="open-create-product"
            className="cx-btn-secondary px-3 py-2"
          >
            {isCreateOpen ? "Fechar" : "Novo produto"}
          </button>
        }
      />

      <div className="cx-dashboard-page-frame max-w-5xl">
        <DashboardProductsRealtimeSync
          storeId={storeId}
          className="mb-2 shrink-0"
          blockAutoRefresh={Boolean(draggingProductId) || Boolean(pendingReorderProductId)}
        />

        <div className="cx-dashboard-page-content">
          {isCreateOpen ? (
            <section id="novo-produto" className="cx-panel p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Novo produto</h2>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="cx-btn-secondary px-3 py-1.5"
                >
                  Cancelar
                </button>
              </div>
              <CreateProductForm
                storeId={storeId}
                categories={categoriesForCreate}
                onCancel={() => setIsCreateOpen(false)}
              />
            </section>
          ) : null}

          <section className="cx-scroll-panel flex-1">
            <div className="cx-scroll-panel-header flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-zinc-900">Produtos cadastrados</h2>
                {orderedProducts.length > 1 ? (
                  <>
                    <p className="mt-1 hidden text-xs text-zinc-500 sm:block">
                      Arraste pela alça lateral para reorganizar os produtos.
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 sm:hidden">
                      Use as setas no topo de cada card para reorganizar os produtos.
                    </p>
                  </>
                ) : null}
                {orderedProducts.length > 0 ? (
                  <p className="mt-1 text-xs text-zinc-500">Ajuste dados e status sem sair desta lista.</p>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 sm:gap-3 sm:justify-end">
                <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-600 shadow-sm sm:px-2.5 sm:py-1.5">
                  <SelectionCheckbox
                    checked={allVisibleSelected}
                    indeterminate={selectedCount > 0 && !allVisibleSelected}
                    onChange={handleToggleAllProducts}
                    disabled={selectionDisabled || orderedProducts.length === 0}
                    label="Selecionar todos"
                    testId="product-select-all"
                    className="!h-9 !w-9"
                  />
                  Selecionar todos
                </div>
                <p className="shrink-0 text-xs text-zinc-600">
                  {selectedCount > 0 ? `${selectedCount}/` : ""}
                  {orderedProducts.length} {orderedProducts.length === 1 ? "produto" : "produtos"}
                </p>
              </div>
            </div>

            {showBulkToolbar ? (
              <div
                data-testid="product-bulk-toolbar"
                className="cx-scroll-panel-toolbar"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-800">
                      {selectedCount} {selectedCount === 1 ? "produto selecionado" : "produtos selecionados"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={clearBulkSelection}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        Limpar
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileActionsOpen((open) => !open)}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900 lg:hidden"
                        aria-expanded={mobileActionsOpen}
                      >
                        {mobileActionsOpen ? "Ocultar" : "Ações"}
                      </button>
                    </div>
                  </div>
                  <div className={`${mobileActionsOpen ? "grid" : "hidden"} grid-cols-2 gap-1.5 lg:flex lg:flex-wrap lg:justify-end lg:gap-2`}>
                  <button
                    type="button"
                    onClick={openSelectedProductEditor}
                    disabled={editActionDisabled}
                    title={selectedCount > 1 ? "Selecione apenas um produto para editar." : undefined}
                    data-testid="product-bulk-edit"
                    className="cx-btn-secondary min-h-9 w-full justify-center !px-2.5 !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:!px-3 lg:!py-2 lg:!text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={openBulkDeleteModal}
                    disabled={bulkActionsDisabled}
                    data-testid="product-bulk-delete"
                    className="min-h-9 w-full rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:px-3 lg:py-2 lg:text-sm"
                  >
                    Excluir selecionados
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("activate")}
                    disabled={bulkActionsDisabled}
                    data-testid="product-bulk-activate"
                    className="cx-btn-secondary min-h-9 w-full justify-center !px-2.5 !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:!px-3 lg:!py-2 lg:!text-sm"
                  >
                    Ativar selecionados
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("deactivate")}
                    disabled={bulkActionsDisabled}
                    data-testid="product-bulk-deactivate"
                    className="cx-btn-secondary min-h-9 w-full justify-center !px-2.5 !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:!px-3 lg:!py-2 lg:!text-sm"
                  >
                    Desativar selecionados
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("pause")}
                    disabled={bulkActionsDisabled}
                    data-testid="product-bulk-pause-sale"
                    className="min-h-9 w-full rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:px-3 lg:py-2 lg:text-sm"
                  >
                    Pausar venda
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("enable")}
                    disabled={bulkActionsDisabled}
                    data-testid="product-bulk-enable-sale"
                    className="min-h-9 w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:px-3 lg:py-2 lg:text-sm"
                  >
                    Disponibilizar venda
                  </button>
                  </div>
                </div>
              </div>
            ) : null}

            {bulkFeedback ? (
              <div
                className={`mx-4 mt-3 rounded-xl border px-3 py-2 text-sm sm:mx-5 ${
                  bulkFeedback.failed > 0 || bulkFeedback.skipped > 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
                role={bulkFeedback.failed > 0 ? "alert" : "status"}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{bulkFeedback.message}</span>
                  {bulkFeedback.reasons.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setBulkDetailsOpen((open) => !open)}
                      className="w-fit rounded-lg border border-current/20 bg-white/60 px-2.5 py-1 text-xs font-semibold"
                    >
                      {bulkDetailsOpen ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>
                  ) : null}
                </div>
                {bulkDetailsOpen && bulkFeedback.reasons.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                    {bulkFeedback.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="cx-scroll-panel-body">
            {orderedProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/90 p-5 text-center sm:p-6">
                <p className="text-sm font-semibold text-zinc-800">Nenhum produto cadastrado.</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">Crie um produto para iniciar a exibição no cardápio.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="cx-btn-secondary mt-4 px-3 py-2"
                >
                  Criar produto
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orderedProducts.map((product, index) => {
                  const associatedCategoryIds = new Set(
                    [product.category_id, ...(product.category_ids ?? [])].filter((id): id is string => Boolean(id))
                  );
                  const baseOptions = categories
                    .filter((category) => category.is_active || associatedCategoryIds.has(category.id))
                    .map((category) => ({ id: category.id, name: category.name }));

                  const hasCurrent = product.category_id
                    ? baseOptions.some((option) => option.id === product.category_id)
                    : true;

                  const categoryOptions = hasCurrent || !product.category_id
                    ? baseOptions
                    : [
                        {
                          id: product.category_id,
                          name: categoryNameById[product.category_id] ?? "Categoria",
                        },
                        ...baseOptions,
                      ];

                  return (
                    <div
                      key={product.id}
                      data-testid={`product-row-wrapper-${product.id}`}
                      onDragOver={(event) => handleDragOver(event, product.id)}
                      onDrop={(event) => handleDrop(event, product.id)}
                      className={`group flex items-start gap-2 rounded-2xl px-1 py-1 transition ${
                        dropTargetProductId === product.id && draggingProductId !== product.id
                          ? "bg-sky-50/60 ring-2 ring-sky-200 ring-offset-1"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        draggable={canDrag}
                        onDragStart={(event) => handleDragStart(event, product.id)}
                        onDragEnd={clearDragState}
                        disabled={!canDrag}
                        aria-label={`Mover produto ${product.name}`}
                        title="Arrastar para reordenar"
                        className={`mt-3 hidden h-11 w-9 shrink-0 items-center justify-center rounded-xl border bg-white text-zinc-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45 md:inline-flex ${
                          draggingProductId === product.id
                            ? "cursor-grabbing border-sky-300 bg-sky-50 text-sky-700"
                            : "cursor-grab border-zinc-200 hover:bg-zinc-50 hover:text-zinc-700"
                        }`}
                      >
                        <span className="sr-only">Arrastar para reordenar</span>
                        <svg
                          aria-hidden
                          viewBox="0 0 20 20"
                          fill="none"
                          className="h-4 w-4"
                        >
                          <path
                            d="M7 6H13M7 10H13M7 14H13"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M10 3L8.4 4.6M10 3L11.6 4.6M10 17L8.4 15.4M10 17L11.6 15.4"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>

                      <div className={`min-w-0 flex-1 transition ${draggingProductId === product.id ? "opacity-75" : ""}`}>
                        <ProductRow
                          product={product}
                          categoryName={product.category_id ? categoryNameById[product.category_id] ?? "—" : "Sem categoria principal"}
                          categoryOptions={categoryOptions}
                          onEditingChange={setEditingStateForProduct}
                          isSelected={selectedProductIds.has(product.id)}
                          selectionDisabled={selectionDisabled}
                          onToggleSelected={() => handleToggleProduct(product.id)}
                          isFirst={index === 0}
                          isLast={index === orderedProducts.length - 1}
                          onMoveUp={() => handleMobileStepReorder(product.id, "up")}
                          onMoveDown={() => handleMobileStepReorder(product.id, "down")}
                          isMoveBusy={pendingReorderProductId === product.id}
                          hasMoveIssue={reorderIssueProductId === product.id}
                          editRequestToken={productEditRequest?.id === product.id ? productEditRequest.token : 0}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </section>
        </div>
      </div>

      {bulkDeleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-products-dialog-title"
        >
          <div className="absolute inset-0 bg-zinc-950/35" onClick={() => setBulkDeleteConfirmOpen(false)} />

          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_-28px_rgba(24,24,27,0.85)] sm:p-6">
            <h2 id="bulk-delete-products-dialog-title" className="text-base font-semibold text-zinc-900">
              Excluir produtos selecionados?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Você selecionou {selectedCount} {selectedCount === 1 ? "produto" : "produtos"}. Produtos sem histórico
              serão excluídos fisicamente; produtos com histórico serão arquivados para preservar pedidos e checkouts.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={bulkDeleteCancelButtonRef}
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="cx-btn-secondary px-3 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => runBulkAction("delete")}
                disabled={bulkActionsDisabled}
                data-testid="product-bulk-delete-confirm"
                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkPending ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
