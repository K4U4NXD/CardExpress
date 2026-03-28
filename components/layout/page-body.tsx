type PageBodyProps = {
  children: React.ReactNode;
};

/** Área de conteúdo centralizada e com largura máxima consistente. */
export function PageBody({ children }: PageBodyProps) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        {children}
      </div>
    </div>
  );
}
