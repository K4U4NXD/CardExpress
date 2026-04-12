"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getRealtimeConnectionLabel, useRealtimeRefresh } from "@/components/shared/use-realtime-refresh";
import { useCallback } from "react";

type DashboardProductsRealtimeSyncProps = {
  storeId: string;
  blockAutoRefresh?: boolean;
  refreshNowToken?: number;
  onPendingRefreshChange?: (hasPending: boolean) => void;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 800;

export function DashboardProductsRealtimeSync({
  storeId,
  blockAutoRefresh = false,
  refreshNowToken = 0,
  onPendingRefreshChange,
  className,
}: DashboardProductsRealtimeSyncProps) {
  const subscribe = useCallback(async ({ onSignal, onChannelStatus }: { onSignal: () => void; onChannelStatus: (status: string) => void }) => {
    const supabase = createBrowserSupabaseClient();
    const channelName = `dashboard-products:${storeId}`;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    const channel = supabase
      .channel(channelName, { config: { private: true } })
      .on("broadcast", { event: "products_refresh" }, onSignal)
      .subscribe(onChannelStatus);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [storeId]);

  const { connectionState, lastUpdatedText } = useRealtimeRefresh({
    subscribe,
    debounceMs: REFRESH_DEBOUNCE_MS,
    blockAutoRefresh,
    refreshNowToken,
    onPendingRefreshChange,
  });

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      {getRealtimeConnectionLabel(connectionState)} • Última atualização: {lastUpdatedText}
    </p>
  );
}
