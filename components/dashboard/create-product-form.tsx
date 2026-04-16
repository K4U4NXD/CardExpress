"use client";

import { createProductAction, type ProductFormState } from "@/app/actions/products";
import { useActionState, useState } from "react";

export type CategoryOption = { id: string; name: string };

type CreateProductFormProps = {
  categories: CategoryOption[];
  onCancel?: () => void;
};

const initial: ProductFormState = {};

export function CreateProductForm({ categories, onCancel }: CreateProductFormProps) {
  const [state, formAction, pending] = useActionState(createProductAction, initial);
  const [trackStock, setTrackStock] = useState(false);
  const disabled = categories.length === 0;

  return (
    <form action={formAction} data-testid="create-product-form" className="space-y-4">
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

        <div className="sm:col-span-2">
          <label htmlFor="product-image-url" className="block text-sm font-medium text-zinc-800">
            URL da imagem (opcional)
          </label>
          <input
            id="product-image-url"
            name="image_url"
            type="url"
            disabled={disabled}
            placeholder="https://…"
            className="cx-input mt-1 disabled:bg-zinc-100"
          />
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
