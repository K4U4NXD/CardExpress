"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import { BRANDING } from "@/lib/branding";

type LandingSectionItem = {
  id: string;
  label: string;
};

type LandingStickyNavProps = {
  sections: readonly LandingSectionItem[];
};

function normalizeMostVisibleSection(sectionIds: string[], ratios: Record<string, number>) {
  let bestId = sectionIds[0] ?? "";
  let bestRatio = -1;

  sectionIds.forEach((id) => {
    const ratio = ratios[id] ?? 0;

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestId = id;
    }
  });

  if (bestRatio > 0) {
    return bestId;
  }

  const viewportAnchor = window.scrollY + window.innerHeight * 0.34;
  let fallbackId = sectionIds[0] ?? "";

  sectionIds.forEach((id) => {
    const sectionElement = document.getElementById(id);

    if (sectionElement && sectionElement.offsetTop <= viewportAnchor) {
      fallbackId = id;
    }
  });

  return fallbackId;
}

export function LandingStickyNav({ sections }: LandingStickyNavProps) {
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const [showTopAction, setShowTopAction] = useState(false);
  const ratioBySectionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const observedSections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (observedSections.length === 0) {
      return;
    }

    sectionIds.forEach((id) => {
      ratioBySectionRef.current[id] = 0;
    });

    const updateActiveSection = () => {
      const mostVisibleId = normalizeMostVisibleSection(sectionIds, ratioBySectionRef.current);
      const lastSectionId = sectionIds[sectionIds.length - 1] ?? "";
      const previousSectionId = sectionIds[sectionIds.length - 2] ?? "";
      const isNearPageBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 24;

      const lastSectionElement = lastSectionId ? document.getElementById(lastSectionId) : null;
      const lastSectionRatio = lastSectionId ? (ratioBySectionRef.current[lastSectionId] ?? 0) : 0;
      const previousSectionRatio = previousSectionId ? (ratioBySectionRef.current[previousSectionId] ?? 0) : 0;
      const viewportAnchor = window.scrollY + window.innerHeight * 0.56;
      const hasReachedLastSection =
        Boolean(lastSectionElement) && viewportAnchor >= (lastSectionElement?.offsetTop ?? Number.MAX_SAFE_INTEGER);
      const lastSectionClearlyDominant =
        lastSectionRatio >= 0.38 && lastSectionRatio >= previousSectionRatio + 0.08;
      const shouldForceLastSection =
        Boolean(lastSectionId) &&
        (isNearPageBottom || (hasReachedLastSection && lastSectionClearlyDominant));

      const nextActiveId =
        shouldForceLastSection && lastSectionId
          ? lastSectionId
          : mostVisibleId;

      setActiveId((currentId) => (currentId === nextActiveId ? currentId : nextActiveId));
      setShowTopAction(window.scrollY > 420 && nextActiveId !== (sectionIds[0] ?? ""));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratioBySectionRef.current[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });

        updateActiveSection();
      },
      {
        threshold: [0.03, 0.12, 0.24, 0.4, 0.6],
        rootMargin: "-18% 0px -42% 0px",
      }
    );

    observedSections.forEach((element) => {
      observer.observe(element);
    });

    const handleScroll = () => {
      updateActiveSection();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateActiveSection();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [sectionIds]);

  function handleBackToTop() {
    const firstSection = sectionIds[0];
    const firstSectionElement = firstSection ? document.getElementById(firstSection) : null;

    if (firstSectionElement) {
      firstSectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeClass = "border-zinc-900 bg-zinc-900 text-white";
  const idleClass = "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50";

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
          <div className="rounded-2xl border border-zinc-200/85 bg-white/86 p-2 shadow-xl shadow-zinc-900/8 backdrop-blur-xl">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <a
                href="#inicio"
                className="inline-flex items-center rounded-xl px-3 py-2 transition duration-300 hover:bg-zinc-100"
              >
                <Image
                  src={BRANDING.logoPath}
                  alt={BRANDING.productName}
                  width={196}
                  height={48}
                  priority
                  className="h-auto w-auto max-w-[196px]"
                />
              </a>

              <div className="flex items-center justify-center gap-2" role="navigation" aria-label="Navegação da landing">
                {sections.map((section) => {
                  const isActive = activeId === section.id;

                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-xl border px-3 py-2 text-sm font-medium transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${
                        isActive ? activeClass : idleClass
                      }`}
                    >
                      {section.label}
                    </a>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleBackToTop}
                  className={`inline-flex min-h-10 items-center rounded-xl border px-3 py-2 text-sm font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${
                    showTopAction
                      ? "border-zinc-300 bg-zinc-900 text-white hover:bg-zinc-800"
                      : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-700"
                  }`}
                  aria-label="Voltar ao topo"
                >
                  Topo
                </button>
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition duration-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="inline-flex min-h-10 items-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 top-0 z-50 px-3 pt-2 md:hidden">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/92 p-2 shadow-xl shadow-zinc-900/12 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <a
              href="#inicio"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold tracking-tight text-zinc-900 transition hover:bg-zinc-100"
            >
              <Image
                src={BRANDING.iconPath}
                alt={BRANDING.productName}
                width={20}
                height={20}
                className="h-5 w-5 rounded"
                priority
              />
              <span>{BRANDING.shortName}</span>
            </a>
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="inline-flex min-h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition duration-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex min-h-9 items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition duration-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60"
              >
                Criar conta
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="navigation" aria-label="Navegação da landing">
            {sections.map((section) => {
              const isActive = activeId === section.id;

              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex min-h-9 shrink-0 items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${
                    isActive ? activeClass : idleClass
                  }`}
                >
                  {section.label}
                </a>
              );
            })}

            <button
              type="button"
              onClick={handleBackToTop}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${
                showTopAction
                  ? "border-zinc-300 bg-zinc-900 text-white hover:bg-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-700"
              }`}
              aria-label="Voltar ao topo"
            >
              Topo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
