"use client";

import { useEffect, useRef, useState } from "react";

import { logoutAction } from "@/app/actions/auth";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LogoutButton({ className, compact = false }: LogoutButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmOpen) {
      return;
    }

    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmOpen]);

  const triggerClassName = className
    ? className
    : compact
      ? "rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
      : "rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200";

  return (
    <>
      <button type="button" onClick={() => setConfirmOpen(true)} className={triggerClassName}>
        Sair
      </button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
          <div className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[1px]" onClick={() => setConfirmOpen(false)} />

          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
              <h2 id="logout-dialog-title" className="text-base font-semibold text-zinc-900">
                Sair da conta?
              </h2>
              <p className="mt-2 text-sm text-zinc-600">Tem certeza de que deseja sair da sua conta agora?</p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="cx-btn-secondary px-3 py-2"
                >
                  Cancelar
                </button>

                <form action={logoutAction}>
                  <button type="submit" className="cx-btn-primary px-3 py-2">
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
