"use client";

import { useState } from "react";

import { formatBRL } from "@/lib/validation/price";

export type DashboardIndicatorPeriodKey = "today" | "week" | "service";

export type DashboardIndicatorPeriodData = {
  key: DashboardIndicatorPeriodKey;
  label: string;
  description: string;
  emptySalesMessage: string;
  emptyTopMessage: string;
  unavailableMessage?: string;
  metrics?: {
    finalizedCount: number;
    soldAmount: number;
    averageTicket: number;
    topProducts: Array<{ name: string; quantity: number }>;
  };
};

type DashboardIndicatorsPanelProps = {
  periods: DashboardIndicatorPeriodData[];
  topProductsLimit: number;
};

export function DashboardIndicatorsPanel({ periods, topProductsLimit }: DashboardIndicatorsPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardIndicatorPeriodKey>("today");
  const currentPeriod = periods.find((period) => period.key === selectedPeriod) ?? periods[0];
  const metrics = currentPeriod?.metrics;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Indicadores</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-900">Vendas do período</h2>
        </div>
        <div className="inline-flex w-full max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:w-auto" role="tablist">
          {periods.map((period) => {
            const active = selectedPeriod === period.key;

            return (
              <button
                key={period.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedPeriod(period.key)}
                className={`flex-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:flex-none sm:px-3 ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {currentPeriod?.description ?? "Selecione um período para analisar as vendas."}
      </p>

      {currentPeriod?.unavailableMessage ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {currentPeriod.unavailableMessage}
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 xl:grid-cols-3">
            <article className="cx-kpi-card p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Pedidos finalizados</p>
              <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-zinc-900 tabular-nums sm:text-3xl">
                {metrics?.finalizedCount ?? 0}
              </p>
            </article>

            <article className="cx-kpi-card p-3 sm:p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">Total vendido</p>
              <p className="mt-2 text-xl font-semibold leading-none tracking-tight text-zinc-900 sm:text-3xl">
                {formatBRL(metrics?.soldAmount ?? 0)}
              </p>
            </article>

            <article className="cx-kpi-card p-3 sm:p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ticket médio</p>
              <p className="mt-2 text-xl font-semibold leading-none tracking-tight text-zinc-900 sm:text-3xl">
                {formatBRL(metrics?.averageTicket ?? 0)}
              </p>
            </article>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Top {topProductsLimit} produtos mais vendidos
            </h3>

            {!metrics || metrics.finalizedCount === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">{currentPeriod?.emptySalesMessage}</p>
            ) : metrics.topProducts.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">{currentPeriod?.emptyTopMessage}</p>
            ) : (
              <ul className="mt-3 space-y-1.5 sm:space-y-2">
                {metrics.topProducts.map((product, index) => (
                  <li
                    key={`${currentPeriod?.key}-${product.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 sm:rounded-xl sm:px-3 sm:py-2"
                  >
                    <p className="min-w-0 truncate text-xs font-medium text-zinc-900 sm:text-sm">{product.name}</p>
                    <span className="shrink-0 rounded-full bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                      {product.quantity} un.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
