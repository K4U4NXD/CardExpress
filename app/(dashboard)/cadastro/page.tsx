import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default function CadastroPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="Cadastro"
        description="Crie sua conta e escolha o endereço público da sua loja."
        backHref="/"
        backLabel="Ir à página inicial"
        compact
      />
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="w-full">
          <div className="mb-5 flex justify-center">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={236}
              height={58}
              priority
              className="h-auto w-auto max-w-[236px]"
            />
          </div>

          <SignupForm />
          <p className="mt-6 text-center text-sm text-zinc-600">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
