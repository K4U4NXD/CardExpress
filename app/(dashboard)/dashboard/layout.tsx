import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Início" },
  { href: "/dashboard/categorias", label: "Categorias" },
  { href: "/dashboard/produtos", label: "Produtos" },
  { href: "/dashboard/pedidos", label: "Pedidos" },
  { href: "/dashboard/configuracoes", label: "Configurações" },
] as const;

/** Shell do painel com navegação lateral para todas as rotas /dashboard/*. */
export default function DashboardShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <aside className="fixed inset-y-0 left-0 w-52 border-r border-zinc-200 bg-white px-3 py-6">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          CardExpress
        </p>
        <nav className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="pl-52">{children}</div>
    </div>
  );
}
