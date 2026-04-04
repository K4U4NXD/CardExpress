"use client";

import {
  deleteProductAction,
  moveProductAction,
  toggleProductActiveAction,
  toggleProductAvailabilityAction,
  updateProductAction,
} from "@/app/actions/products";
import { formatBRL, formatPriceForInput } from "@/lib/validation/price";
import type { Product } from "@/types";
import { useState } from "react";
import type { CategoryOption } from "./create-product-form";

type ProductRowProps = {
  product: Product;
  categoryName: string;
  categoryOptions: CategoryOption[];
  isFirst: boolean;
  isLast: boolean;
};

export function ProductRow({
  product,
  categoryName,
  categoryOptions,
  isFirst,
  isLast,
}: ProductRowProps) {
  const [editing, setEditing] = useState(false);
  const [trackStock, setTrackStock] = useState(product.track_stock);
  const isVisibleOnPublicMenu =
    product.is_active && product.is_available && (!product.track_stock || product.stock_quantity > 0);

  return (
    <div className="flex flex-col gap-3 border-b border-zinc-100 py-4 last:border-b-0">
      {!editing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium text-zinc-900">{product.name}</p>
            <p className="text-sm text-zinc-500">{categoryName}</p>
            <p className="text-sm font-semibold text-zinc-800">{formatBRL(product.price)}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700">
                  {product.track_stock ? "Controla estoque" : "Sem controle de estoque"}
                </span>
                {product.track_stock ? (
                  <>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-medium text-zinc-700">
                      Estoque: {product.stock_quantity}
                    </span>
                    {product.stock_quantity <= 0 ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-900">
                        Estoque zerado
                      </span>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-medium ${
                    product.is_active
                      ? "bg-sky-100 text-sky-900"
                      : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {product.is_active ? "Produto ativo" : "Produto desativado"}
                </span>
                {product.is_active ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-medium ${
                      product.is_available
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {product.is_available ? "Venda liberada" : "Venda pausada"}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-0.5 font-medium ${
                    isVisibleOnPublicMenu
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {isVisibleOnPublicMenu ? "Aparece no cardápio público" : "Não aparece no cardápio público"}
                </span>
              </div>
            </div>
            {product.description ? (
              <p className="text-sm text-zinc-600 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]">
                {product.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTrackStock(product.track_stock);
                setEditing(true);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              Editar
            </button>
            {product.is_active ? (
              <form action={toggleProductAvailabilityAction} className="inline">
                <input type="hidden" name="product_id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50"
                >
                  {product.is_available ? "Pausar venda" : "Disponibilizar"}
                </button>
              </form>
            ) : null}
            <form action={toggleProductActiveAction} className="inline">
              <input type="hidden" name="product_id" value={product.id} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                {product.is_active ? "Desativar" : "Ativar"}
              </button>
            </form>
            <form action={moveProductAction} className="inline">
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={isFirst}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Subir
              </button>
            </form>
            <form action={moveProductAction} className="inline">
              <input type="hidden" name="product_id" value={product.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={isLast}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descer
              </button>
            </form>
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
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Excluir
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form action={updateProductAction} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <input type="hidden" name="product_id" value={product.id} />
          <div>
            <label className="block text-sm font-medium text-zinc-800">Nome</label>
            <input
              name="name"
              type="text"
              required
              defaultValue={product.name}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Descrição</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={product.description ?? ""}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
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
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Categoria</label>
              <select
                name="category_id"
                required
                defaultValue={product.category_id}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
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
                  className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Com controle de estoque, a visibilidade pública depende da quantidade. A pausa/liberação manual da
                  venda é feita no botão da listagem de produtos.
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
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
