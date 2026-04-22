"use client";

import { reorderProductsAction } from "@/app/actions/products";
import { type DragEvent, useEffect, useMemo, useState } from "react";

import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { CreateProductForm } from "@/components/dashboard/create-product-form";
import { ProductRow } from "@/components/dashboard/product-row";
import { PageHeader } from "@/components/layout/page-header";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState(products);
  const [editingById, setEditingById] = useState<Record<string, boolean>>({});
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [dropTargetProductId, setDropTargetProductId] = useState<string | null>(null);
  const [pendingReorderProductId, setPendingReorderProductId] = useState<string | null>(null);
  const [reorderIssueProductId, setReorderIssueProductId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedProducts(products);
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
  const canDrag = !isCreateOpen && !isAnyEditing && !pendingReorderProductId;

  const setEditingStateForProduct = (productId: string, isEditing: boolean) => {
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
  };

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
    if (pendingReorderProductId) {
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
            onClick={() => setIsCreateOpen((open) => !open)}
            data-testid="open-create-product"
            className="cx-btn-secondary px-3 py-2"
          >
            {isCreateOpen ? "Fechar" : "Novo produto"}
          </button>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <DashboardProductsRealtimeSync
          storeId={storeId}
          className="mb-3"
          blockAutoRefresh={Boolean(draggingProductId) || Boolean(pendingReorderProductId)}
        />

        <div className="space-y-4">
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

          <section className="cx-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Produtos cadastrados</h2>
              <p className="text-xs text-zinc-500">
                {orderedProducts.length} {orderedProducts.length === 1 ? "produto" : "produtos"}
              </p>
            </div>

            {orderedProducts.length > 1 ? (
              <p className="mt-1 text-xs text-zinc-500">
                No desktop, arraste pela alça lateral. No celular, use o bloco de
                &quot;Reordenar&quot; em cada item.
              </p>
            ) : null}

            {orderedProducts.length > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">Ajuste dados e status sem sair desta lista.</p>
            ) : null}

            {orderedProducts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">Nenhum produto cadastrado.</p>
                <p className="mt-1 text-xs text-zinc-500">Crie um produto para iniciar a exibição no cardápio.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {orderedProducts.map((product, index) => {
                  const baseOptions = categories
                    .filter((category) => category.is_active || category.id === product.category_id)
                    .map((category) => ({ id: category.id, name: category.name }));

                  const hasCurrent = baseOptions.some((option) => option.id === product.category_id);

                  const categoryOptions = hasCurrent
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
                          categoryName={categoryNameById[product.category_id] ?? "—"}
                          categoryOptions={categoryOptions}
                          onEditingChange={setEditingStateForProduct}
                          isFirst={index === 0}
                          isLast={index === orderedProducts.length - 1}
                          onMoveUp={() => handleMobileStepReorder(product.id, "up")}
                          onMoveDown={() => handleMobileStepReorder(product.id, "down")}
                          isMoveBusy={pendingReorderProductId === product.id}
                          hasMoveIssue={reorderIssueProductId === product.id}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
