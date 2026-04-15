"use client";

import { useEffect, useMemo } from "react";

import { PublicShareLinkActions } from "@/components/public/public-share-link-actions";
import { clearOrderRecovery, isTerminalOrderStatus, saveOrderRecovery } from "@/lib/public/flow-recovery";
import type { OrderStatus } from "@/types";

type PublicOrderRecoveryToolsProps = {
  slug: string;
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  displayCode: string | null;
};

export function PublicOrderRecoveryTools({
  slug,
  orderId,
  publicToken,
  status,
  displayCode,
}: PublicOrderRecoveryToolsProps) {
  const relativeOrderPath = useMemo(
    () => `/${slug}/pedido/${orderId}?token=${encodeURIComponent(publicToken)}`,
    [orderId, publicToken, slug]
  );

  useEffect(() => {
    if (isTerminalOrderStatus(status)) {
      clearOrderRecovery(slug, orderId);
      return;
    }

    saveOrderRecovery({
      slug,
      orderId,
      orderPublicToken: publicToken,
      status,
      displayCode,
      orderUrl: relativeOrderPath,
      clearCheckout: false,
    });
  }, [displayCode, orderId, publicToken, relativeOrderPath, slug, status]);

  return (
    <PublicShareLinkActions
      relativePath={relativeOrderPath}
      microcopy="Guarde este link para acompanhar seu pedido."
      className="mt-4"
    />
  );
}