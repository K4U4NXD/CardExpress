import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
};

const loginFeatures = [
  {
    title: "Cardápio público",
    description: "Cliente acessa por link ou QR Code.",
    icon: "link",
  },
  {
    title: "Pedidos em tempo real",
    description: "A equipe acompanha a fila sem depender de papel.",
    icon: "pulse",
  },
  {
    title: "Painel de retirada",
    description: "Pedidos prontos aparecem para o cliente no balcão.",
    icon: "screen",
  },
] as const;

type Props = {
  searchParams: Promise<{ next?: string; erro?: string; sucesso?: string }>;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, erro, sucesso } = await searchParams;
  const initialError = erro ? safeDecode(erro) : undefined;
  const initialSuccess = sucesso ? safeDecode(sucesso) : undefined;

  return (
    <div className="cx-auth-bg flex min-h-dvh flex-col">
      <PageHeader
        title="Login"
        description="Acesso ao painel do estabelecimento."
        backHref="/"
        backLabel="Ir à página inicial"
        compact
        maxWidthClassName="max-w-5xl"
      />
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-5 sm:px-6 sm:py-7 lg:min-h-[calc(100dvh-4.5rem)] lg:py-8">
        <section className="grid w-full gap-5 overflow-hidden rounded-3xl border border-[#eadfd2] bg-white/65 shadow-[0_28px_80px_-56px_rgba(24,24,27,0.75)] backdrop-blur lg:grid-cols-[0.96fr_1.04fr] lg:gap-0">
        <aside className="hidden min-h-[27rem] bg-[#171717] p-7 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={244}
              height={60}
              priority
              className="h-auto w-auto max-w-[244px] rounded-xl bg-white px-3 py-2"
            />
            <p className="mt-5 max-w-sm text-2xl font-semibold leading-tight">
              Seu cardápio digital. Seus pedidos no ritmo certo.
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Entre para acompanhar pedidos, organizar produtos e manter a operação de retirada fluindo com clareza.
            </p>
          </div>
          <div>
            <div className="grid gap-3">
              {loginFeatures.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-amber-300/20 bg-white/[0.06] p-3"
                >
                  <div className="flex gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                      <LoginFeatureIcon name={item.icon} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm font-semibold text-white">{item.title}</strong>
                      <span className="mt-1 block text-xs leading-5 text-zinc-300">{item.description}</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-zinc-300">
              Operação, pedidos e retirada em um só painel.
            </p>
          </div>
        </aside>

        <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-4 flex justify-center lg:hidden">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={228}
              height={56}
              priority
              className="h-auto w-auto max-w-[178px] rounded-xl bg-white/92 px-3 py-2 shadow-[0_18px_38px_-30px_rgba(24,24,27,0.55)] sm:max-w-[210px]"
            />
          </div>

          <LoginForm nextPath={next} initialError={initialError} initialSuccess={initialSuccess} />
          <p className="mt-6 text-center text-sm text-zinc-600">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-[#9f1239] underline underline-offset-2">
              Cadastre-se
            </Link>
          </p>
        </div>
        </section>
      </main>
    </div>
  );
}

function LoginFeatureIcon({ name }: { name: (typeof loginFeatures)[number]["icon"] }) {
  if (name === "link") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M9.5 14.5 14.5 9.5" strokeLinecap="round" />
        <path d="M10.8 7.2 12 6a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.2 16.8 12 18a4 4 0 0 1-5.7-5.7l1.2-1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "pulse") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M4 13h3l2-5 4 10 2-5h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M4 5h16v12H4z" />
      <path d="M9 21h6M12 17v4" strokeLinecap="round" />
    </svg>
  );
}
