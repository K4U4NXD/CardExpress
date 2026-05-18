"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LandingSectionItem = {
  id: string;
  label: string;
  href?: string;
};

type LandingStickyNavProps = {
  sections: readonly LandingSectionItem[];
  isAuthenticated?: boolean;
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

function CardExpressWordmark() {
  return (
    <span
      className="group/wordmark inline-flex items-center whitespace-nowrap text-base font-black tracking-tight sm:text-lg"
      aria-label="CardExpress"
    >
      <span className="relative">
        <span className="text-[#9f1239] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">Card</span>
        <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-[#9f1239]/35 transition-transform duration-300 group-hover/wordmark:scale-x-100" />
      </span>
      <span className="text-[#c58a1a] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">Express</span>
      <span className="ml-1 mt-1 h-1.5 w-1.5 rounded-full bg-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.55)] transition duration-300 group-hover/wordmark:scale-125" />
    </span>
  );
}

export function LandingStickyNav({ sections }: LandingStickyNavProps) {
  const sectionIds = useMemo(() => sections.filter((section) => !section.href).map((section) => section.id), [sections]);
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ratioBySectionRef = useRef<Record<string, number>>({});
  const mobileLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

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

      const nextActiveId = shouldForceLastSection && lastSectionId ? lastSectionId : mostVisibleId;
      setActiveId((currentId) => (currentId === nextActiveId ? currentId : nextActiveId));
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

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    updateActiveSection();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [sectionIds]);

  useEffect(() => {
    if (!activeId || window.innerWidth >= 768) {
      return;
    }

    mobileLinkRefs.current[activeId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  function handleMobileSectionClick(section: LandingSectionItem) {
    setMobileMenuOpen(false);
    if (section.href) {
      return;
    }

    window.setTimeout(() => {
      mobileLinkRefs.current[section.id]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 0);
  }

  const activeClass = "border-[#9f1239] bg-[#9f1239] text-white shadow-sm shadow-rose-950/15";
  const idleClass = "border-[#eadfd2] bg-white/82 text-zinc-700 hover:border-amber-300 hover:bg-[#fffaf2]";

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
          <div className="rounded-2xl border border-[#eadfd2]/90 bg-white/92 p-1.5 shadow-md shadow-zinc-900/10 backdrop-blur-xl">
            <div className="grid grid-cols-[auto_1fr] items-center gap-4">
              <a
                href="#inicio"
                className="inline-flex min-h-10 items-center rounded-xl px-3 py-1.5 transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff7ed]"
              >
                <CardExpressWordmark />
              </a>

              <div className="flex items-center justify-end gap-1.5 xl:gap-2" role="navigation" aria-label="Navegação da landing">
                {sections.map((section) => {
                  const isActive = !section.href && activeId === section.id;

                  return (
                    <a
                      key={section.id}
                      href={section.href ?? `#${section.id}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-xl border px-2.5 py-1 text-xs font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 xl:px-3 ${
                        isActive ? activeClass : idleClass
                      }`}
                    >
                      {section.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 top-0 z-50 px-2 pt-1.5 md:hidden">
        <div className="rounded-2xl border border-[#eadfd2]/90 bg-white/94 p-1.5 shadow-md shadow-zinc-900/10 backdrop-blur-xl">
          <div className={`${mobileMenuOpen ? "mb-1.5" : ""} flex items-center justify-between gap-2 px-1`}>
            <a
              href="#inicio"
              className="inline-flex min-h-9 items-center rounded-xl px-2 py-1 transition hover:bg-[#fff7ed]"
            >
              <CardExpressWordmark />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              className="inline-flex min-h-9 items-center whitespace-nowrap rounded-xl bg-[#9f1239] px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition duration-300 hover:bg-[#70102a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
            >
              Navegação
            </button>
          </div>

          <div id="landing-mobile-menu" className={mobileMenuOpen ? "block" : "hidden"}>
            <div
              className="grid grid-cols-2 gap-2 rounded-xl border border-[#eadfd2] bg-[#fffaf2] p-2"
              role="navigation"
              aria-label="Navegação da landing"
            >
              {sections.map((section) => {
                const isActive = !section.href && activeId === section.id;

                return (
                  <a
                    key={section.id}
                    href={section.href ?? `#${section.id}`}
                    ref={(element) => {
                      mobileLinkRefs.current[section.id] = element;
                    }}
                    onClick={() => handleMobileSectionClick(section)}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${
                      isActive ? activeClass : idleClass
                    }`}
                  >
                    {section.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
