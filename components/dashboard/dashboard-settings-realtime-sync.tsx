"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getRealtimeConnectionLabel, useRealtimeRefresh } from "@/components/shared/use-realtime-refresh";
import { useCallback } from "react";

type DashboardSettingsRealtimeSyncProps = {
  slug: string;
  blockAutoRefresh?: boolean;
  refreshNowToken?: number;
  onPendingRefreshChange?: (hasPending: boolean) => void;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 800;

export function DashboardSettingsRealtimeSync({
  slug,
  blockAutoRefresh = false,
  refreshNowToken = 0,
  onPendingRefreshChange,
  className,
}: DashboardSettingsRealtimeSyncProps) {
  const subscribe = useCallback(({ onSignal, onChannelStatus }: { onSignal: () => void; onChannelStatus: (status: string) => void }) => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`public:menu:${slug}`)
      .on("broadcast", { event: "menu_refresh" }, onSignal)
      .subscribe(onChannelStatus);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [slug]);

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
