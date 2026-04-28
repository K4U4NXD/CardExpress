"use client";

import {
  bulkDeleteCategoriesAction,
  bulkSetCategoriesActiveAction,
  reorderCategoriesAction,
  type BulkCategoriesActionResult,
} from "@/app/actions/categories";
import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CategoryRow } from "@/components/dashboard/category-row";
import { CreateCategoryForm } from "@/components/dashboard/create-category-form";
import { DashboardProductsRealtimeSync } from "@/components/dashboard/dashboard-products-realtime-sync";
import { SelectionCheckbox } from "@/components/dashboard/selection-checkbox";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/shared/toast-provider";
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
  const router = useRouter();
  const { enqueueToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [editingById, setEditingById] = useState<Record<string, boolean>>({});
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const [pendingReorderCategoryId, setPendingReorderCategoryId] = useState<string | null>(null);
  const [reorderIssueCategoryId, setReorderIssueCategoryId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => new Set());
  const [categoryEditRequest, setCategoryEditRequest] = useState<{ id: string; token: number } | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<BulkCategoriesActionResult | null>(null);
  const [bulkDetailsOpen, setBulkDetailsOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();
  const bulkDeleteCancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOrderedCategories(categories);
    const currentIds = new Set(categories.map((category) => category.id));
    setSelectedCategoryIds((previous) => {
      const next = new Set(Array.from(previous).filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
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
  const selectedCount = selectedCategoryIds.size;
  const selectedCategoryId = selectedCount === 1 ? Array.from(selectedCategoryIds)[0] : null;
  const hasSelection = selectedCount > 0;
  const visibleCategoryIds = useMemo(() => orderedCategories.map((category) => category.id), [orderedCategories]);
  const allVisibleSelected =
    visibleCategoryIds.length > 0 && visibleCategoryIds.every((id) => selectedCategoryIds.has(id));
  const selectionDisabled = isCreateOpen || isAnyEditing || Boolean(pendingReorderCategoryId) || isBulkPending;
  const bulkActionsDisabled = isCreateOpen || isAnyEditing || isBulkPending || selectedCount === 0;
  const editActionDisabled = selectionDisabled || selectedCount !== 1;
  const canDrag = !isCreateOpen && !isAnyEditing && !pendingReorderCategoryId && !hasSelection;
  const showBulkToolbar = hasSelection && !isCreateOpen && !isAnyEditing;

  const clearBulkSelection = useCallback(() => {
    setSelectedCategoryIds(new Set());
    setBulkDeleteConfirmOpen(false);
  }, []);

  useEffect(() => {
    if (isCreateOpen || isAnyEditing) {
      clearBulkSelection();
    }
  }, [clearBulkSelection, isCreateOpen, isAnyEditing]);

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

  const setEditingStateForCategory = useCallback((categoryId: string, isEditing: boolean) => {
    if (isEditing) {
      clearBulkSelection();
      setBulkFeedback(null);
      setBulkDetailsOpen(false);
    }

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
  }, [clearBulkSelection]);

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
    if (!canDrag) {
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

  const handleToggleCategory = (categoryId: string) => {
    if (selectionDisabled) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setSelectedCategoryIds((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleAllCategories = () => {
    if (selectionDisabled || visibleCategoryIds.length === 0) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setSelectedCategoryIds((previous) => {
      if (visibleCategoryIds.every((id) => previous.has(id))) {
        return new Set();
      }
      return new Set(visibleCategoryIds);
    });
  };

  const showBulkResult = (result: BulkCategoriesActionResult) => {
    const hasIssue = result.failed > 0 || result.skipped > 0;
    const tone = result.failed > 0 && result.changed === 0 ? "error" : hasIssue ? "warning" : "success";

    setBulkFeedback(result);
    setBulkDetailsOpen(false);
    enqueueToast({
      tone,
      title: hasIssue ? "Ação concluída com observações" : "Ação concluída",
      text: result.message,
    });
  };

  const runBulkAction = (action: "activate" | "deactivate" | "delete") => {
    if (bulkActionsDisabled || selectionDisabled) {
      return;
    }

    const ids = Array.from(selectedCategoryIds);
    startBulkTransition(() => {
      void (async () => {
        const result =
          action === "delete"
            ? await bulkDeleteCategoriesAction(ids)
            : await bulkSetCategoriesActiveAction(ids, action === "activate");

        setSelectedCategoryIds(new Set());
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

  const openSelectedCategoryEditor = () => {
    if (editActionDisabled || !selectedCategoryId) {
      return;
    }

    setBulkFeedback(null);
    setBulkDetailsOpen(false);
    setCategoryEditRequest({ id: selectedCategoryId, token: Date.now() });
  };

  return (
    <>
      <PageHeader
        title="Categorias"
        description="Organize as seções do cardápio para facilitar a navegação do cliente."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        actions={
          <button
            type="button"
            onClick={() => {
              clearBulkSelection();
              setBulkFeedback(null);
              setBulkDetailsOpen(false);
              setIsCreateOpen((open) => !open);
            }}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Categorias cadastradas</h2>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm">
                  <SelectionCheckbox
                    checked={allVisibleSelected}
                    indeterminate={selectedCount > 0 && !allVisibleSelected}
                    onChange={handleToggleAllCategories}
                    disabled={selectionDisabled || orderedCategories.length === 0}
                    label="Selecionar todos"
                    testId="category-select-all"
                  />
                  Selecionar todos
                </div>
                <p className="shrink-0 text-xs text-zinc-500">
                  {selectedCount > 0 ? `${selectedCount}/` : ""}
                  {orderedCategories.length} {orderedCategories.length === 1 ? "categoria" : "categorias"}
                </p>
              </div>
            </div>

            {orderedCategories.length > 1 ? (
              <>
                <p className="mt-1 hidden text-xs text-zinc-500 sm:block">
                  Arraste pela alça lateral para reorganizar as categorias.
                </p>
                <p className="mt-1 text-xs text-zinc-500 sm:hidden">
                  Use as setas no topo de cada card para reorganizar as categorias.
                </p>
              </>
            ) : null}

            {showBulkToolbar ? (
              <div
                data-testid="category-bulk-toolbar"
                className="sticky top-28 z-20 mt-3 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur md:top-20"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-zinc-800">
                    {selectedCount} {selectedCount === 1 ? "categoria selecionada" : "categorias selecionadas"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={openSelectedCategoryEditor}
                    disabled={editActionDisabled}
                    title={selectedCount > 1 ? "Selecione apenas uma categoria para editar." : undefined}
                    data-testid="category-bulk-edit"
                    className="cx-btn-secondary w-full justify-center px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("activate")}
                    disabled={bulkActionsDisabled}
                    data-testid="category-bulk-activate"
                    className="cx-btn-secondary w-full justify-center px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Ativar selecionadas
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkAction("deactivate")}
                    disabled={bulkActionsDisabled}
                    data-testid="category-bulk-deactivate"
                    className="cx-btn-secondary w-full justify-center px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Desativar selecionadas
                  </button>
                  <button
                    type="button"
                    onClick={openBulkDeleteModal}
                    disabled={bulkActionsDisabled}
                    data-testid="category-bulk-delete"
                    className="col-span-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 sm:w-auto"
                  >
                    Excluir selecionadas
                  </button>
                  </div>
                </div>
              </div>
            ) : null}

            {bulkFeedback ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
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

            {orderedCategories.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">Nenhuma categoria cadastrada.</p>
                <p className="mt-1 text-xs text-zinc-500">Use o botão &quot;Nova categoria&quot; para iniciar a estrutura do cardápio.</p>
              </div>
            ) : (
              <div className="mt-3 sm:mt-2 space-y-2 sm:space-y-0">
                {orderedCategories.map((cat, index) => (
                  <div
                    key={cat.id}
                    data-testid={`category-row-wrapper-${cat.id}`}
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
                        isSelected={selectedCategoryIds.has(cat.id)}
                        selectionDisabled={selectionDisabled}
                        onToggleSelected={() => handleToggleCategory(cat.id)}
                        isFirst={index === 0}
                        isLast={index === orderedCategories.length - 1}
                        onMoveUp={() => handleMobileStepReorder(cat.id, "up")}
                        onMoveDown={() => handleMobileStepReorder(cat.id, "down")}
                        isMoveBusy={pendingReorderCategoryId === cat.id}
                        hasMoveIssue={reorderIssueCategoryId === cat.id}
                        editRequestToken={categoryEditRequest?.id === cat.id ? categoryEditRequest.token : 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {bulkDeleteConfirmOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-categories-dialog-title"
        >
          <div className="absolute inset-0 bg-zinc-950/35" onClick={() => setBulkDeleteConfirmOpen(false)} />

          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_-28px_rgba(24,24,27,0.85)] sm:p-6">
            <h2 id="bulk-delete-categories-dialog-title" className="text-base font-semibold text-zinc-900">
              Excluir categorias selecionadas?
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Você selecionou {selectedCount} {selectedCount === 1 ? "categoria" : "categorias"}. Categorias com
              produtos ativos vinculados serão preservadas e aparecerão no resumo da ação.
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
                data-testid="category-bulk-delete-confirm"
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
