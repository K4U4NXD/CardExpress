"use client";

import { useToast } from "@/components/shared/toast-provider";
import {
  ensurePublicAudioInteractionTracking,
  playPublicOrderStatusSound,
} from "@/lib/public/alert-sounds";
import type { OrderStatus } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";

type PublicOrderStatusAlertProps = {
  orderId: string;
  publicToken: string;
  status: OrderStatus;
};

const STORAGE_PREFIX = "cardexpress:public-order:last-status:";
const VISITED_PREFIX = "cardexpress:public-order:visited-session:";
const SOUND_PREF_KEY = "cardexpress:public-order:sound-enabled";

function getStorageKey(orderId: string, publicToken: string) {
  return `${STORAGE_PREFIX}${orderId}:${publicToken}`;
}

function getVisitedKey(orderId: string, publicToken: string) {
  return `${VISITED_PREFIX}${orderId}:${publicToken}`;
}

function resolveStatusMessage(status: OrderStatus) {
  if (status === "aguardando_aceite") {
    return "Seu pedido foi recebido e aguarda aceite da loja.";
  }

  if (status === "em_preparo") {
    return "Agora ele esta em preparo.";
  }

  if (status === "pronto_para_retirada") {
    return "Seu pedido esta pronto para retirada.";
  }

  if (status === "finalizado") {
    return "Seu pedido foi finalizado.";
  }

  if (status === "recusado") {
    return "Seu pedido foi recusado pela loja.";
  }

  return "Seu pedido foi cancelado.";
}

export function PublicOrderStatusAlert({ orderId, publicToken, status }: PublicOrderStatusAlertProps) {
  const { enqueueToast } = useToast();
  const key = useMemo(() => getStorageKey(orderId, publicToken), [orderId, publicToken]);
  const visitedKey = useMemo(() => getVisitedKey(orderId, publicToken), [orderId, publicToken]);

  const previousStatusRef = useRef<OrderStatus | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSoundActivation, setShowSoundActivation] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    ensurePublicAudioInteractionTracking();

    try {
      const storedPref = window.localStorage.getItem(SOUND_PREF_KEY);
      if (storedPref === "0") {
        setSoundEnabled(false);
      } else {
        setSoundEnabled(true);
      }
    } catch {
      setSoundEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let storedStatus: OrderStatus | null = null;
    let hasVisitedSession = false;

    try {
      const rawStatus = window.localStorage.getItem(key);
      if (rawStatus) {
        storedStatus = rawStatus as OrderStatus;
      }
      hasVisitedSession = window.sessionStorage.getItem(visitedKey) === "1";
    } catch {
      storedStatus = null;
      hasVisitedSession = false;
    }

    if (!hasVisitedSession) {
      previousStatusRef.current = status;

      try {
        window.sessionStorage.setItem(visitedKey, "1");
        window.localStorage.setItem(key, status);
      } catch {
        // Mantem baseline local mesmo sem storage disponivel.
      }

      return;
    }

    const previousStatus = storedStatus ?? previousStatusRef.current ?? status;

    previousStatusRef.current = status;

    if (previousStatus === status) {
      return;
    }

    try {
      window.localStorage.setItem(key, status);
    } catch {
      // Mantem UX mesmo sem persistencia.
    }

    enqueueToast({
      id: `public-order-status-${orderId}-${status}-${Date.now().toString(36)}`,
      tone: "info",
      title: "Seu pedido foi atualizado",
      text: resolveStatusMessage(status),
      durationMs: 7000,
    });

    if (!soundEnabled) {
      return;
    }

    void (async () => {
      const played = await playPublicOrderStatusSound();
      if (!played) {
        setShowSoundActivation(true);
      }
    })();
  }, [enqueueToast, key, orderId, soundEnabled, status, visitedKey]);

  if (!showSoundActivation) {
    return null;
  }

  return (
    <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>Som de atualizacoes indisponivel ate uma interacao nesta pagina.</p>
        <button
          type="button"
          onClick={() => {
            ensurePublicAudioInteractionTracking();
            setSoundEnabled(true);

            try {
              window.localStorage.setItem(SOUND_PREF_KEY, "1");
            } catch {
              // Nao bloqueia a ativacao em navegadores com restricao de storage.
            }

            void (async () => {
              const played = await playPublicOrderStatusSound();
              if (played) {
                setShowSoundActivation(false);
              }
            })();
          }}
          className="rounded-md border border-sky-300 bg-white px-2.5 py-1 font-semibold text-sky-800 transition hover:bg-sky-100"
        >
          Ativar som das atualizacoes
        </button>
      </div>
    </div>
  );
}
