"use client";

import { CopyButton } from "@/components/layout/copy-button";
import { useEffect, useMemo, useState } from "react";

type PublicShareLinkActionsProps = {
  relativePath: string;
  microcopy: string;
  className?: string;
};

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

export function PublicShareLinkActions({ relativePath, microcopy, className }: PublicShareLinkActionsProps) {
  const [isShareAvailable, setIsShareAvailable] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const absoluteUrl = useMemo(() => buildAbsoluteUrl(relativePath), [relativePath]);

  useEffect(() => {
    setIsShareAvailable(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({
        title: "CardExpress",
        text: "Acompanhe seu pedido por este link.",
        url: absoluteUrl,
      });
      setShareFeedback("Link compartilhado.");
      setTimeout(() => setShareFeedback(null), 1800);
    } catch {
      setShareFeedback(null);
    }
  }

  return (
    <div className={className}>
      <p className="text-xs text-zinc-500">{microcopy}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <CopyButton
          text={absoluteUrl}
          label="Copiar link"
          copiedLabel="Link copiado"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        />

        {isShareAvailable ? (
          <button
            type="button"
            onClick={handleShare}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Compartilhar link
          </button>
        ) : null}
      </div>

      {shareFeedback ? <p className="mt-1 text-[11px] text-emerald-700">{shareFeedback}</p> : null}
    </div>
  );
}