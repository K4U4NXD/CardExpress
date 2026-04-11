"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type OrdersRealtimeSyncProps = {
  storeId: string;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 900;
const DEBUG_DISABLE_FILTER = false;

export function OrdersRealtimeSync({ storeId, className }: OrdersRealtimeSyncProps) {
  const router = useRouter();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refreshTimeoutRef = useRef<number | null>(null);
  const pendingRefreshWhileHiddenRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const storeFilter = `store_id=eq.${storeId}`;

    console.log(
      `[orders realtime] setup storeId=${storeId} debugDisableFilter=${String(DEBUG_DISABLE_FILTER)}`,
    );

    const refreshSoon = () => {
      console.log(`[orders realtime] refreshSoon called storeId=${storeId}`);

      if (document.visibilityState !== "visible") {
        console.log(`[orders realtime] refresh deferred (tab hidden) storeId=${storeId}`);
        pendingRefreshWhileHiddenRef.current = true;
        return;
      }

      if (refreshTimeoutRef.current !== null) {
        console.log(`[orders realtime] refresh already scheduled storeId=${storeId}`);
        return;
      }

      console.log(`[orders realtime] refresh scheduled in ${REFRESH_DEBOUNCE_MS}ms storeId=${storeId}`);
      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        console.log(`[orders realtime] router.refresh executed storeId=${storeId}`);
        router.refresh();
        setLastUpdatedAt(new Date());
      }, REFRESH_DEBOUNCE_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (!pendingRefreshWhileHiddenRef.current) {
        return;
      }

      pendingRefreshWhileHiddenRef.current = false;
      console.log(`[orders realtime] tab visible again; applying deferred refresh storeId=${storeId}`);
      refreshSoon();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase.channel(`dashboard-orders-${storeId}`);

    const baseInsertConfig: {
      event: "INSERT";
      schema: "public";
      table: "orders";
      filter?: string;
    } = {
      event: "INSERT",
      schema: "public",
      table: "orders",
    };

    const baseUpdateConfig: {
      event: "UPDATE";
      schema: "public";
      table: "orders";
      filter?: string;
    } = {
      event: "UPDATE",
      schema: "public",
      table: "orders",
    };

    if (!DEBUG_DISABLE_FILTER) {
      baseInsertConfig.filter = storeFilter;
      baseUpdateConfig.filter = storeFilter;
    }

    channel
      .on("postgres_changes", baseInsertConfig, (payload) => {
        console.log(
          `[orders realtime] INSERT payload received storeId=${storeId} filter=${DEBUG_DISABLE_FILTER ? "none" : storeFilter}`,
          payload,
        );
        refreshSoon();
      })
      .on("postgres_changes", baseUpdateConfig, (payload) => {
        console.log(
          `[orders realtime] UPDATE payload received storeId=${storeId} filter=${DEBUG_DISABLE_FILTER ? "none" : storeFilter}`,
          payload,
        );
        refreshSoon();
      })
      .subscribe((status, error) => {
        if (error) {
          console.error(`[orders realtime] status=${status} storeId=${storeId}`, error);
          return;
        }

        console.log(
          `[orders realtime] status=${status} storeId=${storeId} filter=${DEBUG_DISABLE_FILTER ? "none" : storeFilter}`,
        );
      });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (refreshTimeoutRef.current !== null) {
        console.log(`[orders realtime] clearing scheduled refresh storeId=${storeId}`);
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      pendingRefreshWhileHiddenRef.current = false;
      console.log(`[orders realtime] cleanup; remove channel storeId=${storeId}`);
      void supabase.removeChannel(channel);
    };
  }, [router, storeId]);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdatedAt) {
      return "aguardando mudanças";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastUpdatedAt);
  }, [lastUpdatedAt]);

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      Atualização em tempo real ativa - Última atualização: {lastUpdatedText}
    </p>
  );
}
