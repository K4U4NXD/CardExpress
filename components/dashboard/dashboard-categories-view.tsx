"use client";

import { reorderCategoriesAction } from "@/app/actions/categories";
import { type DragEvent, useEffect, useMemo, useState } from "react";

import { CategoryRow } from "@/components/dashboard/category-row";
import { CreateCategoryForm } from "@/components/dashboard/create-category-form";
import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { PageHeader } from "@/components/layout/page-header";
import type { Category } from "@/types";

type DashboardCategoriesViewProps = {
  storeId: string;
  categories: Category[];
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

export function DashboardCategoriesView({ storeId, categories }: DashboardCategoriesViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [editingById, setEditingById] = useState<Record<string, boolean>>({});
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const [pendingReorderCategoryId, setPendingReorderCategoryId] = useState<string | null>(null);
  const [reorderIssueCategoryId, setReorderIssueCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (!reorderIssueCategoryId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReorderIssueCategoryId(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [reorderIssueCategoryId]);

  const isAnyEditing = useMemo(() => Object.values(editingById).some(Boolean), [editingById]);
  const canDrag = !isCreateOpen && !isAnyEditing && !pendingReorderCategoryId;

  const setEditingStateForCategory = (categoryId: string, isEditing: boolean) => {
    setEditingById((prev) => {
      if (!isEditing && !prev[categoryId]) {
        return prev;
      }

      if (!isEditing) {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      }

      return { ...prev, [categoryId]: true };
    });
  };

  const clearDragState = () => {
    setDraggingCategoryId(null);
    setDropTargetCategoryId(null);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, categoryId: string) => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }

    setReorderIssueCategoryId(null);
    setDraggingCategoryId(categoryId);
    setDropTargetCategoryId(categoryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, categoryId: string) => {
    if (!canDrag || !draggingCategoryId || draggingCategoryId === categoryId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dropTargetCategoryId !== categoryId) {
      setDropTargetCategoryId(categoryId);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetCategoryId: string) => {
    event.preventDefault();

    if (!canDrag || !draggingCategoryId || draggingCategoryId === targetCategoryId) {
      clearDragState();
      return;
    }

    const previousOrder = orderedCategories;
    const nextOrder = reorderById(previousOrder, draggingCategoryId, targetCategoryId);

    clearDragState();

    if (!nextOrder) {
      return;
    }

    persistCategoryOrder(nextOrder, previousOrder, draggingCategoryId);
  };

  const persistCategoryOrder = (nextOrder: Category[], previousOrder: Category[], categoryId: string) => {
    setPendingReorderCategoryId(categoryId);
    setReorderIssueCategoryId(null);
    setOrderedCategories(nextOrder);

    void (async () => {
      try {
        const result = await reorderCategoriesAction(nextOrder.map((item) => item.id));
        if (!result.ok) {
          setOrderedCategories(previousOrder);
          setReorderIssueCategoryId(categoryId);
        }
      } catch {
        setOrderedCategories(previousOrder);
        setReorderIssueCategoryId(categoryId);
      } finally {
        setPendingReorderCategoryId(null);
      }
    })();
  };

  const handleMobileStepReorder = (categoryId: string, direction: "up" | "down") => {
    if (pendingReorderCategoryId) {
      return;
    }

    const previousOrder = orderedCategories;
    const currentIndex = previousOrder.findIndex((item) => item.id === categoryId);

    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= previousOrder.length) {
      return;
    }

    const target = previousOrder[targetIndex];
    const nextOrder = reorderById(previousOrder, categoryId, target.id);
    if (!nextOrder) {
      return;
    }

    persistCategoryOrder(nextOrder, previousOrder, categoryId);
  };

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize as secoes do cardapio para facilitar a navegacao do cliente."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen((open) => !open)}
            data-testid="open-create-category"
            className="cx-btn-secondary px-3 py-2"
          >
            {isCreateOpen ? "Fechar" : "Nova categoria"}
          </button>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DashboardProductsRealtimeSync
          storeId={storeId}
          className="mb-3"
          blockAutoRefresh={Boolean(draggingCategoryId) || Boolean(pendingReorderCategoryId)}
        />

        <div className="space-y-4">
          {isCreateOpen ? (
            <section className="cx-panel p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-zinc-900">Nova categoria</h2>
              </div>
              <CreateCategoryForm onCancel={() => setIsCreateOpen(false)} />
            </section>
          ) : null}

          <section className="cx-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">Categorias cadastradas</h2>
              <p className="text-xs text-zinc-500">
                {orderedCategories.length} {orderedCategories.length === 1 ? "categoria" : "categorias"}
              </p>
            </div>

            {orderedCategories.length > 1 ? (
              <p className="mt-1 text-xs text-zinc-500">
                No desktop, arraste pela alca lateral. No celular, use o bloco de
                &quot;Reordenar&quot; em cada item.
              </p>
            ) : null}

            {orderedCategories.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">Nenhuma categoria cadastrada.</p>
                <p className="mt-1 text-xs text-zinc-500">Use o botao &quot;Nova categoria&quot; para iniciar a estrutura do cardapio.</p>
              </div>
            ) : (
              <div className="mt-3 sm:mt-2 space-y-2 sm:space-y-0">
                {orderedCategories.map((cat, index) => (
                  <div
                    key={cat.id}
                    onDragOver={(event) => handleDragOver(event, cat.id)}
                    onDrop={(event) => handleDrop(event, cat.id)}
                    className={`group flex items-start gap-2 rounded-2xl px-1 py-1 transition ${
                      dropTargetCategoryId === cat.id && draggingCategoryId !== cat.id
                        ? "bg-sky-50/60 ring-2 ring-sky-200 ring-offset-1"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      draggable={canDrag}
                      onDragStart={(event) => handleDragStart(event, cat.id)}
                      onDragEnd={clearDragState}
                      disabled={!canDrag}
                      aria-label={`Mover categoria ${cat.name}`}
                      title="Arrastar para reordenar"
                      className={`mt-2 hidden h-11 w-9 shrink-0 items-center justify-center rounded-xl border bg-white text-zinc-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45 md:inline-flex ${
                        draggingCategoryId === cat.id
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

                    <div className={`min-w-0 flex-1 transition ${draggingCategoryId === cat.id ? "opacity-75" : ""}`}>
                      <CategoryRow
                        category={cat}
                        onEditingChange={setEditingStateForCategory}
                        isFirst={index === 0}
                        isLast={index === orderedCategories.length - 1}
                        onMoveUp={() => handleMobileStepReorder(cat.id, "up")}
                        onMoveDown={() => handleMobileStepReorder(cat.id, "down")}
                        isMoveBusy={pendingReorderCategoryId === cat.id}
                        hasMoveIssue={reorderIssueCategoryId === cat.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
