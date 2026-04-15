"use client";

import Link from "next/link";
import { PublicPanelRealtimeSync } from "@/components/public/public-panel-realtime-sync";
import {
  ensurePublicAudioInteractionTracking,
  playPublicPanelCallSound,
  readPublicPanelSoundEnabled,
  writePublicPanelSoundEnabled,
} from "@/lib/public/alert-sounds";
import { formatDateTime } from "@/lib/orders/presenter";
import { useEffect, useMemo, useRef, useState } from "react";

type LatestReadyOrder = {
  order_id: string;
  display_code: string | null;
  ready_at: string | null;
};

type PublicReadyPanelClientProps = {
  slug: string;
  latestOrder: LatestReadyOrder | null;
  recentCalledOrders: PanelHistoryItem[];
  mode?: "default" | "tv";
  storeName?: string;
  tvModeHref?: string;
};

type PanelHistoryItem = {
  order_id: string;
  display_code: string | null;
  ready_at: string | null;
};

type PanelHistoryRenderItem = PanelHistoryItem & {
  render_key: string;
};

const HISTORY_LIMIT = 5;

export function PublicReadyPanelClient({
  slug,
  latestOrder,
  recentCalledOrders,
  mode = "default",
  storeName,
  tvModeHref,
}: PublicReadyPanelClientProps) {
  const [soundEnabled, setSoundEnabled] = useState(false);

  const initializedSlugRef = useRef<string | null>(null);
  const previousLatestRef = useRef<string | null>(null);

  const calledHistory = useMemo<PanelHistoryRenderItem[]>(() => {
    const seenKeys = new Set<string>();

    return [...recentCalledOrders]
      .sort((a, b) => {
        const aTime = a.ready_at ? Date.parse(a.ready_at) : 0;
        const bTime = b.ready_at ? Date.parse(b.ready_at) : 0;
        return bTime - aTime;
      })
      .map((item) => ({
        ...item,
        render_key: `${item.order_id}:${item.ready_at ?? "no-ready-at"}`,
      }))
      .filter((item) => {
        if (seenKeys.has(item.render_key)) {
          return false;
        }

        seenKeys.add(item.render_key);
        return true;
      })
      .slice(0, HISTORY_LIMIT);
  }, [recentCalledOrders]);
  const latestCalled = latestOrder ?? calledHistory[0] ?? null;
  const latestDisplayCode = latestCalled?.display_code ?? "----";

  useEffect(() => {
    if (initializedSlugRef.current === slug) {
      return;
    }

    initializedSlugRef.current = slug;
    ensurePublicAudioInteractionTracking();
    setSoundEnabled(readPublicPanelSoundEnabled(slug));
    previousLatestRef.current = latestCalled?.order_id ?? null;
  }, [latestCalled?.order_id, slug]);

  useEffect(() => {
    const previousOrderId = previousLatestRef.current;
    const currentOrderId = latestCalled?.order_id ?? null;

    if (currentOrderId === previousOrderId) {
      return;
    }

    previousLatestRef.current = currentOrderId;

    if (currentOrderId && soundEnabled) {
      void playPublicPanelCallSound();
    }
  }, [latestCalled?.order_id, soundEnabled]);

  if (mode === "tv") {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),rgba(0,0,0,0.95)_58%)]" />

        <header className="relative z-10 flex items-start justify-between gap-4 px-6 py-4 sm:px-10 sm:py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">Painel de retirada</p>
            <p className="mt-1 text-sm font-medium text-zinc-200">{storeName ?? slug}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/${slug}/painel`}
              className="rounded-md border border-zinc-700/80 bg-zinc-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition hover:bg-zinc-800"
            >
              Versão web
            </Link>
            <PublicPanelRealtimeSync slug={slug} className="max-w-[18rem] text-[11px] text-zinc-400" />
          </div>
        </header>

        <main className="relative z-10 flex min-h-[calc(100vh-11rem)] flex-col items-center justify-center px-6 pb-24 text-center sm:px-10">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
            {latestCalled ? "Chamado agora" : "Aguardando próximo chamado"}
          </p>

          <p
            className={`mt-4 font-black leading-none tracking-tight ${
              latestCalled ? "text-[clamp(7rem,28vw,18rem)] text-emerald-300" : "text-[clamp(5rem,20vw,12rem)] text-zinc-500"
            }`}
          >
            {latestDisplayCode}
          </p>

          <p className="mt-6 text-lg text-zinc-300 sm:text-xl">
            {latestCalled ? `Atualizado ${formatDateTime(latestCalled.ready_at)}` : "Nenhum pedido pronto no momento."}
          </p>
        </main>

        <footer className="absolute inset-x-0 bottom-0 z-10 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-4 sm:px-10">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Últimos chamados</p>

              {calledHistory.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {calledHistory.map((item) => (
                    <li key={item.render_key} className="rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3 py-1.5 text-sm">
                      <span className="font-semibold text-zinc-100">{item.display_code ?? "----"}</span>
                      <span className="ml-2 text-xs text-zinc-400">{formatDateTime(item.ready_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Sem histórico recente de chamados.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                writePublicPanelSoundEnabled(slug, next);
                if (next) {
                  ensurePublicAudioInteractionTracking();
                }
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:bg-zinc-800"
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? "Som: ligado" : "Som: desligado"}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6">
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/65 px-3 py-1.5 text-zinc-300 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PublicPanelRealtimeSync slug={slug} className="truncate text-[11px] text-zinc-400" />
          </div>

          <div className="flex items-center gap-1.5">
            {tvModeHref ? (
              <Link
                href={tvModeHref}
                className="rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Abrir modo TV
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                writePublicPanelSoundEnabled(slug, next);
                if (next) {
                  ensurePublicAudioInteractionTracking();
                }
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-zinc-800"
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? "Som: ligado" : "Som: desligado"}
            </button>
          </div>
        </div>
      </section>

      <article
        className={`rounded-[30px] border p-8 text-center shadow-[0_30px_56px_-34px_rgba(0,0,0,0.86)] sm:p-10 ${
          latestCalled
            ? "border-emerald-300/50 bg-gradient-to-b from-zinc-900 via-zinc-900 to-black text-white"
            : "border-zinc-700/80 bg-zinc-900/85 text-zinc-200"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">Painel de retirada</p>
        <p className="mt-2 text-sm font-medium text-zinc-300">
          {latestCalled ? "Pedido chamado agora" : "Aguardando próximo chamado"}
        </p>

        <p className={`mt-5 font-black tracking-tight ${latestCalled ? "text-7xl sm:text-8xl text-emerald-300" : "text-6xl text-zinc-500"}`}>
          {latestDisplayCode}
        </p>

        <p className="mt-5 text-sm text-zinc-400">
          {latestCalled ? `Atualizado ${formatDateTime(latestCalled.ready_at)}` : "Nenhum pedido pronto no momento."}
        </p>
      </article>

      <section className="rounded-2xl border border-zinc-700/75 bg-zinc-900/70 p-4 text-zinc-100">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Últimos chamados</p>
          <span className="text-[11px] text-zinc-500">{calledHistory.length} de {HISTORY_LIMIT}</span>
        </div>

        {calledHistory.length > 0 ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {calledHistory.map((item, index) => (
              <li key={item.render_key} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1.5 text-[11px] font-semibold text-zinc-300">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-zinc-100">{item.display_code ?? "----"}</span>
                </div>
                <span className="text-xs text-zinc-400">{formatDateTime(item.ready_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
            Sem histórico recente de chamados.
          </p>
        )}
      </section>
    </div>
  );
}
