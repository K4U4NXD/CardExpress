"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  clearPublicCartFromStorage,
  getPublicCartStorageKey,
  readPublicCartFromStorage,
  writePublicCartToStorage,
} from "@/lib/public/cart";
import { formatBRL } from "@/lib/validation/price";
import type { PublicCartItem, PublicMenuRpcRow } from "@/types";

type PublicStoreMenuClientProps = {
  slug: string;
  acceptsOrders: boolean;
  menuRows: PublicMenuRpcRow[];
};

type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
};

type MenuSection = {
  category_id: string;
  category_name: string;
  category_sort_order: number;
  products: MenuProduct[];
};

export function PublicStoreMenuClient({ slug, acceptsOrders, menuRows }: PublicStoreMenuClientProps) {
  const cartStorageKey = getPublicCartStorageKey(slug);

  const sections = useMemo(() => groupMenuByCategory(menuRows), [menuRows]);
  const hasProducts = sections.length > 0;

  const productById = useMemo(() => {
    const map = new Map<string, MenuProduct>();

    for (const section of sections) {
      for (const product of section.products) {
        map.set(product.id, product);
      }
    }

    return map;
  }, [sections]);

  const [cartItems, setCartItems] = useState<PublicCartItem[]>([]);
  const [hasHydratedCart, setHasHydratedCart] = useState(false);

  useEffect(() => {
    setHasHydratedCart(false);

    const loaded = readPublicCartFromStorage(cartStorageKey);

    const sanitized = loaded
      .filter((item) => productById.has(item.product_id))
      .map((item) => ({ ...item, quantity: Math.max(1, Math.floor(item.quantity)) }));

    setCartItems(sanitized);
    setHasHydratedCart(true);
  }, [cartStorageKey, productById]);

  useEffect(() => {
    if (!hasHydratedCart) {
      return;
    }

    if (!cartItems.length) {
      clearPublicCartFromStorage(cartStorageKey);
      return;
    }

    writePublicCartToStorage(cartStorageKey, cartItems);
  }, [cartItems, cartStorageKey, hasHydratedCart]);

  const totalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  const totalAmount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0),
    [cartItems]
  );

  const isCheckoutDisabled = !acceptsOrders || totalItems === 0;

  function addProduct(product: MenuProduct) {
    setCartItems((previous) => {
      const existing = previous.find((item) => item.product_id === product.id);

      if (!existing) {
        return [
          ...previous,
          {
            product_id: product.id,
            name: product.name,
            unit_price: product.price,
            quantity: 1,
          },
        ];
      }

      return previous.map((item) =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );
    });
  }

  function increaseQuantity(productId: string) {
    setCartItems((previous) =>
      previous.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseQuantity(productId: string) {
    setCartItems((previous) => {
      const target = previous.find((item) => item.product_id === productId);
      if (!target) {
        return previous;
      }

      if (target.quantity <= 1) {
        return previous.filter((item) => item.product_id !== productId);
      }

      return previous.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      );
    });
  }

  function clearCart() {
    setCartItems([]);
  }

  return (
    <div className="space-y-10">
      {hasProducts ? (
        sections.map((section) => (
          <section key={section.category_id} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{section.category_name}</h2>
              <p className="text-sm text-zinc-500">Escolha seus itens e ajuste quantidades no carrinho.</p>
            </div>

            <div className="space-y-4">
              {section.products.map((product) => {
                const cartItem = cartItems.find((item) => item.product_id === product.id);
                const quantity = cartItem?.quantity ?? 0;

                return (
                  <article key={product.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex gap-4">
                      {product.image_url ? (
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-zinc-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      ) : null}

                      <div className="flex flex-1 flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-base font-medium text-zinc-900">{product.name}</h3>
                            <span className="text-sm font-semibold text-zinc-900">{formatBRL(product.price)}</span>
                          </div>
                          {product.description ? (
                            <p className="mt-2 text-sm text-zinc-600">{product.description}</p>
                          ) : null}
                        </div>

                        {quantity > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(product.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-zinc-900">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(product.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addProduct(product)}
                            className="inline-flex w-fit items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                          >
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">Nenhum produto disponivel no momento.</p>
        </div>
      )}

      <div className="sticky bottom-0 z-20 rounded-xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-600">{totalItems} {totalItems === 1 ? "item" : "itens"}</p>
            <p className="text-lg font-semibold text-zinc-900">{formatBRL(totalAmount)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearCart}
              disabled={totalItems === 0}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar carrinho
            </button>

            {isCheckoutDisabled ? (
              <span
                aria-disabled
                className="inline-flex cursor-not-allowed items-center rounded-md bg-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600"
              >
                Ir para checkout
              </span>
            ) : (
              <Link
                href={`/${slug}/checkout`}
                className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Ir para checkout
              </Link>
            )}
          </div>
        </div>

        {!acceptsOrders ? (
          <p className="mt-2 text-xs text-amber-700">A loja está com pedidos pausados no momento.</p>
        ) : null}
      </div>
    </div>
  );
}

function groupMenuByCategory(rows: PublicMenuRpcRow[]): MenuSection[] {
  const sectionMap = new Map<string, MenuSection>();

  for (const row of rows) {
    const category = sectionMap.get(row.category_id) ?? {
      category_id: row.category_id,
      category_name: row.category_name,
      category_sort_order: row.category_sort_order,
      products: [],
    };

    if (row.product_id && row.product_name) {
      const parsedPrice = Number(row.product_price ?? 0);

      if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
        const alreadyExists = category.products.some((product) => product.id === row.product_id);

        if (!alreadyExists) {
          category.products.push({
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            price: parsedPrice,
            image_url: row.product_image_url,
          });
        }
      }
    }

    sectionMap.set(row.category_id, category);
  }

  return Array.from(sectionMap.values())
    .sort((a, b) => a.category_sort_order - b.category_sort_order)
    .filter((section) => section.products.length > 0);
}
