"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AutoRefreshProps = {
  intervalMs: number;
  enabled?: boolean;
  label?: string;
  pausedLabel?: string;
  pauseWhenHidden?: boolean;
  className?: string;
};

export function AutoRefresh({
  intervalMs,
  enabled = true,
  label = "Atualizacao automatica ativa",
  pausedLabel = "Atualizacao automatica pausada",
  pauseWhenHidden = true,
  className,
}: AutoRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isPageVisible, setIsPageVisible] = useState(true);

  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    if (!pauseWhenHidden) {
      return;
    }

    const onVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsPageVisible(visible);

      if (visible && enabled) {
        router.refresh();
        setLastUpdatedAt(new Date());
      }
    };

    setIsPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, pauseWhenHidden, router]);

  useEffect(() => {
    setLastUpdatedAt(new Date());
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    const canRefresh = enabled && (!pauseWhenHidden || isPageVisible);
    if (!canRefresh) {
      return;
    }

    const timerId = window.setInterval(() => {
      router.refresh();
      setLastUpdatedAt(new Date());
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [enabled, intervalMs, isPageVisible, pauseWhenHidden, pathname, router, searchParamsKey]);

  const statusText = enabled && (!pauseWhenHidden || isPageVisible) ? label : pausedLabel;

  const formattedLastUpdated = useMemo(() => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(lastUpdatedAt);
  }, [lastUpdatedAt]);

  const mergedClassName = ["text-[11px] leading-4 text-zinc-500", className].filter(Boolean).join(" ");

  return (
    <p className={mergedClassName} aria-live="polite">
      {statusText} - Ultima atualizacao: {formattedLastUpdated}
    </p>
  );
}
