"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type DashboardHomeRealtimeSyncProps = {
  storeId: string;
  className?: string;
};

const REFRESH_DEBOUNCE_MS = 800;

export function DashboardHomeRealtimeSync({ storeId, className }: DashboardHomeRealtimeSyncProps) {
  const router = useRouter();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refreshTimeoutRef = useRef<number | null>(null);
  const pendingRefreshWhileHiddenRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isDisposed = false;
    const channelName = `dashboard-home:${storeId}`;
    let activeChannel: Awaited<ReturnType<typeof supabase.channel>> | null = null;

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

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      if (isDisposed) {
        return;
      }

      activeChannel = supabase
        .channel(channelName, { config: { private: true } })
        .on("broadcast", { event: "dashboard_refresh" }, refreshSoon)
        .subscribe();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void setupRealtime();

    return () => {
      isDisposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      pendingRefreshWhileHiddenRef.current = false;

      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [router, storeId]);

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

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      Atualização em tempo real ativa • Última atualização: {lastUpdatedText}
    </p>
  );
}
