"use client";

import {
  deleteProductAction,
  toggleProductActiveAction,
  toggleProductAvailabilityAction,
  updateProductAction,
} from "@/app/actions/products";
import { formatBRL, formatPriceForInput } from "@/lib/validation/price";
import type { Product } from "@/types";
import { useEffect, useState } from "react";
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
  const [trackStock, setTrackStock] = useState(product.track_stock);

  const setEditingState = (isEditing: boolean) => {
    setEditing(isEditing);
    onEditingChange?.(product.id, isEditing);
  };

  useEffect(() => {
    return () => {
      onEditingChange?.(product.id, false);
    };
  }, [onEditingChange, product.id]);

  const isVisibleOnPublicMenu = product.is_active && product.is_available;
  const isPurchasableNow =
    product.is_active && product.is_available && (!product.track_stock || product.stock_quantity > 0);
  const isLowStock = product.track_stock && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const stockSummary = product.track_stock
    ? `${product.stock_quantity} ${product.stock_quantity === 1 ? "unidade" : "unidades"}`
    : "sem controle de estoque";

  return (
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
                  setTrackStock(product.track_stock);
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
                onSubmit={(event) => {
                  if (!confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`)) {
                    event.preventDefault();
                  }
                }}
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
                    setTrackStock(product.track_stock);
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
                  onSubmit={(event) => {
                    if (!confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`)) {
                      event.preventDefault();
                    }
                  }}
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

          <div>
            <label className="block text-sm font-medium text-zinc-800">URL da imagem (opcional)</label>
            <input
              name="image_url"
              type="url"
              defaultValue={product.image_url ?? ""}
              className="cx-input mt-1"
            />
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
              onClick={() => setEditingState(false)}
              className="cx-btn-secondary px-3 py-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
