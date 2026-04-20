import type { Metadata } from "next";
import { CompleteSignupStoreForm } from "@/components/auth/complete-signup-store-form";
import { PageHeader } from "@/components/layout/page-header";
import { extractPendingSignupData } from "@/lib/auth/onboarding";
import { BRANDING } from "@/lib/branding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Finalizar cadastro",
};

type FinalizarCadastroPageProps = {
  searchParams: Promise<{
    motivo?: string;
    slug?: string;
  }>;
};

function resolveReasonMessage(reason?: string): string {
  if (reason === "slug-indisponivel") {
    return "O slug escolhido ficou indisponível antes da confirmação. Escolha outro para concluir o cadastro da loja.";
  }

  if (reason === "dados-pendentes") {
    return "Precisamos confirmar o slug para finalizar seu cadastro. Informe um slug e continue.";
  }

  return "Falta apenas confirmar o slug da sua loja para concluir o cadastro.";
}

export default async function FinalizarCadastroPage({ searchParams }: FinalizarCadastroPageProps) {
  const { motivo, slug } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/finalizar-cadastro");
  }

  const { data: existingStore } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingStore) {
    redirect("/dashboard");
  }

  const pendingData = extractPendingSignupData(user);
  const initialSlug = (slug && slug.trim()) || pendingData?.store_slug || "";

  return (
    <>
      <PageHeader
        title="Concluir cadastro"
        description="Finalize a criação da loja para liberar o acesso completo ao dashboard."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
      />

      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-4.5">
          <div className="flex justify-center">
            <Image
              src={BRANDING.logoPath}
              alt={BRANDING.productName}
              width={190}
              height={44}
              className="h-auto w-auto max-w-[190px]"
            />
          </div>

          <section className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100/50 p-4 shadow-[0_18px_34px_-28px_rgba(180,83,9,0.58)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              <span aria-hidden>!</span>
              Cadastro pendente
            </div>
            <p className="mt-2.5 text-sm font-medium leading-relaxed text-amber-900">{resolveReasonMessage(motivo)}</p>

            {pendingData?.store_name || pendingData?.store_slug ? (
              <dl className="mt-3 grid gap-2 rounded-xl border border-amber-200/80 bg-white/70 p-3 text-xs text-amber-900">
                {pendingData?.store_name ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-amber-800">Loja</dt>
                    <dd className="mt-0.5 text-sm font-medium text-amber-900">{pendingData.store_name}</dd>
                  </div>
                ) : null}
                {pendingData?.store_slug ? (
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-amber-800">Slug original</dt>
                    <dd className="mt-0.5 font-mono text-[13px] text-amber-900">/{pendingData.store_slug}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </section>

          <CompleteSignupStoreForm initialSlug={initialSlug} />

          <p className="text-center text-xs text-zinc-500">
            Após concluir, você será redirecionado automaticamente para o dashboard.
          </p>

          <p className="text-center text-sm text-zinc-600">
            <Link href="/dashboard" className="font-medium text-zinc-900 underline underline-offset-2">
              Voltar para o dashboard
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
