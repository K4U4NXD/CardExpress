"use client";

import { PageHeader } from "@/components/layout/page-header";

type DashboardOrdersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardOrdersError({ error, reset }: DashboardOrdersErrorProps) {
  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Fila de pedidos ativos e prontos para retirada."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
      />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-6" role="alert">
          <h2 className="text-base font-semibold text-red-900">Nao foi possivel carregar os pedidos</h2>
          <p className="mt-2 text-sm text-red-800">Tente novamente agora. Se o erro persistir, atualize a pagina e repita a operacao.</p>
          <p className="mt-2 break-all text-xs text-red-700">Detalhe: {error.message || "Erro desconhecido"}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-800 hover:bg-red-100"
          >
            Recarregar pedidos
          </button>
        </div>
      </div>
    </>
  );
}
