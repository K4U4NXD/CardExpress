import { ToastProvider } from "@/components/shared/toast-provider";

/**
 * Grupo (public): cardápio e fluxo do cliente final (link / QR Code).
 * Layout enxuto; páginas filhas definem o conteúdo.
 */
export default function PublicGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="min-h-screen">{children}</div>
    </ToastProvider>
  );
}
