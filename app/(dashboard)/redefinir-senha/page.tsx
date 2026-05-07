import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageHeader } from "@/components/layout/page-header";
import { BRANDING } from "@/lib/branding";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function RedefinirSenhaPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasValidSession = Boolean(user);

  return (
    <div className="cx-auth-bg flex min-h-dvh flex-col">
      <PageHeader
        title="Redefinir senha"
        description="Defina uma nova senha para acessar o painel do estabelecimento."
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

          {hasValidSession ? (
            <>
              <ResetPasswordForm />
              <p className="mt-6 text-center text-sm text-zinc-600">
                Depois de redefinir, você fará login novamente com a nova senha.
              </p>
            </>
          ) : (
            <section className="rounded-2xl border border-zinc-200 bg-white/96 p-5 text-center shadow-[0_20px_40px_-32px_rgba(24,24,27,0.58)] sm:p-6">
              <p className="text-base font-semibold text-zinc-900">Link inválido ou expirado.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Solicite uma nova recuperação de senha para receber um link atualizado.
              </p>
              <Link href="/recuperar-senha" className="cx-btn-primary mt-5 min-h-11 w-full px-4 py-2.5">
                Solicitar nova recuperação
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
