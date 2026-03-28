import Link from "next/link";

type PageHeaderProps = {
  /** Título exibido no topo da página. */
  title: string;
  /** Texto opcional abaixo do título. */
  description?: string;
  /** Link “voltar” opcional (href). */
  backHref?: string;
  backLabel?: string;
};

/**
 * Cabeçalho simples reutilizável em páginas placeholder do MVP.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Voltar",
}: PageHeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-6">
      <div className="mx-auto max-w-4xl">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-block text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-zinc-600">{description}</p>
        ) : null}
      </div>
    </header>
  );
}
