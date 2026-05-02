import Link from "next/link";

type PageHeaderProps = {
  /** Título exibido no topo da página. */
  title: string;
  /** Texto opcional abaixo do título. */
  description?: string;
  /** Link “voltar” opcional (href). */
  backHref?: string;
  backLabel?: string;
  /** Mantém o cabeçalho fixo durante scroll. */
  sticky?: boolean;
  /** Versão compacta para páginas longas. */
  compact?: boolean;
  /** Classe de deslocamento quando sticky (ex.: top-14 md:top-0). */
  stickyTopClassName?: string;
  /** Área de ações ao lado do título (ex.: botões rápidos). */
  actions?: React.ReactNode;
  /** Área inferior opcional (ex.: filtros/chips). */
  bottomContent?: React.ReactNode;
  /** Largura máxima do conteúdo interno. */
  maxWidthClassName?: string;
};

/**
 * Cabeçalho simples reutilizável em páginas placeholder do MVP.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Voltar",
  sticky = false,
  compact = false,
  stickyTopClassName = "top-0",
  actions,
  bottomContent,
  maxWidthClassName = "max-w-4xl",
}: PageHeaderProps) {
  const headerClassName = [
    "border-b border-zinc-200/80 bg-white/92 shadow-[0_12px_28px_-26px_rgba(24,24,27,0.55)]",
    sticky ? `sticky z-20 ${stickyTopClassName} backdrop-blur supports-[backdrop-filter]:bg-white/88` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className={`mx-auto ${maxWidthClassName} px-4 sm:px-6 ${compact ? "py-3.5" : "py-6"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {backHref ? (
              <Link
                href={backHref}
                className={`inline-flex items-center gap-1 rounded-lg px-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/70 ${compact ? "mb-2 text-xs" : "mb-3 text-sm"}`}
              >
                <span aria-hidden>←</span>
                <span>{backLabel}</span>
              </Link>
            ) : null}
            <h1 className={`${compact ? "text-lg" : "text-xl"} font-semibold tracking-tight text-zinc-900`}>{title}</h1>
            {description ? (
              <p className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-zinc-600`}>{description}</p>
            ) : null}
          </div>

          {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
        </div>

        {bottomContent ? <div className={compact ? "mt-2.5" : "mt-3"}>{bottomContent}</div> : null}
      </div>
    </header>
  );
}
