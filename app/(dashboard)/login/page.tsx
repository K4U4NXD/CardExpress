import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
};

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
    <div className="cx-auth-bg min-h-dvh">
      <PageHeader
        title="Login"
        description="Acesso ao painel do estabelecimento."
        backHref="/"
        backLabel="Ir à página inicial"
      />
      <div className="mx-auto grid w-full max-w-5xl flex-1 gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-2 lg:items-center">
        <aside className="cx-brand-panel hidden bg-[#171717] p-6 text-white lg:flex lg:flex-col lg:justify-between">
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
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
            {["Cardápio", "Pedidos", "Retirada"].map((item) => (
              <span key={item} className="rounded-xl border border-amber-300/20 bg-white/5 px-2 py-2.5">
                {item}
              </span>
            ))}
          </div>
        </aside>

        <div className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-4 flex justify-center lg:hidden">
          <Image
            src={BRANDING.logoPath}
            alt={BRANDING.productName}
            width={228}
            height={56}
            priority
            className="h-auto w-auto max-w-[228px] rounded-xl bg-white/92 px-4 py-3 shadow-[0_18px_38px_-30px_rgba(24,24,27,0.55)]"
          />
        </div>
        <div className="mb-4 grid grid-cols-3 gap-1.5 text-center text-[11px] font-medium text-zinc-600 lg:hidden">
          {["Cardápio", "Pedidos", "Retirada"].map((item) => (
            <span key={item} className="rounded-lg border border-[#eadfd2] bg-white/75 px-2 py-1.5">
              {item}
            </span>
          ))}
        </div>

        <LoginForm nextPath={next} initialError={initialError} initialSuccess={initialSuccess} />
        <p className="mt-6 text-center text-sm text-zinc-600">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-[#9f1239] underline underline-offset-2">
            Cadastre-se
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
