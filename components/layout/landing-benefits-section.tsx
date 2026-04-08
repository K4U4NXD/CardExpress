"use client";

import { useState } from "react";

type BenefitItem = {
  title: string;
  description: string;
};

type LandingBenefitsSectionProps = {
  merchantBenefits: readonly BenefitItem[];
  customerBenefits: readonly BenefitItem[];
  merchantTitle: string;
  customerTitle: string;
};

type TabKey = "merchant" | "customer";

export function LandingBenefitsSection({
  merchantBenefits,
  customerBenefits,
  merchantTitle,
  customerTitle,
}: LandingBenefitsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("merchant");

  const activeItems = activeTab === "merchant" ? merchantBenefits : customerBenefits;
  const activeHeading = activeTab === "merchant" ? merchantTitle : customerTitle;

  return (
    <>
      <div className="md:hidden">
        <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1"
            role="tablist"
            aria-label="Tipos de benefício"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "merchant"}
              onClick={() => setActiveTab("merchant")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition duration-300 ${
                activeTab === "merchant" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white"
              }`}
            >
              Para comerciante
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "customer"}
              onClick={() => setActiveTab("customer")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition duration-300 ${
                activeTab === "customer" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white"
              }`}
            >
              Para cliente
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="text-sm font-semibold text-zinc-900">{activeHeading}</h3>

            <div className="mt-3 grid gap-2">
              {activeItems.map((item) => (
                <article key={item.title} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-5">
        <article className="cx-lift rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Benefícios para o comerciante</p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-900 lg:text-3xl">{merchantTitle}</h3>
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {merchantBenefits.map((item, index) => (
              <article
                key={item.title}
                className={`rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 transition duration-300 hover:border-zinc-300 hover:bg-white sm:p-4 ${
                  index % 2 === 0 ? "md:translate-y-0" : "md:translate-y-1"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="cx-lift rounded-3xl border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm sm:p-6 lg:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Benefícios para o cliente</p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-100 lg:text-3xl">{customerTitle}</h3>
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {customerBenefits.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/5 p-3.5 transition duration-300 hover:border-white/20 hover:bg-white/[0.08] sm:p-4"
              >
                <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-300">{item.description}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}
