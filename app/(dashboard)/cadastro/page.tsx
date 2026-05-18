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

const signupSteps = [
  ["Crie sua conta", "Dados de acesso e identificação da loja.", "user"],
  ["Publique o link", "Endereço público pronto para QR Code.", "link"],
  ["Organize o cardápio", "Produtos, categorias e estoque no painel.", "menu"],
  ["Acompanhe pedidos", "Fila, preparo e retirada em uma rotina clara.", "order"],
] as const;

const readyStoreStats = [
  ["8", "produtos"],
  ["3", "categorias"],
  ["Demo", "checkout"],
] as const;

const readyStoreResources = ["Painel de retirada", "Venda liberada", "Status público"] as const;

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
        maxWidthClassName="max-w-6xl"
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-5 sm:px-6 sm:py-7 lg:min-h-[calc(100dvh-4.5rem)] lg:py-8">
        <section className="grid w-full gap-5 overflow-hidden rounded-3xl border border-[#eadfd2] bg-white/65 shadow-[0_28px_80px_-56px_rgba(24,24,27,0.75)] backdrop-blur lg:grid-cols-[0.86fr_1.14fr] lg:gap-0">
        <aside className="hidden min-h-[36rem] bg-[#171717] p-7 text-white lg:flex lg:flex-col lg:gap-5">
          <div>
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={236}
              height={58}
              priority
              className="h-auto w-auto max-w-[236px] rounded-xl bg-white px-3 py-2"
            />
            <p className="mt-5 text-2xl font-semibold leading-tight">Comece com uma loja organizada desde o primeiro pedido.</p>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Crie sua conta, configure sua loja e publique um cardápio pronto para receber pedidos em poucos passos.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-white/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Como sua loja fica pronta</p>
            <div className="mt-4 space-y-3">
              {signupSteps.map(([title, description, icon], index) => (
                <div key={title} className="flex gap-3">
                  <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                    <SignupStepIcon name={icon} />
                    {index < signupSteps.length - 1 ? (
                      <span className="absolute left-1/2 top-[calc(100%+0.25rem)] h-3 w-px -translate-x-1/2 bg-amber-300/20" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-white">{title}</strong>
                    <span className="mt-0.5 block text-xs leading-5 text-zinc-300">{description}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-[#fffaf2] p-4 text-zinc-900 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9f1239]">Loja pronta</p>
                <p className="mt-1 break-words text-base font-semibold">Sabor no Ponto</p>
                <p className="mt-1 text-xs text-zinc-500">cardexpress.app/sabor-no-ponto</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                Aceitando pedidos
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {readyStoreStats.map(([value, label]) => (
                <div key={label} className="rounded-xl border border-[#eadfd2] bg-white p-2 text-center">
                  <p className="text-sm font-black text-[#9f1239]">{value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2">
              {readyStoreResources.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-[#eadfd2] bg-white px-3 py-2 text-xs">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#c58a1a]">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden>
                      <path d="m3.5 8 3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="font-semibold text-zinc-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="mb-4 flex justify-center lg:hidden">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={236}
              height={58}
              priority
              className="h-auto w-auto max-w-[178px] rounded-xl bg-white/92 px-3 py-2 shadow-[0_18px_38px_-30px_rgba(24,24,27,0.55)] sm:max-w-[210px]"
            />
          </div>

          <SignupForm />
          <p className="mt-6 text-center text-sm text-zinc-600">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-[#9f1239] underline underline-offset-2">
              Entrar
            </Link>
          </p>
        </div>
        </section>
      </main>
    </div>
  );
}

function SignupStepIcon({ name }: { name: (typeof signupSteps)[number][2] }) {
  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        <path d="M5 21a7 7 0 0 1 14 0" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M9.5 14.5 14.5 9.5" strokeLinecap="round" />
        <path d="M10.8 7.2 12 6a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.2 16.8 12 18a4 4 0 0 1-5.7-5.7l1.2-1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
        <path d="M5 5h14M5 12h14M5 19h10" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
      <path d="M5 7h14v12H5z" />
      <path d="M8 4h8v3H8zM9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}
