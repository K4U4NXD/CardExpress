"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABELS } from "@/lib/orders/presenter";
import {
  clearCheckoutRecovery,
  clearOrderRecovery,
  isCheckoutRecoveryExpired,
  isTerminalOrderStatus,
  readPublicFlowRecovery,
  saveOrderRecovery,
} from "@/lib/public/flow-recovery";
import type { OrderStatus } from "@/types";

type PublicFlowRecoveryBannerProps = {
  slug: string;
  className?: string;
};

type ResumableOrderState = {
  orderId: string;
  href: string;
  displayCode: string | null;
  status: OrderStatus;
};

type ResumableState = {
  checkoutHref: string | null;
  orders: ResumableOrderState[];
} | null;

type PublicOrderValidationRow = {
  id: string;
  status: OrderStatus;
  display_code: string | null;
};

const ORDER_STATUS_REFRESH_INTERVAL_MS = 20000;

function buildOrderPath(slug: string, orderId: string, orderPublicToken: string) {
  return `/${slug}/pedido/${orderId}?token=${encodeURIComponent(orderPublicToken)}`;
}

export function PublicFlowRecoveryBanner({ slug, className }: PublicFlowRecoveryBannerProps) {
  const pathname = usePathname();
  const [resumableState, setResumableState] = useState<ResumableState>(null);

  useEffect(() => {
    let active = true;

    async function resolveRecovery() {
      const recovery = readPublicFlowRecovery(slug);

      if (!recovery) {
        if (active) {
          setResumableState(null);
        }
        return;
      }

      const savedOrders = recovery.orders ?? [];
      const nextOrders: ResumableOrderState[] = [];

      if (savedOrders.length > 0) {
        const supabase = createBrowserSupabaseClient();

        const validations = await Promise.all(
          savedOrders.map(async (savedOrder) => {
            const { data, error } = await supabase
              .rpc("get_public_order", {
                p_slug: slug,
                p_order_id: savedOrder.orderId,
                p_public_token: savedOrder.orderPublicToken,
              })
              .maybeSingle<PublicOrderValidationRow>();

            return {
              savedOrder,
              data,
              error,
            };
          })
        );

        for (const validation of validations) {
          const { savedOrder, data, error } = validation;

          if (error) {
            nextOrders.push({
              orderId: savedOrder.orderId,
              href: savedOrder.orderUrl,
              displayCode: savedOrder.displayCode,
              status: savedOrder.status as OrderStatus,
            });
            continue;
          }

          if (!data) {
            clearOrderRecovery(slug, savedOrder.orderId);
            continue;
          }

          const orderPath = buildOrderPath(slug, data.id, savedOrder.orderPublicToken);

          if (!isTerminalOrderStatus(data.status)) {
            saveOrderRecovery({
              slug,
              orderId: data.id,
              orderPublicToken: savedOrder.orderPublicToken,
              status: data.status,
              displayCode: data.display_code,
              orderUrl: orderPath,
              clearCheckout: false,
            });
          }

          nextOrders.push({
            orderId: data.id,
            href: orderPath,
            displayCode: data.display_code,
            status: data.status,
          });
        }
      }

      const freshRecovery = readPublicFlowRecovery(slug);
      const checkout = freshRecovery?.checkout;

      let checkoutHref: string | null = null;

      if (checkout) {
        if (isCheckoutRecoveryExpired(checkout)) {
          clearCheckoutRecovery(slug);
        } else {
          const checkoutPath = checkout.checkoutUrl;
          const isCurrentCheckoutPage = pathname === `/${slug}/checkout` && checkoutPath === `/${slug}/checkout`;

          if (!isCurrentCheckoutPage) {
            checkoutHref = checkoutPath;
          }
        }
      }

      if (nextOrders.length === 0 && !checkoutHref) {
        if (active) {
          setResumableState(null);
        }
        return;
      }

      if (active) {
        setResumableState({
          checkoutHref,
          orders: nextOrders,
        });
      }
    }

    void resolveRecovery();

    const intervalId = window.setInterval(() => {
      void resolveRecovery();
    }, ORDER_STATUS_REFRESH_INTERVAL_MS);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void resolveRecovery();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pathname, slug]);

  if (!resumableState) {
    return null;
  }

  return (
    <section data-testid="public-flow-recovery-banner" className={className}>
      <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900 sm:px-4">
        {resumableState.orders.length > 0 ? (
          <div data-testid="recovery-orders-block">
            <p className="font-medium">
              {resumableState.orders.length === 1
                ? "Você tem um pedido em andamento neste aparelho."
                : `Você tem ${resumableState.orders.length} pedidos em andamento neste aparelho.`}
            </p>

            <ul className="mt-2 space-y-2">
              {resumableState.orders.map((order) => (
                <li
                  key={order.orderId}
                  data-testid={`recovery-order-${order.orderId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-white px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sky-900">{order.displayCode ? `Senha ${order.displayCode}` : "Pedido em andamento"}</p>
                    <p className="text-[11px] text-sky-800">Status: {ORDER_STATUS_LABELS[order.status]}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={order.href} data-testid={`recovery-order-link-${order.orderId}`} className="cx-btn-secondary px-2.5 py-1 text-xs">
                      Continuar acompanhamento
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearOrderRecovery(slug, order.orderId);
                        setResumableState((current) => {
                          if (!current) {
                            return null;
                          }

                          const nextOrders = current.orders.filter((item) => item.orderId !== order.orderId);
                          if (nextOrders.length === 0 && !current.checkoutHref) {
                            return null;
                          }

                          return {
                            ...current,
                            orders: nextOrders,
                          };
                        });
                      }}
                      className="rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {resumableState.checkoutHref ? (
          <div
            data-testid="recovery-checkout-block"
            className={resumableState.orders.length > 0 ? "mt-3 border-t border-sky-200 pt-3" : ""}
          >
            <p className="font-medium">Você tem um checkout em andamento neste aparelho.</p>
            <p className="mt-1 text-xs text-sky-800">Retome a sessão para concluir o pedido.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={resumableState.checkoutHref} data-testid="recovery-checkout-link" className="cx-btn-secondary px-3 py-1.5 text-xs">
                Retomar checkout
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearCheckoutRecovery(slug);
                  setResumableState((current) => {
                    if (!current) {
                      return null;
                    }

                    if (current.orders.length === 0) {
                      return null;
                    }

                    return {
                      ...current,
                      checkoutHref: null,
                    };
                  });
                }}
                className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
              >
                Limpar sessão salva
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
