"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getRealtimeConnectionLabel, useRealtimeRefresh } from "@/components/shared/use-realtime-refresh";
import { useCallback } from "react";

type PublicOrderRealtimeSyncProps = {
  orderId: string;
  publicToken: string;
  enabled?: boolean;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 700;

export function PublicOrderRealtimeSync({
  orderId,
  publicToken,
  enabled = true,
  className,
}: PublicOrderRealtimeSyncProps) {
  const subscribe = useCallback(({ onSignal, onChannelStatus }: { onSignal: () => void; onChannelStatus: (status: string) => void }) => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`public:order:${orderId}:${publicToken}`)
      .on("broadcast", { event: "order_refresh" }, onSignal)
      .subscribe(onChannelStatus);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, publicToken]);

  const { connectionState, lastUpdatedText } = useRealtimeRefresh({
    subscribe,
    debounceMs: REFRESH_DEBOUNCE_MS,
    enabled,
  });

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      {getRealtimeConnectionLabel(connectionState)} • Última atualização: {lastUpdatedText}
    </p>
  );
}
