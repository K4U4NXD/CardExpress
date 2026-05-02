import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confirmar e-mail",
};

type ConfirmEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.indexOf("@");

  if (atIndex <= 1) {
    return normalized;
  }

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const visiblePrefix = local.slice(0, 2);

  return `${visiblePrefix}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export default async function CadastroConfirmarEmailPage({ searchParams }: ConfirmEmailPageProps) {
  const { email } = await searchParams;
  const maskedEmail = email ? maskEmail(email) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="Confirme seu e-mail"
        description="Ative sua conta para concluir a criação da loja no CardExpress."
        backHref="/"
        backLabel="Ir à página inicial"
        compact
      />

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-6 sm:px-6 sm:py-8">
        <section className="w-full space-y-5 rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/90 p-5 shadow-[0_28px_60px_-42px_rgba(24,24,27,0.62)] sm:p-6">
          <div className="flex justify-center">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={196}
              height={46}
              priority
              className="h-auto w-auto max-w-[196px]"
            />
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            <span aria-hidden>✉</span>
            Confirmação pendente
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Enviamos um link de confirmação para seu e-mail.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-600">
              Confirme o e-mail para ativar sua conta e concluir a criação da sua loja.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Destino do e-mail</p>
            <p className="mt-1.5 break-all rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm font-medium text-zinc-700">
              {maskedEmail ?? "Verifique sua caixa de entrada."}
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white/90 p-3.5 text-sm text-zinc-600">
            <p>Depois de confirmar, você será redirecionado automaticamente para concluir o acesso ao dashboard.</p>
            <p>Se não encontrar a mensagem, verifique também a caixa de spam.</p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_24px_-18px_rgba(24,24,27,0.9)] transition hover:bg-zinc-800"
            >
              Ir para login
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Voltar ao início
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
