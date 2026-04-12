"use client";

import type { Order, OrderItem } from "@/types";
import {
  consumePendingOrderCardFocus,
  getOrderCardElementId,
  readPendingNewOrderIds,
  removePendingNewOrderIds,
  subscribeOrderCardFocusRequests,
  subscribePendingNewOrderIds,
} from "@/lib/orders/new-order-notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderRow } from "./order-row";

type DashboardOrder = Order & {
  order_items?: Array<Pick<OrderItem, "name" | "quantity">> | null;
};

type OrdersLiveListProps = {
  storeId: string;
  orders: DashboardOrder[];
  canPrunePending?: boolean;
};

type HighlightWindow = {
  strongUntil: number;
  softUntil: number;
};

type HighlightWindowsByOrderId = Record<string, HighlightWindow>;

const HIGHLIGHT_WINDOWS_STORAGE_PREFIX = "cardexpress:new-order-highlight-windows:";
const AGUARDANDO_BASELINE_STORAGE_PREFIX = "cardexpress:awaiting-orders-baseline:";
const MAX_BASELINE_IDS = 500;
const STRONG_HIGHLIGHT_MS = 3000;
const SOFT_HIGHLIGHT_EXTRA_MS = 7000;
const HIGHLIGHT_TICK_MS = 240;
const JUMP_FOCUS_MS = 7500;
const SCROLL_RETRY_MS = 180;
const MAX_SCROLL_ATTEMPTS = 8;

function getHighlightWindowsStorageKey(storeId: string) {
  return `${HIGHLIGHT_WINDOWS_STORAGE_PREFIX}${storeId}`;
}

function getAguardandoBaselineStorageKey(storeId: string) {
  return `${AGUARDANDO_BASELINE_STORAGE_PREFIX}${storeId}`;
}

function createHighlightWindow(now: number): HighlightWindow {
  const strongUntil = now + STRONG_HIGHLIGHT_MS;
  return {
    strongUntil,
    softUntil: strongUntil + SOFT_HIGHLIGHT_EXTRA_MS,
  };
}

function readHighlightWindows(storeId: string, now: number): HighlightWindowsByOrderId {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(getHighlightWindowsStorageKey(storeId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const result: HighlightWindowsByOrderId = {};

    for (const [orderId, value] of Object.entries(parsed)) {
      if (typeof orderId !== "string" || !value || typeof value !== "object") {
        continue;
      }

      const candidate = value as { strongUntil?: unknown; softUntil?: unknown };
      const strongUntil = typeof candidate.strongUntil === "number" ? candidate.strongUntil : 0;
      const softUntil = typeof candidate.softUntil === "number" ? candidate.softUntil : 0;

      if (!Number.isFinite(strongUntil) || !Number.isFinite(softUntil)) {
        continue;
      }

      if (softUntil <= now) {
        continue;
      }

      result[orderId] = { strongUntil, softUntil };
    }

    return result;
  } catch {
    return {};
  }
}

function writeHighlightWindows(storeId: string, windows: HighlightWindowsByOrderId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (Object.keys(windows).length === 0) {
      window.sessionStorage.removeItem(getHighlightWindowsStorageKey(storeId));
      return;
    }

    window.sessionStorage.setItem(getHighlightWindowsStorageKey(storeId), JSON.stringify(windows));
  } catch {
    // Mantem UX local mesmo quando sessionStorage estiver indisponivel.
  }
}

function readAguardandoBaselineIds(storeId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getAguardandoBaselineStorageKey(storeId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const ids = parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
    return new Set(ids);
  } catch {
    return null;
  }
}

function writeAguardandoBaselineIds(storeId: string, ids: Iterable<string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const uniqueIds = Array.from(new Set(ids)).filter((id) => typeof id === "string" && id.length > 0);
    const trimmed = uniqueIds.length > MAX_BASELINE_IDS ? uniqueIds.slice(uniqueIds.length - MAX_BASELINE_IDS) : uniqueIds;
    window.sessionStorage.setItem(getAguardandoBaselineStorageKey(storeId), JSON.stringify(trimmed));
  } catch {
    // Mantem UX local mesmo sem sessionStorage.
  }
}

