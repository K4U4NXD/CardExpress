import Link from "next/link";

/**
 * Landing inicial: ponto de entrada da marca.
 * Depois pode redirecionar usuários logados ou explicar o produto.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          CardExpress
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Cardápio digital para retirada no balcão
        </h1>
        <p className="mt-4 text-zinc-600">
          O cliente acessa por link ou QR Code; o comerciante gerencia tudo no
          painel.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/cadastro"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          Entrar
        </Link>
        <Link
          href="/demo-restaurante"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          Ver exemplo de cardápio (/demo-restaurante)
        </Link>
      </div>
    </main>
  );
}
