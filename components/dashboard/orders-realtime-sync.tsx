"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type OrdersRealtimeSyncProps = {
  storeId: string;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 900;

export function OrdersRealtimeSync({ storeId, className }: OrdersRealtimeSyncProps) {
  const router = useRouter();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refreshTimeoutRef = useRef<number | null>(null);
  const pendingRefreshWhileHiddenRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const storeFilter = `store_id=eq.${storeId}`;

    const refreshSoon = () => {
      if (document.visibilityState !== "visible") {
        pendingRefreshWhileHiddenRef.current = true;
        return;
      }

      if (refreshTimeoutRef.current !== null) {
        return;
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
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
      refreshSoon();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const channel = supabase
      .channel(`dashboard-orders-${storeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: storeFilter,
      }, refreshSoon)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: storeFilter,
      }, refreshSoon)
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      pendingRefreshWhileHiddenRef.current = false;
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
      Atualização em tempo real ativa • Última atualização: {lastUpdatedText}
    </p>
  );
}