export function OrdersLiveList({ storeId, orders, canPrunePending = false }: OrdersLiveListProps) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [highlightWindows, setHighlightWindows] = useState<HighlightWindowsByOrderId>({});
  const [strongPulseNonceById, setStrongPulseNonceById] = useState<Record<string, number>>({});
  const [focusedByJumpId, setFocusedByJumpId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const jumpFocusTimerRef = useRef<number | null>(null);
  const previousAguardandoIdsRef = useRef<Set<string> | null>(null);
  const initializedStoreRef = useRef<string | null>(null);

  const aguardandoIds = useMemo(
    () => orders.filter((order) => order.status === "aguardando_aceite").map((order) => order.id),
    [orders]
  );

  const aguardandoSet = useMemo(() => new Set(aguardandoIds), [aguardandoIds]);

  const clearJumpFocusTimer = useCallback(() => {
    if (jumpFocusTimerRef.current !== null) {
      window.clearTimeout(jumpFocusTimerRef.current);
      jumpFocusTimerRef.current = null;
    }
  }, []);

  const acknowledgeOrder = useCallback(
    (orderId: string) => {
      setFocusedByJumpId((current) => (current === orderId ? null : current));
      removePendingNewOrderIds(storeId, [orderId]);
    },
    [storeId]
  );

  const focusOrderCard = useCallback(
    (orderId: string, attempt = 0) => {
      const targetId = getOrderCardElementId(orderId);
      const targetElement = document.getElementById(targetId);

      if (!targetElement) {
        if (attempt < MAX_SCROLL_ATTEMPTS) {
          window.setTimeout(() => {
            focusOrderCard(orderId, attempt + 1);
          }, SCROLL_RETRY_MS);
        }
        return;
      }

      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusedByJumpId(orderId);
      acknowledgeOrder(orderId);

      clearJumpFocusTimer();

      jumpFocusTimerRef.current = window.setTimeout(() => {
        setFocusedByJumpId((current) => (current === orderId ? null : current));
        jumpFocusTimerRef.current = null;
      }, JUMP_FOCUS_MS);
    },
    [acknowledgeOrder, clearJumpFocusTimer]
  );

  useEffect(() => {
    if (initializedStoreRef.current === storeId) {
      return;
    }

    initializedStoreRef.current = storeId;

    clearJumpFocusTimer();
    setFocusedByJumpId(null);
    const now = Date.now();
    const pendingSnapshot = Array.from(readPendingNewOrderIds(storeId));
    const persistedBaseline = readAguardandoBaselineIds(storeId);

    setNowMs(now);
    setPendingIds(pendingSnapshot);
    setHighlightWindows(readHighlightWindows(storeId, now));
    setStrongPulseNonceById({});
    previousAguardandoIdsRef.current = persistedBaseline ?? new Set(aguardandoIds);
    writeAguardandoBaselineIds(storeId, aguardandoIds);

    const unsubscribe = subscribePendingNewOrderIds(storeId, (ids) => {
      setPendingIds(Array.from(ids));
    });

    const unsubscribeFocus = subscribeOrderCardFocusRequests(storeId, (orderId) => {
      focusOrderCard(orderId);
    });

    const pendingFocusOrderId = consumePendingOrderCardFocus(storeId);
    if (pendingFocusOrderId) {
      window.setTimeout(() => {
        focusOrderCard(pendingFocusOrderId);
      }, 120);
    }

    return () => {
      unsubscribe();
      unsubscribeFocus();
      clearJumpFocusTimer();
    };
  }, [aguardandoIds, clearJumpFocusTimer, focusOrderCard, storeId]);

  useEffect(() => {
    if (!canPrunePending) {
      return;
    }

    if (pendingIds.length === 0) {
      return;
    }

    const stalePendingIds = pendingIds.filter((id) => !aguardandoSet.has(id));
    if (stalePendingIds.length === 0) {
      return;
    }

    removePendingNewOrderIds(storeId, stalePendingIds);
  }, [aguardandoSet, canPrunePending, pendingIds, storeId]);

  useEffect(() => {
    const currentAguardandoSet = new Set(aguardandoIds);

    if (previousAguardandoIdsRef.current === null) {
      const persistedBaseline = readAguardandoBaselineIds(storeId);
      previousAguardandoIdsRef.current = persistedBaseline ?? currentAguardandoSet;
      writeAguardandoBaselineIds(storeId, currentAguardandoSet);
      return;
    }

    const previousAguardandoSet = previousAguardandoIdsRef.current;
    const additions = aguardandoIds.filter((orderId) => !previousAguardandoSet.has(orderId));

    previousAguardandoIdsRef.current = currentAguardandoSet;
    writeAguardandoBaselineIds(storeId, currentAguardandoSet);

    if (additions.length === 0) {
      return;
    }

    const now = Date.now();
    setNowMs(now);

    setHighlightWindows((current) => {
      const next: HighlightWindowsByOrderId = { ...current };
      let changed = false;

      for (const orderId of additions) {
        const existing = next[orderId];
        if (existing && existing.softUntil > now) {
          continue;
        }

        next[orderId] = createHighlightWindow(now);
        changed = true;
      }

      if (!changed) {
        return current;
      }

      writeHighlightWindows(storeId, next);
      return next;
    });

    setStrongPulseNonceById((current) => {
      const next = { ...current };
      for (const orderId of additions) {
        next[orderId] = (next[orderId] ?? 0) + 1;
      }
      return next;
    });
  }, [aguardandoIds, storeId]);

  useEffect(() => {
    if (Object.keys(highlightWindows).length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, HIGHLIGHT_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [highlightWindows]);

  useEffect(() => {
    if (Object.keys(highlightWindows).length === 0) {
      return;
    }

    const next: HighlightWindowsByOrderId = {};
    let changed = false;

    for (const [orderId, windowState] of Object.entries(highlightWindows)) {
      if (windowState.softUntil > nowMs) {
        next[orderId] = windowState;
        continue;
      }

      changed = true;
    }

    if (!changed) {
      return;
    }

    setHighlightWindows(next);
    writeHighlightWindows(storeId, next);
  }, [highlightWindows, nowMs, storeId]);

  const strongHighlightSet = useMemo(() => {
    const result = new Set<string>();

    for (const [orderId, windowState] of Object.entries(highlightWindows)) {
      if (windowState.strongUntil > nowMs) {
        result.add(orderId);
      }
    }

    return result;
  }, [highlightWindows, nowMs]);

  const softHighlightSet = useMemo(() => {
    const result = new Set<string>();

    for (const [orderId, windowState] of Object.entries(highlightWindows)) {
      if (windowState.strongUntil <= nowMs && windowState.softUntil > nowMs) {
        result.add(orderId);
      }
    }

    return result;
  }, [highlightWindows, nowMs]);

  const localNewHighlightSet = useMemo(() => {
    const result = new Set<string>();

    for (const [orderId, windowState] of Object.entries(highlightWindows)) {
      if (windowState.softUntil > nowMs) {
        result.add(orderId);
      }
    }

    return result;
  }, [highlightWindows, nowMs]);

  return (
    <div className="mt-4 space-y-3">
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          isNewlyArrived={localNewHighlightSet.has(order.id)}
          isStrongNewHighlight={strongHighlightSet.has(order.id)}
          isSoftNewHighlight={softHighlightSet.has(order.id)}
          strongPulseNonce={strongPulseNonceById[order.id] ?? 0}
          isFocusedByJump={focusedByJumpId === order.id}
          onAcknowledgeNew={acknowledgeOrder}
        />
      ))}
    </div>
  );
}
