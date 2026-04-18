"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  clearPublicCartFromStorage,
  getPublicCartStorageKey,
  readPublicCartFromStorage,
  writePublicCartToStorage,
} from "@/lib/public/cart";
import { reconcileCartWithMenu } from "@/lib/public/cart-reconcile";
import { isPublicMenuRowPurchasableNow, isPublicMenuRowVisible } from "@/lib/public/store-operational";
import { formatBRL } from "@/lib/validation/price";
import type { PublicCartItem, PublicMenuRpcRow } from "@/types";

type PublicStoreMenuClientProps = {
  slug: string;
  acceptsOrders: boolean;
  ordersUnavailableMessage?: string | null;
  menuRows: PublicMenuRpcRow[];
};

type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  track_stock: boolean;
  stock_quantity: number | null;
  isPurchasableNow: boolean;
};

type MenuSection = {
  category_id: string;
  category_name: string;
  category_sort_order: number;
  products: MenuProduct[];
};

export function PublicStoreMenuClient({ slug, acceptsOrders, ordersUnavailableMessage, menuRows }: PublicStoreMenuClientProps) {
  const cartStorageKey = getPublicCartStorageKey(slug);
  const unavailableMessage = ordersUnavailableMessage ?? "A loja pausou temporariamente os pedidos.";

  const sections = useMemo(() => groupMenuByCategory(menuRows), [menuRows]);
  const productById = useMemo(() => {
    const map = new Map<string, MenuProduct>();

    for (const section of sections) {
      for (const product of section.products) {
        map.set(product.id, product);
      }
    }

    return map;
  }, [sections]);
  const hasProducts = sections.length > 0;
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const [cartItems, setCartItems] = useState<PublicCartItem[]>([]);
  const [hasHydratedCart, setHasHydratedCart] = useState(false);
  const [cartSyncMessage, setCartSyncMessage] = useState<string | null>(null);
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

    const reconciled = reconcileCartWithMenu(loaded, menuRows, acceptsOrders);

    setCartItems(reconciled.items);

    if (reconciled.removedCount > 0) {
      setCartSyncMessage("Alguns itens deixaram de estar disponíveis e foram removidos do seu pedido.");
    } else if (reconciled.priceUpdatedCount > 0) {
      setCartSyncMessage("O preço de alguns itens foi atualizado.");
    } else if (reconciled.updatedCount > 0) {
      setCartSyncMessage("Seu carrinho foi atualizado com base no cardápio atual.");
    } else {
      setCartSyncMessage(null);
    }

    setHasHydratedCart(true);
  }, [acceptsOrders, cartStorageKey, menuRows]);

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

  const hasPurchasableItemsInCart = useMemo(
    () => cartItems.some((item) => productById.get(item.product_id)?.isPurchasableNow === true),
    [cartItems, productById]
  );
  const unavailableItemsInCartCount = useMemo(
    () => cartItems.filter((item) => productById.get(item.product_id)?.isPurchasableNow === false).length,
    [cartItems, productById]
  );
  const allCartProductsUnavailable = cartItems.length > 0 && unavailableItemsInCartCount === cartItems.length;

  const isCheckoutDisabled = !acceptsOrders || !hasPurchasableItemsInCart;

  function addProduct(product: MenuProduct) {
    if (!acceptsOrders || !product.isPurchasableNow) {
      return;
    }

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
    const product = productById.get(productId);
    if (!acceptsOrders || !product || !product.isPurchasableNow) {
      return;
    }

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
        <section className="sticky top-[4.5rem] z-10 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-[0_20px_38px_-30px_rgba(24,24,27,0.5)] backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-800">Explore o cardápio</p>
              <p className="text-xs text-zinc-500">{visibleProductsCount} resultado(s)</p>
            </div>

            <p className="text-xs font-medium text-zinc-500">Filtre por categoria ou busque por produto.</p>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por nome ou descrição"
                data-testid="menu-search-input"
                className="cx-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="cx-btn-secondary shrink-0 px-3 py-2"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <div className="-mx-1 rounded-xl border border-zinc-200 bg-zinc-50/80 px-1.5 py-1">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryFilters.map((filter) => {
                const active = activeCategory === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveCategory(filter.value)}
                    data-testid={`menu-category-filter-${filter.value}`}
                    className={active ? "cx-chip-active" : "cx-chip"}
                  >
                    {filter.label}
                  </button>
                );
              })}
              </div>
            </div>

            {cartSyncMessage ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                {cartSyncMessage}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasProducts ? (
        filteredSections.length > 0 ? (
          filteredSections.map((section) => (
          <section key={section.category_id} className="space-y-4 scroll-mt-24">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{section.category_name}</h2>
              <p className="text-sm text-zinc-500">Selecione os itens e ajuste as quantidades antes de seguir para o checkout.</p>
            </div>

            <div className="space-y-4">
              {section.products.map((product) => {
                const cartItem = cartItems.find((item) => item.product_id === product.id);
                const quantity = cartItem?.quantity ?? 0;
                const isOutOfStock = product.track_stock && (product.stock_quantity ?? 0) <= 0;
                const canAddOrIncrease = acceptsOrders && product.isPurchasableNow;

                return (
                  <article
                    key={product.id}
                    data-testid={`menu-product-${product.id}`}
                    className={`rounded-2xl border bg-white p-4 shadow-[0_16px_34px_-30px_rgba(24,24,27,0.45)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-32px_rgba(24,24,27,0.5)] ${
                      isOutOfStock ? "border-zinc-300 bg-zinc-50/80" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                      {product.image_url ? (
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      ) : null}

                      <div className="flex flex-1 flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="text-base font-medium text-zinc-900">{product.name}</h3>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-semibold text-zinc-900">{formatBRL(product.price)}</span>
                              {isOutOfStock ? (
                                <span
                                  data-testid={`menu-stock-badge-${product.id}`}
                                  className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                >
                                  Sem estoque
                                </span>
                              ) : null}
                            </div>
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
                              data-testid={`menu-decrease-${product.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-zinc-900">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(product.id)}
                              disabled={!canAddOrIncrease}
                              data-testid={`menu-increase-${product.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addProduct(product)}
                            disabled={!canAddOrIncrease}
                            data-testid={`menu-add-${product.id}`}
                            className="cx-btn-primary w-fit px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Adicionar
                          </button>
                        )}

                        {isOutOfStock ? (
                          <p
                            data-testid={`menu-out-of-stock-${product.id}`}
                            className="text-xs font-medium text-zinc-600"
                          >
                            Indisponível para novos incrementos no carrinho.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-zinc-700">Nenhum produto encontrado para este filtro.</p>
            <p className="mt-1 text-xs text-zinc-500">Revise a busca ou selecione outra categoria para continuar.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("todos");
              }}
              className="cx-btn-secondary mt-3 px-3 py-1.5 text-xs"
            >
              Limpar filtros
            </button>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-zinc-700">Cardápio indisponível no momento.</p>
          <p className="mt-1 text-xs text-zinc-500">Volte mais tarde para conferir os produtos deste estabelecimento.</p>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/97 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs text-zinc-600">{totalItems} {totalItems === 1 ? "item" : "itens"}</p>
            <p className="text-sm font-semibold text-zinc-900">{formatBRL(totalAmount)}</p>
            {totalItems === 0 ? (
              <p className="text-[11px] text-zinc-500">Adicione itens para liberar o checkout.</p>
            ) : unavailableItemsInCartCount > 0 ? (
              <p data-testid="menu-cart-unavailable-hint" className="text-[11px] text-zinc-600">
                {allCartProductsUnavailable
                  ? "Checkout bloqueado: todos os itens do carrinho estão indisponíveis no momento."
                  : `${unavailableItemsInCartCount} ${unavailableItemsInCartCount === 1 ? "item indisponível" : "itens indisponíveis"} para novos incrementos.`}
              </p>
            ) : !hasPurchasableItemsInCart ? (
              <p className="text-[11px] text-zinc-500">Seu carrinho tem apenas itens indisponíveis para compra agora.</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearCart}
              disabled={totalItems === 0}
              className="text-xs font-medium text-zinc-500 transition hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar carrinho
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
                data-testid="menu-go-checkout"
                className="cx-btn-primary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                Ir para checkout
              </Link>
            )}
          </div>
        </div>

        {!acceptsOrders ? (
          <p className="mx-auto max-w-4xl px-4 pb-2 text-[11px] text-amber-700 sm:px-6">{unavailableMessage}</p>
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

    if (row.product_id && row.product_name && isPublicMenuRowVisible(row)) {
      const parsedPrice = Number(row.product_price ?? 0);
      const stockQuantity = toNonNegativeInteger(row.stock_quantity);

      if (Number.isFinite(parsedPrice) && parsedPrice >= 0) {
        const alreadyExists = category.products.some((product) => product.id === row.product_id);

        if (!alreadyExists) {
          category.products.push({
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            price: parsedPrice,
            image_url: row.product_image_url,
            track_stock: row.track_stock === true,
            stock_quantity: stockQuantity,
            isPurchasableNow: isPublicMenuRowPurchasableNow(row),
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

function toNonNegativeInteger(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return null;
}
