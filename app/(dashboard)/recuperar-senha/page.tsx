import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

type Props = {
  searchParams: Promise<{ erro?: string }>;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function RecuperarSenhaPage({ searchParams }: Props) {
  const { erro } = await searchParams;
  const initialError = erro ? safeDecode(erro) : undefined;

  return (
    <div className="cx-auth-bg flex min-h-dvh flex-col">
      <PageHeader
        title="Recuperar senha"
        description="Receba um link seguro para redefinir sua senha de acesso."
        backHref="/login"
        backLabel="Voltar ao login"
        compact
      />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full">
          <div className="mb-5 flex justify-center">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={228}
              height={56}
              priority
              className="h-auto w-auto max-w-[228px]"
            />
          </div>

          {initialError ? (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {initialError}
            </p>
          ) : null}

          <PasswordRecoveryForm />

          <p className="mt-6 text-center text-sm text-zinc-600">
            Lembrou a senha?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
