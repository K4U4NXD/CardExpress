import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getUserStore } from "@/lib/auth/store";

/** Shell do painel com navegação lateral para todas as rotas /dashboard/*. */
export default async function DashboardShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { store } = await getUserStore();

  return <DashboardShell storeId={store?.id} storeSlug={store?.slug}>{children}</DashboardShell>;
}
