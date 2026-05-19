import Image from "next/image";
import Link from "next/link";

import { BRANDING } from "@/lib/branding";

const CONTACT_EMAIL = "projetocardexpress@gmail.com";

const footerLinkClass =
  "rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30";

type MarketingFooterProps = {
  isAuthenticated?: boolean;
  primaryCtaHref?: string;
  /** Na landing usa "#secao"; em páginas internas usa "/#secao" para voltar à home. */
  anchorPrefix?: "" | "/";
  demoHref?: string;
};

/** Rodapé institucional compartilhado pela landing e pela demonstração. */
export function MarketingFooter({
  isAuthenticated = false,
  primaryCtaHref = "/cadastro",
  anchorPrefix = "",
  demoHref = "/demonstracao",
}: MarketingFooterProps) {
  const panelHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <footer className="border-t border-white/10 bg-[#171717] text-zinc-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-12">
        <div className="max-w-md">
          <Image
            src={BRANDING.logoPath}
            alt={BRANDING.productName}
            width={180}
            height={44}
            className="h-auto w-auto max-w-[180px] rounded-lg bg-white px-2 py-1"
          />
          <p className="mt-2 text-sm text-zinc-400">
            Cardápio digital, checkout estruturado e painel de pedidos para retirada no balcão.
          </p>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Contato:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-amber-300/70"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <nav className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[320px]" aria-label="Links institucionais">
          <Link href={`${anchorPrefix}#produto`} className={footerLinkClass}>
            Produto
          </Link>
          <Link href={`${anchorPrefix}#como-funciona`} className={footerLinkClass}>
            Como funciona
          </Link>
          <Link href={`${anchorPrefix}#diferenciais`} className={footerLinkClass}>
            Diferenciais
          </Link>
          <Link href={demoHref} className={footerLinkClass}>
            Demonstração
          </Link>
          <Link href={panelHref} className={footerLinkClass}>
            Painel
          </Link>
          {!isAuthenticated ? (
            <Link href={primaryCtaHref} className={footerLinkClass}>
              Cadastro
            </Link>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-white/10 bg-[#171717]">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-zinc-500 sm:px-6">
          <p>© 2026 CardExpress. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
