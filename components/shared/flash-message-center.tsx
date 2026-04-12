"use client";

import Link from "next/link";

export type FlashMessageTone = "success" | "error" | "warning" | "info";

export type FlashMessageAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type FlashMessage = {
  id: string;
  tone: FlashMessageTone;
  text: string;
  title?: string;
  action?: FlashMessageAction;
  emphasis?: "default" | "new-order";
  phase?: "visible" | "leaving";
};

type FlashMessageCenterProps = {
  messages: FlashMessage[];
  onDismiss: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
};

const STYLE_BY_TONE: Record<
  FlashMessageTone,
  {
    container: string;
    iconWrap: string;
    title: string;
    action: string;
    close: string;
  }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50/97 text-emerald-950 shadow-[0_24px_42px_-32px_rgba(5,150,105,0.52)]",
    iconWrap: "border-emerald-300/70 bg-emerald-100 text-emerald-700",
    title: "text-emerald-900",
    action: "border-emerald-300/70 hover:bg-emerald-100",
    close: "border-emerald-300/70 hover:bg-emerald-100",
  },
  error: {
    container: "border-red-200 bg-red-50/97 text-red-950 shadow-[0_24px_42px_-32px_rgba(220,38,38,0.5)]",
    iconWrap: "border-red-300/70 bg-red-100 text-red-700",
    title: "text-red-900",
    action: "border-red-300/70 hover:bg-red-100",
    close: "border-red-300/70 hover:bg-red-100",
  },
  warning: {
    container: "border-amber-200 bg-amber-50/97 text-amber-950 shadow-[0_24px_42px_-32px_rgba(217,119,6,0.52)]",
    iconWrap: "border-amber-300/70 bg-amber-100 text-amber-700",
    title: "text-amber-900",
    action: "border-amber-300/70 hover:bg-amber-100",
    close: "border-amber-300/70 hover:bg-amber-100",
  },
  info: {
    container: "border-sky-200 bg-sky-50/97 text-sky-950 shadow-[0_24px_42px_-32px_rgba(14,116,144,0.52)]",
    iconWrap: "border-sky-300/70 bg-sky-100 text-sky-700",
    title: "text-sky-900",
    action: "border-sky-300/70 hover:bg-sky-100",
    close: "border-sky-300/70 hover:bg-sky-100",
  },
};

function ToneIcon({ tone }: { tone: FlashMessageTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
        <path d="M4 10.5 8.2 14.5 16 6.5" />
      </svg>
    );
  }

  if (tone === "error") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
        <path d="M6 6 14 14" />
        <path d="M14 6 6 14" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4" aria-hidden>
        <path d="M10 3.5 17 16.5H3L10 3.5Z" />
        <path d="M10 7.3v4.6" />
        <circle cx="10" cy="14.2" r="0.7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <path d="M10 6.2v4.9" />
      <circle cx="10" cy="14.4" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="7.2" />
    </svg>
  );
}

export function FlashMessageCenter({ messages, onDismiss, onPause, onResume }: FlashMessageCenterProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[120] flex w-[min(28rem,calc(100vw-1.5rem))] flex-col gap-2.5 sm:right-4 sm:top-4">
      {messages.map((message) => {
        const styles = STYLE_BY_TONE[message.tone];
        const isNewOrder = message.emphasis === "new-order";
        const phaseClass =
          message.phase === "leaving"
            ? "opacity-0 translate-y-1 scale-[0.99]"
            : "opacity-100 translate-y-0 scale-100 [animation:toast-enter_180ms_ease-out]";
        const emphasisClass = isNewOrder
          ? "border-amber-300 bg-gradient-to-br from-amber-100 via-amber-50 to-white shadow-[0_30px_56px_-34px_rgba(217,119,6,0.62)]"
          : "";
        const actionClass = isNewOrder
          ? "border-amber-400 bg-amber-600 text-white hover:bg-amber-700"
          : `bg-white/80 ${styles.action}`;

        return (
          <section
            key={message.id}
            className={`pointer-events-auto rounded-2xl border px-3.5 py-3.5 backdrop-blur-sm transition-all duration-200 motion-reduce:transition-none motion-reduce:[animation:none] [@keyframes_toast-enter{0%{opacity:0;transform:translateY(-6px)_scale(.99)}100%{opacity:1;transform:translateY(0)_scale(1)}}] ${styles.container} ${emphasisClass} ${phaseClass}`}
            role={message.tone === "error" ? "alert" : "status"}
            onMouseEnter={() => onPause?.(message.id)}
            onMouseLeave={() => onResume?.(message.id)}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${styles.iconWrap}`}>
                <ToneIcon tone={message.tone} />
              </span>

              <div className="min-w-0 flex-1">
                {message.title ? (
                  <p className={`flex items-center gap-2 text-[14px] font-semibold leading-5 ${styles.title}`}>
                    {isNewOrder ? (
                      <span
                        className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 [animation:new-order-dot_900ms_ease-in-out_infinite] [@keyframes_new-order-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.22);opacity:.65}}]"
                        aria-hidden
                      />
                    ) : null}
                    {message.title}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[13px] leading-5 text-current/85">{message.text}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {message.action ? (
                    message.action.href && !message.action.onClick ? (
                      <Link
                        href={message.action.href}
                        className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${actionClass}`}
                      >
                        {message.action.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          message.action?.onClick?.();
                          onDismiss(message.id);
                        }}
                        className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${actionClass}`}
                      >
                        {message.action.label}
                      </button>
                    )
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onDismiss(message.id)}
                    className={`rounded-lg border bg-white/75 px-2.5 py-1.5 text-xs font-semibold transition ${styles.close}`}
                    aria-label="Fechar aviso"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
