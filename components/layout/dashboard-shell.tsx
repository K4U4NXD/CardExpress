"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardGlobalOrderAlerts } from "@/components/dashboard/dashboard-global-order-alerts";
import { DashboardQueryFlash } from "@/components/dashboard/dashboard-query-flash";
import { ToastProvider } from "@/components/shared/toast-provider";
import { BRANDING } from "@/lib/branding";

type DashboardShellProps = {
  children: React.ReactNode;
  storeId?: string | null;
  storeSlug?: string | null;
};

const navItems = [
  { href: "/dashboard", label: "Início" },
  { href: "/dashboard/categorias", label: "Categorias" },
  { href: "/dashboard/produtos", label: "Produtos" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/configuracoes", label: "Configurações" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

function renderPendingBadge(count: number, active: boolean) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
        active ? "bg-white/15 text-white" : "bg-amber-100 text-amber-900"
      }`}
      aria-label={`${count} novo(s) pedido(s) aguardando aceite`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function DashboardShell({ children, storeId, storeSlug }: DashboardShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingNewOrdersCount, setPendingNewOrdersCount] = useState(0);
  const publicLinks = storeSlug
    ? [
        { href: `/${storeSlug}`, label: "Cardápio público" },
        { href: `/${storeSlug}/painel`, label: "Painel público" },
      ]
    : [];

  useEffect(() => {
    setMenuOpen(false);
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <ToastProvider>
      <div className="cx-dashboard-bg min-h-screen">
        {storeId ? <DashboardGlobalOrderAlerts storeId={storeId} onPendingCountChange={setPendingNewOrdersCount} /> : null}
        <DashboardQueryFlash />

        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-amber-100/80 bg-white/85 px-3 py-5 shadow-[0_30px_60px_-50px_rgba(24,24,27,0.6)] backdrop-blur-xl md:flex">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-3">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={196}
              height={48}
              className="h-auto w-auto max-w-[196px]"
              priority
            />
            <p className="mt-1 text-sm font-semibold text-zinc-800">Painel do comerciante</p>
          </div>

          <nav className="mt-5 flex flex-col gap-1.5" aria-label="Navegação do dashboard">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const pending = pendingHref === item.href && !active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => setPendingHref(item.href)}
                  aria-current={active ? "page" : undefined}
                  aria-busy={pending ? "true" : undefined}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition duration-300 ${
                    active
                      ? "bg-zinc-900 text-white shadow-[0_12px_28px_-18px_rgba(24,24,27,0.9)]"
                      : pending
                        ? "bg-amber-50 text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <span>{item.label}</span>
                  {pending ? (
                    <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                  ) : item.href === "/dashboard/pedidos" ? renderPendingBadge(pendingNewOrdersCount, active) : null}
                </Link>
              );
            })}
          </nav>

          {publicLinks.length > 0 ? (
            <div className="mt-4 border-t border-zinc-200/80 pt-4">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Acesso público</p>
              <div className="flex flex-col gap-1.5">
                {publicLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition duration-300 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <span>{item.label}</span>
                    <span className="text-xs font-semibold text-zinc-500" aria-hidden>Abrir</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-auto border-t border-zinc-200/80 pt-4">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Sessão</p>
            <LogoutButton compact className="w-full rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200" />
          </div>
        </aside>

        <div className="md:pl-60">
          <header className="sticky top-0 z-30 border-b border-amber-100/80 bg-white/80 backdrop-blur-xl md:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="inline-flex min-w-0 items-center gap-2">
                <Image
                  src={BRANDING.iconPath}
                  alt={BRANDING.productName}
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] rounded"
                  priority
                />
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  CARDEXPRESS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="dashboard-mobile-nav"
                className="min-h-10 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70"
              >
                Menu
              </button>
            </div>
          </header>

          {children}
        </div>

        {menuOpen ? (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu do dashboard">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
              className="absolute inset-0 bg-zinc-900/45"
            />

            <aside
              id="dashboard-mobile-nav"
              className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white/96 px-4 py-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src={BRANDING.iconPath}
                    alt={BRANDING.productName}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Navegação</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="min-h-9 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70"
                >
                  Fechar
                </button>
              </div>

              <nav className="flex flex-col gap-1.5" aria-label="Navegação do dashboard">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const pending = pendingHref === item.href && !active;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onClick={() => setPendingHref(item.href)}
                      aria-current={active ? "page" : undefined}
                      aria-busy={pending ? "true" : undefined}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        active ? "bg-zinc-900 text-white" : pending ? "bg-amber-50 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      {pending ? (
                        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                      ) : item.href === "/dashboard/pedidos" ? renderPendingBadge(pendingNewOrdersCount, active) : null}
                    </Link>
                  );
                })}
              </nav>

              {publicLinks.length > 0 ? (
                <div className="mt-4 border-t border-zinc-200/80 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Acesso público</p>
                  <div className="flex flex-col gap-1.5">
                    {publicLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        <span>{item.label}</span>
                        <span className="text-xs font-semibold text-zinc-500" aria-hidden>Abrir</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-auto border-t border-zinc-200/80 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Sessão</p>
                <LogoutButton compact className="w-full rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200" />
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </ToastProvider>
  );
}
