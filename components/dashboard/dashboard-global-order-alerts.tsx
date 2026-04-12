"use client";

import {
  addPendingNewOrderIds,
  ensureNewOrderAudioInteractionTracking,
  playNewOrderSound,
  requestOrderCardFocus,
  readNewOrderSoundLevel,
  readPendingNewOrderIds,
  readSeenActiveOrderIds,
  removePendingNewOrderIds,
  subscribePendingNewOrderIds,
  writeSeenActiveOrderIds,
} from "@/lib/orders/new-order-notifications";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/components/shared/toast-provider";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AwaitingOrderRow = {
  id: string;
  display_code: string | null;
  order_number: number | null;
  created_at: string | null;
};

type DashboardGlobalOrderAlertsProps = {
  storeId: string;
  onPendingCountChange?: (count: number) => void;
};

const NEW_ORDER_TOAST_DURATION_MS = 13000;
const POLL_INTERVAL_MS_FALLBACK = 120000;

function formatOrderLabel(order: AwaitingOrderRow) {
  const displayCode = order.display_code?.trim();
  if (displayCode) {
    return displayCode.startsWith("#") ? displayCode : `#${displayCode}`;
  }

  if (typeof order.order_number === "number") {
    return `#${order.order_number}`;
  }

  return "novo pedido";
}

export function DashboardGlobalOrderAlerts({ storeId, onPendingCountChange }: DashboardGlobalOrderAlertsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { enqueueToast } = useToast();

  const [pendingCount, setPendingCount] = useState(0);

  const baseTitleRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);
  const isOrdersRoute = useMemo(() => pathname.startsWith("/dashboard/pedidos"), [pathname]);

  useEffect(() => {
    baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, "");

    return () => {
      if (baseTitleRef.current) {
        document.title = baseTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    const baseTitle = baseTitleRef.current;
    if (!baseTitle) {
      return;
    }

    if (pendingCount > 0) {
      document.title = `(${pendingCount}) ${baseTitle}`;
      return;
    }

    document.title = baseTitle;
  }, [pendingCount]);

  useEffect(() => {
    setPendingCount(0);
    onPendingCountChange?.(0);

    const unsubscribe = subscribePendingNewOrderIds(storeId, (ids) => {
      const nextCount = ids.size;
      setPendingCount(nextCount);
      onPendingCountChange?.(nextCount);
    });

    return () => {
      unsubscribe();
    };
  }, [onPendingCountChange, storeId]);

  useEffect(() => {
    ensureNewOrderAudioInteractionTracking();
  }, []);

  const inspectNewOrders = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("orders")
        .select("id, display_code, order_number, created_at")
        .eq("store_id", storeId)
        .eq("status", "aguardando_aceite")
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) {
        return;
      }

      const awaitingOrders = (data ?? []) as AwaitingOrderRow[];
      const activeAwaitingIds = awaitingOrders.map((order) => order.id);
      const activeAwaitingSet = new Set(activeAwaitingIds);

      const seenSnapshot = readSeenActiveOrderIds(storeId);
      if (!seenSnapshot.initialized) {
        writeSeenActiveOrderIds(storeId, {
          initialized: true,
          ids: new Set(activeAwaitingIds),
        });

        return;
      }

      const newOrders = awaitingOrders.filter((order) => !seenSnapshot.ids.has(order.id));
      const nextSeenIds = new Set(seenSnapshot.ids);

      for (const id of activeAwaitingIds) {
        nextSeenIds.add(id);
      }

      writeSeenActiveOrderIds(storeId, {
        initialized: true,
        ids: nextSeenIds,
      });

      const stalePendingIds = Array.from(readPendingNewOrderIds(storeId)).filter((id) => !activeAwaitingSet.has(id));
      if (stalePendingIds.length > 0) {
        removePendingNewOrderIds(storeId, stalePendingIds);
      }

      if (newOrders.length === 0) {
        return;
      }

      addPendingNewOrderIds(
        storeId,
        newOrders.map((order) => order.id)
      );

      const focusOrderId = newOrders[0].id;
      const focusOrderLabel = formatOrderLabel(newOrders[0]);

      enqueueToast({
        id: `new-order-${focusOrderId}-${Date.now().toString(36)}`,
        tone: "warning",
        title: "Novo pedido aguardando aceite",
        text:
          newOrders.length === 1
            ? `Pedido ${focusOrderLabel} chegou agora.`
            : `Pedido ${focusOrderLabel} chegou agora. Ha mais ${newOrders.length - 1} novo(s) pedido(s).`,
        emphasis: "new-order",
        durationMs: NEW_ORDER_TOAST_DURATION_MS,
        action: {
          label: "Ver pedido",
          onClick: () => {
            requestOrderCardFocus(storeId, focusOrderId);

            if (!isOrdersRoute) {
              router.push("/dashboard/pedidos");
            }
          },
        },
      });

      void playNewOrderSound(readNewOrderSoundLevel());
    } finally {
      isCheckingRef.current = false;
    }
  }, [enqueueToast, isOrdersRoute, router, storeId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const storeFilter = `store_id=eq.${storeId}`;

    const channel = supabase
      .channel(`dashboard-global-new-orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: storeFilter,
        },
        () => {
          void inspectNewOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: storeFilter,
        },
        () => {
          void inspectNewOrders();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void inspectNewOrders();
        }
      });

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void inspectNewOrders();
    };

    const onOnline = () => {
      void inspectNewOrders();
    };

    document.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);
    window.addEventListener("online", onOnline);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void inspectNewOrders();
    }, POLL_INTERVAL_MS_FALLBACK);

    void inspectNewOrders();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(channel);
    };
  }, [inspectNewOrders, storeId]);

  return null;
}
