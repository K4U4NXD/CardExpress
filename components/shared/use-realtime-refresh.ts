"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RealtimeConnectionState = "active" | "reconnecting" | "unavailable";

type RealtimeSubscribeHandlers = {
  onSignal: () => void;
  onChannelStatus: (status: string) => void;
};

type RealtimeSubscribeCleanup = void | (() => void | Promise<void>);

type UseRealtimeRefreshOptions = {
  subscribe: (handlers: RealtimeSubscribeHandlers) => Promise<RealtimeSubscribeCleanup> | RealtimeSubscribeCleanup;
  debounceMs: number;
  enabled?: boolean;
  blockAutoRefresh?: boolean;
  refreshNowToken?: number;
  onPendingRefreshChange?: (hasPending: boolean) => void;
};

export function getRealtimeConnectionLabel(state: RealtimeConnectionState) {
  if (state === "active") {
    return "Atualização em tempo real ativa";
  }

  if (state === "reconnecting") {
    return "Reconectando atualização em tempo real...";
  }

  return "Atualização em tempo real indisponível no momento";
}

export function useRealtimeRefresh({
  subscribe,
  debounceMs,
  enabled = true,
  blockAutoRefresh = false,
  refreshNowToken = 0,
  onPendingRefreshChange,
}: UseRealtimeRefreshOptions) {
  const router = useRouter();

  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>(enabled ? "reconnecting" : "unavailable");

  const refreshTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const pendingRefreshWhileHiddenRef = useRef(false);
  const hasPendingRefreshRef = useRef(false);
  const blockAutoRefreshRef = useRef(blockAutoRefresh);
  const disposedRef = useRef(false);
  const connectionStateRef = useRef<RealtimeConnectionState>(enabled ? "reconnecting" : "unavailable");
  const cleanupRef = useRef<null | (() => void | Promise<void>)>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  const setPendingRefresh = useCallback(
    (hasPending: boolean) => {
      if (hasPendingRefreshRef.current === hasPending) {
        return;
      }

      hasPendingRefreshRef.current = hasPending;
      onPendingRefreshChange?.(hasPending);
    },
    [onPendingRefreshChange]
  );

  const setConnection = useCallback((next: RealtimeConnectionState) => {
    connectionStateRef.current = next;
    setConnectionState(next);
  }, []);

  const clearActiveSubscription = useCallback(async () => {
    const cleanup = cleanupRef.current;
    cleanupRef.current = null;

    if (!cleanup) {
      return;
    }

    await cleanup();
  }, []);

  const refreshNow = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    router.refresh();
    setLastUpdatedAt(new Date());
    pendingRefreshWhileHiddenRef.current = false;
    setPendingRefresh(false);
  }, [router, setPendingRefresh]);

  const refreshSoon = useCallback(() => {
    if (document.visibilityState !== "visible") {
      pendingRefreshWhileHiddenRef.current = true;
      setPendingRefresh(true);
      return;
    }

    if (blockAutoRefreshRef.current) {
      setPendingRefresh(true);
      return;
    }

    if (refreshTimeoutRef.current !== null) {
      return;
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      refreshNow();
    }, debounceMs);
  }, [debounceMs, refreshNow, setPendingRefresh]);

  const scheduleReconnect = useCallback(() => {
    if (disposedRef.current || !enabled) {
      return;
    }

    if (reconnectTimeoutRef.current !== null) {
      return;
    }

    const delayMs = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
    reconnectAttemptRef.current += 1;

    if (reconnectAttemptRef.current >= 5) {
      setConnection("unavailable");
    } else {
      setConnection("reconnecting");
    }

    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      void connectRef.current();
    }, delayMs);
  }, [enabled, setConnection]);

  const onChannelStatus = useCallback(
    (status: string) => {
      if (status === "SUBSCRIBED") {
        reconnectAttemptRef.current = 0;
        setConnection("active");
        return;
      }

      if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setConnection("reconnecting");
        scheduleReconnect();
        return;
      }

      if (status === "CLOSED") {
        setConnection("unavailable");
        scheduleReconnect();
      }
    },
    [scheduleReconnect, setConnection]
  );

  const connect = useCallback(async () => {
    if (disposedRef.current || !enabled) {
      return;
    }

    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    await clearActiveSubscription();
    setConnection("reconnecting");

    try {
      const cleanup = await subscribe({
        onSignal: refreshSoon,
        onChannelStatus,
      });

      cleanupRef.current = typeof cleanup === "function" ? cleanup : null;
    } catch {
      setConnection("unavailable");
      scheduleReconnect();
    }
  }, [clearActiveSubscription, enabled, onChannelStatus, refreshSoon, scheduleReconnect, setConnection, subscribe]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    blockAutoRefreshRef.current = blockAutoRefresh;

    if (blockAutoRefresh && pendingRefreshWhileHiddenRef.current) {
      setPendingRefresh(true);
      return;
    }

    if (!blockAutoRefresh && hasPendingRefreshRef.current && document.visibilityState === "visible") {
      refreshSoon();
    }
  }, [blockAutoRefresh, refreshSoon, setPendingRefresh]);

  useEffect(() => {
    if (!enabled || refreshNowToken <= 0) {
      return;
    }

    refreshNow();
  }, [enabled, refreshNow, refreshNowToken]);

  useEffect(() => {
    if (!enabled) {
      setConnection("unavailable");
      void clearActiveSubscription();
      return;
    }

    disposedRef.current = false;
    void connect();

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (pendingRefreshWhileHiddenRef.current) {
        pendingRefreshWhileHiddenRef.current = false;
        refreshSoon();
      }

      if (connectionStateRef.current !== "active") {
        void connectRef.current();
      }
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        refreshSoon();
      }

      if (connectionStateRef.current !== "active") {
        void connectRef.current();
      }
    };

    const onOnline = () => {
      refreshSoon();
      void connectRef.current();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      disposedRef.current = true;

      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      pendingRefreshWhileHiddenRef.current = false;
      setPendingRefresh(false);
      void clearActiveSubscription();
    };
  }, [clearActiveSubscription, connect, enabled, refreshSoon, scheduleReconnect, setConnection, setPendingRefresh]);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdatedAt) {
      return "aguardando sinal";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastUpdatedAt);
  }, [lastUpdatedAt]);

  return {
    connectionState,
    lastUpdatedText,
    refreshNow,
  };
}
