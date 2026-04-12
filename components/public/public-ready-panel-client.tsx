"use client";

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

export function PublicReadyPanelClient({ slug, latestOrder, recentCalledOrders }: PublicReadyPanelClientProps) {
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

  return (
    <div className="mx-auto max-w-3xl px-6">
      {!latestCalled ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 text-center text-sm text-zinc-400 shadow-[0_26px_44px_-30px_rgba(0,0,0,0.85)]">
          <p className="text-sm font-medium text-zinc-200">Nenhum pedido pronto no momento.</p>
          <p className="mt-1 text-xs text-zinc-400">Aguardando o proximo chamado.</p>
        </div>
      ) : (
        <div className="rounded-[32px] border border-emerald-300/50 bg-gradient-to-b from-zinc-900 to-black p-10 text-center text-white shadow-[0_0_70px_rgba(16,185,129,0.24)]">
          <p className="text-sm font-semibold uppercase tracking-[0.6em] text-emerald-300">SENHA</p>
          <p className="mt-4 text-7xl font-black text-white">{latestCalled.display_code ?? "----"}</p>
          <p className="mt-6 text-sm text-zinc-400">Atualizado {formatDateTime(latestCalled.ready_at)}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300">
        <PublicPanelRealtimeSync slug={slug} />

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
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 font-semibold text-zinc-200 transition hover:bg-zinc-700"
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? "Som do painel: ativado" : "Ativar som do painel"}
        </button>
      </div>

      {calledHistory.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-zinc-700/75 bg-zinc-900/70 p-4 text-zinc-100">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Ultimos chamados</p>
          <ul className="mt-2 space-y-2">
            {calledHistory.map((item) => (
              <li key={item.render_key} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
                <span className="font-semibold text-zinc-100">{item.display_code ?? "----"}</span>
                <span className="text-xs text-zinc-400">{formatDateTime(item.ready_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
