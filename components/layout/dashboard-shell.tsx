"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardShellProps = {
  children: React.ReactNode;
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

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-52 border-r border-zinc-200 bg-white px-3 py-6 md:block">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">CardExpress</p>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Navegação do dashboard">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2 py-2 text-sm transition ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-52">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">CardExpress</p>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="dashboard-mobile-nav"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
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
            className="absolute inset-0 bg-zinc-900/40"
          />

          <aside
            id="dashboard-mobile-nav"
            className="relative h-full w-72 max-w-[85vw] border-r border-zinc-200 bg-white px-4 py-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Navegação</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label="Navegação do dashboard">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
