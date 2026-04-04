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
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

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
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const categoryFilters = useMemo(
    () => [{ value: "todos", label: "Todos" }, ...sections.map((section) => ({ value: section.category_id, label: section.category_name }))],
    [sections]
  );

  const filteredSections = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return sections
      .filter((section) => activeCategory === "todos" || section.category_id === activeCategory)
      .map((section) => ({
        ...section,
        products: section.products.filter((product) => {
          if (!normalizedSearch) return true;
          const name = product.name.toLowerCase();
          const description = (product.description ?? "").toLowerCase();
          return name.includes(normalizedSearch) || description.includes(normalizedSearch);
        }),
      }))
      .filter((section) => section.products.length > 0);
  }, [activeCategory, searchQuery, sections]);

  const visibleProductsCount = useMemo(
    () => filteredSections.reduce((acc, section) => acc + section.products.length, 0),
    [filteredSections]
  );

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

  function toggleDescription(productId: string) {
    setExpandedDescriptions((current) => ({
      ...current,
      [productId]: !current[productId],
    }));
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-24">
      {hasProducts ? (
        <section className="sticky top-[4.5rem] z-10 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar produto"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryFilters.map((filter) => {
                const active = activeCategory === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveCategory(filter.value)}
                    className={active ? "cx-chip-active" : "cx-chip"}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-zinc-500">{visibleProductsCount} produto(s) exibido(s)</p>
          </div>
        </section>
      ) : null}

      {hasProducts ? (
        filteredSections.length > 0 ? (
          filteredSections.map((section) => (
          <section key={section.category_id} className="space-y-4 scroll-mt-24">
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
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
                          {product.description ? (() => {
                            const isExpanded = Boolean(expandedDescriptions[product.id]);
                            const isLong = product.description.length > 120;

                            return (
                              <div className="mt-2">
                                <p
                                  className={`text-sm text-zinc-600 ${
                                    !isExpanded
                                      ? "overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]"
                                      : ""
                                  }`}
                                >
                                  {product.description}
                                </p>
                                {isLong ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleDescription(product.id)}
                                    className="mt-1 text-xs font-medium text-zinc-700 underline underline-offset-2"
                                  >
                                    {isExpanded ? "Ver menos" : "Ver mais"}
                                  </button>
                                ) : null}
                              </div>
                            );
                          })() : null}
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
            <p className="text-sm text-zinc-600">Nenhum produto encontrado para o filtro atual.</p>
            <p className="mt-1 text-xs text-zinc-500">Tente limpar a busca ou selecionar outra categoria.</p>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-600">Nenhum produto disponivel no momento.</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/98 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs text-zinc-600">{totalItems} {totalItems === 1 ? "item" : "itens"}</p>
            <p className="text-sm font-semibold text-zinc-900">{formatBRL(totalAmount)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCart}
              disabled={totalItems === 0}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar
            </button>

            {isCheckoutDisabled ? (
              <span
                aria-disabled
                className="inline-flex cursor-not-allowed items-center rounded-md bg-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 sm:px-4 sm:text-sm"
              >
                Ir para checkout
              </span>
            ) : (
              <Link
                href={`/${slug}/checkout`}
                className="cx-btn-primary rounded-md px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                Ir para checkout
              </Link>
            )}
          </div>
        </div>

        {!acceptsOrders ? (
          <p className="mx-auto max-w-4xl px-4 pb-2 text-[11px] text-amber-700 sm:px-6">A loja está com pedidos pausados no momento.</p>
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
