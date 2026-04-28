"use client";

import {
  FlashMessageCenter,
  type FlashMessage,
  type FlashMessageAction,
  type FlashMessageTone,
} from "@/components/shared/flash-message-center";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastPhase = "visible" | "leaving";

type ToastItem = FlashMessage & {
  durationMs: number;
  phase: ToastPhase;
  fingerprint: string;
};

type EnqueueToastInput = {
  id?: string;
  tone: FlashMessageTone;
  text: string;
  title?: string;
  durationMs?: number;
  action?: FlashMessageAction;
  emphasis?: FlashMessage["emphasis"];
};

type ToastContextValue = {
  enqueueToast: (toast: EnqueueToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

const MAX_VISIBLE_TOASTS = 3;
const EXIT_ANIMATION_MS = 180;
const MIN_TOAST_DURATION_MS = 1200;
const TOAST_DEDUP_WINDOW_MS = 2200;
const RECENT_FINGERPRINT_TTL_MS = 60000;

const DEFAULT_DURATION_MS: Record<FlashMessageTone, number> = {
  success: 5000,
  info: 6000,
  warning: 9000,
  error: 12000,
};

const ToastContext = createContext<ToastContextValue | null>(null);

function clampDuration(tone: FlashMessageTone, durationMs?: number) {
  return Math.max(MIN_TOAST_DURATION_MS, durationMs ?? DEFAULT_DURATION_MS[tone]);
}

function createToastId() {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFingerprintPart(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function buildToastFingerprint(toast: EnqueueToastInput) {
  return [
    normalizeFingerprintPart(toast.tone),
    normalizeFingerprintPart(toast.title),
    normalizeFingerprintPart(toast.text),
    normalizeFingerprintPart(toast.emphasis),
    normalizeFingerprintPart(toast.action?.label),
    normalizeFingerprintPart(toast.action?.href),
  ].join("|");
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissTimerByIdRef = useRef(new Map<string, number>());
  const removalTimerByIdRef = useRef(new Map<string, number>());
  const remainingMsByIdRef = useRef(new Map<string, number>());
  const startedAtByIdRef = useRef(new Map<string, number>());
  const pausedIdsRef = useRef(new Set<string>());
  const recentFingerprintAtRef = useRef(new Map<string, number>());
  const previousPathnameRef = useRef(pathname);

  const clearDismissTimer = useCallback((id: string) => {
    const timerId = dismissTimerByIdRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      dismissTimerByIdRef.current.delete(id);
    }
  }, []);

  const clearRemovalTimer = useCallback((id: string) => {
    const timerId = removalTimerByIdRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      removalTimerByIdRef.current.delete(id);
    }
  }, []);

  const removeToastNow = useCallback(
    (id: string) => {
      clearDismissTimer(id);
      clearRemovalTimer(id);
      remainingMsByIdRef.current.delete(id);
      startedAtByIdRef.current.delete(id);
      pausedIdsRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearDismissTimer, clearRemovalTimer]
  );

  const dismissToast = useCallback(
    (id: string) => {
      clearDismissTimer(id);

      setToasts((current) => {
        let changed = false;
        const next = current.map((toast) => {
          if (toast.id !== id || toast.phase === "leaving") {
            return toast;
          }

          changed = true;
          return { ...toast, phase: "leaving" as const };
        });

        return changed ? next : current;
      });

      clearRemovalTimer(id);
      const timerId = window.setTimeout(() => {
        removeToastNow(id);
      }, EXIT_ANIMATION_MS);
      removalTimerByIdRef.current.set(id, timerId);
    },
    [clearDismissTimer, clearRemovalTimer, removeToastNow]
  );

  const enqueueToast = useCallback((toastInput: EnqueueToastInput) => {
    const id = toastInput.id ?? createToastId();
    const durationMs = clampDuration(toastInput.tone, toastInput.durationMs);
    const fingerprint = buildToastFingerprint(toastInput);
    const now = Date.now();
    let resolvedId = id;

    for (const [fingerprintKey, timestamp] of recentFingerprintAtRef.current.entries()) {
      if (now - timestamp > RECENT_FINGERPRINT_TTL_MS) {
        recentFingerprintAtRef.current.delete(fingerprintKey);
      }
    }

    setToasts((current) => {
      const activeDuplicate = current.find(
        (toast) => toast.fingerprint === fingerprint && toast.phase !== "leaving"
      );

      if (activeDuplicate) {
        resolvedId = activeDuplicate.id;
        remainingMsByIdRef.current.set(activeDuplicate.id, durationMs);
        startedAtByIdRef.current.set(activeDuplicate.id, now);
        pausedIdsRef.current.delete(activeDuplicate.id);
        clearDismissTimer(activeDuplicate.id);
        recentFingerprintAtRef.current.set(fingerprint, now);
        return current;
      }

      const lastAt = recentFingerprintAtRef.current.get(fingerprint) ?? 0;
      if (now - lastAt < TOAST_DEDUP_WINDOW_MS) {
        return current;
      }

      remainingMsByIdRef.current.set(id, durationMs);
      pausedIdsRef.current.delete(id);
      recentFingerprintAtRef.current.set(fingerprint, now);

      const next = current.filter((toast) => toast.id !== id);
      next.push({
        id,
        tone: toastInput.tone,
        title: toastInput.title,
        text: toastInput.text,
        action: toastInput.action,
        emphasis: toastInput.emphasis,
        durationMs,
        phase: "visible",
        fingerprint,
      });
      return next;
    });

    return resolvedId;
  }, [clearDismissTimer]);

  const pauseToast = useCallback(
    (id: string) => {
      if (pausedIdsRef.current.has(id)) {
        return;
      }

      pausedIdsRef.current.add(id);

      const startedAt = startedAtByIdRef.current.get(id);
      const currentRemaining = remainingMsByIdRef.current.get(id);
      if (startedAt !== undefined && currentRemaining !== undefined) {
        const elapsed = Date.now() - startedAt;
        const nextRemaining = Math.max(500, currentRemaining - elapsed);
        remainingMsByIdRef.current.set(id, nextRemaining);
      }

      clearDismissTimer(id);
    },
    [clearDismissTimer]
  );

  const resumeToast = useCallback((id: string) => {
    pausedIdsRef.current.delete(id);
  }, []);

  const clearToasts = useCallback(() => {
    for (const timerId of dismissTimerByIdRef.current.values()) {
      window.clearTimeout(timerId);
    }
    for (const timerId of removalTimerByIdRef.current.values()) {
      window.clearTimeout(timerId);
    }

    dismissTimerByIdRef.current.clear();
    removalTimerByIdRef.current.clear();
    remainingMsByIdRef.current.clear();
    startedAtByIdRef.current.clear();
    pausedIdsRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      clearToasts();
    }
  }, [clearToasts, pathname]);

  useEffect(() => {
    const visibleToasts = toasts.slice(0, MAX_VISIBLE_TOASTS);
    const visibleIds = new Set(visibleToasts.map((toast) => toast.id));

    for (const id of dismissTimerByIdRef.current.keys()) {
      if (!visibleIds.has(id)) {
        clearDismissTimer(id);
      }
    }

    for (const toast of visibleToasts) {
      if (toast.phase === "leaving") {
        clearDismissTimer(toast.id);
        continue;
      }

      if (pausedIdsRef.current.has(toast.id)) {
        clearDismissTimer(toast.id);
        continue;
      }

      if (dismissTimerByIdRef.current.has(toast.id)) {
        continue;
      }

      const remaining = remainingMsByIdRef.current.get(toast.id) ?? toast.durationMs;
      remainingMsByIdRef.current.set(toast.id, remaining);
      startedAtByIdRef.current.set(toast.id, Date.now());

      const timerId = window.setTimeout(() => {
        dismissToast(toast.id);
      }, remaining);

      dismissTimerByIdRef.current.set(toast.id, timerId);
    }
  }, [clearDismissTimer, dismissToast, toasts]);

  useEffect(() => {
    const dismissTimers = dismissTimerByIdRef.current;
    const removalTimers = removalTimerByIdRef.current;

    return () => {
      for (const timerId of dismissTimers.values()) {
        window.clearTimeout(timerId);
      }
      for (const timerId of removalTimers.values()) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      enqueueToast,
      dismissToast,
      clearToasts,
    }),
    [clearToasts, dismissToast, enqueueToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <FlashMessageCenter
        messages={toasts.slice(0, MAX_VISIBLE_TOASTS)}
        onDismiss={dismissToast}
        onPause={pauseToast}
        onResume={resumeToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
