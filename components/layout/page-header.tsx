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
    "border-b border-[#eadfd2] bg-[#fffaf2]/95 shadow-[0_12px_28px_-26px_rgba(24,24,27,0.55)] backdrop-blur-sm",
    sticky ? `sticky z-20 ${stickyTopClassName}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className={`mx-auto ${maxWidthClassName} px-4 sm:px-6 ${compact ? "py-2.5 sm:py-3.5" : "py-4 sm:py-6"}`}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {backHref ? (
              <Link
                href={backHref}
                className={`inline-flex items-center gap-1 rounded-lg px-1.5 text-zinc-500 transition hover:bg-[#fff7ed] hover:text-[#70102a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${compact ? "mb-1.5 text-xs" : "mb-2.5 text-sm"}`}
              >
                <span aria-hidden>←</span>
                <span>{backLabel}</span>
              </Link>
            ) : null}
            <h1 className={`${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"} min-w-0 break-words font-semibold tracking-tight text-zinc-900 [overflow-wrap:anywhere]`}>{title}</h1>
            {description ? (
              <p className={`mt-1 ${compact ? "text-xs" : "text-sm"} break-words text-zinc-600 [overflow-wrap:anywhere]`}>{description}</p>
            ) : null}
          </div>

          {actions ? (
            <div className={`flex flex-wrap items-center gap-2 sm:w-auto sm:justify-end ${compact ? "w-auto" : "w-full"}`}>
              {actions}
            </div>
          ) : null}
        </div>

        {bottomContent ? <div className={compact ? "mt-2" : "mt-3"}>{bottomContent}</div> : null}
      </div>
    </header>
  );
}
