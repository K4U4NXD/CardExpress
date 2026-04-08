type PageBodyProps = {
  children: React.ReactNode;
};

/** Área de conteúdo centralizada e com largura máxima consistente. */
export function PageBody({ children }: PageBodyProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="cx-panel border-dashed p-8 text-center text-sm text-zinc-500">
        {children}
      </div>
    </div>
  );
}
