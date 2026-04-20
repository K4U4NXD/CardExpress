import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";
import "./globals.css";

/** Metadados padrão da raiz; rotas filhas podem sobrescrever com generateMetadata. */
export const metadata: Metadata = {
  title: {
    default: BRANDING.productName,
    template: `%s | ${BRANDING.shortName}`,
  },
  description: "Cardápio digital para pedidos com retirada no balcão.",
  icons: {
    icon: [{ url: BRANDING.iconPath, type: "image/png" }],
    shortcut: [{ url: BRANDING.iconPath, type: "image/png" }],
    apple: [{ url: BRANDING.iconPath, type: "image/png" }],
  },
};

/** Layout raiz: fontes e shell mínimo compartilhado por toda a aplicação. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
