import { PageHeader } from "@/components/layout/page-header";

export default function DashboardOrdersLoading() {
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
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">Carregando fila de pedidos e atualizando status...</p>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-7 w-24 animate-pulse rounded-full bg-zinc-200" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-200" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="border-b border-zinc-100 pb-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
