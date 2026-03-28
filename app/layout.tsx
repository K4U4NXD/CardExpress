import type { Metadata } from "next";
import "./globals.css";

/** Metadados padrão da raiz; rotas filhas podem sobrescrever com generateMetadata. */
export const metadata: Metadata = {
  title: {
    default: "CardExpress",
    template: "%s · CardExpress",
  },
  description: "Cardápio digital para pedidos com retirada no balcão.",
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
