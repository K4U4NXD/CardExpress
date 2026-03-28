/**
 * Grupo (dashboard): rotas do comerciante (/login e /dashboard/*).
 * Layout mínimo; a sidebar fica apenas em dashboard/layout.tsx.
 */
export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
