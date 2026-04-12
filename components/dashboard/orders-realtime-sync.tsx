"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getRealtimeConnectionLabel, useRealtimeRefresh } from "@/components/shared/use-realtime-refresh";
import { useCallback } from "react";

type OrdersRealtimeSyncProps = {
  storeId: string;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 900;

export function OrdersRealtimeSync({ storeId, className }: OrdersRealtimeSyncProps) {
  const subscribe = useCallback(({ onSignal, onChannelStatus }: { onSignal: () => void; onChannelStatus: (status: string) => void }) => {
    const supabase = createBrowserSupabaseClient();
    const storeFilter = `store_id=eq.${storeId}`;

    const channel = supabase
      .channel(`dashboard-orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: storeFilter,
        },
        onSignal
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: storeFilter,
        },
        onSignal
      )
      .subscribe(onChannelStatus);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId]);

  const { connectionState, lastUpdatedText } = useRealtimeRefresh({
    subscribe,
    debounceMs: REFRESH_DEBOUNCE_MS,
  });

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      {getRealtimeConnectionLabel(connectionState)} • Última atualização: {lastUpdatedText}
    </p>
  );
}
