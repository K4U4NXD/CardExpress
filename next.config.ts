import type { NextConfig } from "next";

/** Configuração mínima do Next.js; ajuste conforme integrações (ex.: Mercado Pago). */
const nextConfig: NextConfig = {
  images: {
    // O hero usa next/image com quality={95}; declarar a qualidade evita warning futuro do Next.
    qualities: [95],
  },
};

export default nextConfig;
