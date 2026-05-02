import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { SignupForm } from "@/components/auth/signup-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default async function CadastroPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="cx-auth-bg flex min-h-dvh flex-col">
        <PageHeader
          title="Cadastro"
          description="Sua sessão já está ativa."
          backHref="/"
          backLabel="Ir à página inicial"
          compact
        />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-6 sm:px-6 sm:py-8">
          <section className="cx-panel w-full p-5 text-center sm:p-6">
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

            <p className="text-base font-semibold text-zinc-900">Você já está logado.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
              Para criar uma nova conta, saia da conta atual primeiro.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/dashboard" prefetch className="cx-btn-primary min-h-11 px-4 py-2.5">
                Acessar painel
              </Link>
              <LogoutButton
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="cx-auth-bg flex min-h-dvh flex-col">
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
