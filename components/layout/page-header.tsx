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
    "border-b border-zinc-200 bg-white",
    sticky ? `sticky z-20 ${stickyTopClassName} backdrop-blur supports-[backdrop-filter]:bg-white/95` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className={`mx-auto ${maxWidthClassName} px-4 sm:px-6 ${compact ? "py-3" : "py-6"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {backHref ? (
              <Link
                href={backHref}
                className={`inline-block text-zinc-500 hover:text-zinc-800 ${compact ? "mb-2 text-xs" : "mb-3 text-sm"}`}
              >
                ← {backLabel}
              </Link>
            ) : null}
            <h1 className={`${compact ? "text-lg" : "text-xl"} font-semibold text-zinc-900`}>{title}</h1>
            {description && !compact ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {bottomContent ? <div className="mt-3">{bottomContent}</div> : null}
      </div>
    </header>
  );
}
