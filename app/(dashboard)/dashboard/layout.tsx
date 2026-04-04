import { DashboardShell } from "@/components/layout/dashboard-shell";

/** Shell do painel com navegação lateral para todas as rotas /dashboard/*. */
export default function DashboardShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardShell>{children}</DashboardShell>;
}
