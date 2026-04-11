"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const router = useRouter();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refreshTimeoutRef = useRef<number | null>(null);
  const pendingRefreshWhileHiddenRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createBrowserSupabaseClient();

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
      .channel(`public:order:${orderId}:${publicToken}`)
      .on("broadcast", { event: "order_refresh" }, refreshSoon)
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
  }, [enabled, orderId, publicToken, router]);

  const lastUpdatedText = useMemo(() => {
    if (!enabled) {
      return "atualizacao pausada";
    }

    if (!lastUpdatedAt) {
      return "aguardando sinal";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastUpdatedAt);
  }, [enabled, lastUpdatedAt]);

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      Atualização em tempo real ativa • Última atualização: {lastUpdatedText}
    </p>
  );
}
