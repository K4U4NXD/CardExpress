import { LogoutButton } from "@/components/auth/logout-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, phone")
    .eq("owner_id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Comerciante";

  return (
    <>
      <PageHeader title="Painel" description="Resumo da sua conta e da loja." />
      <div className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            Logado como <span className="font-medium text-zinc-900">{displayName}</span>
          </p>
          <LogoutButton />
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          {!store ? (
            <div className="space-y-2 text-left">
              <p className="font-medium text-zinc-800">Nenhuma loja encontrada</p>
              <p className="text-sm text-zinc-600">
                Se você acabou de confirmar o e-mail, o cadastro pode não ter criado a loja. Em desenvolvimento,
                desative a confirmação de e-mail no Supabase para concluir o fluxo em um único passo, ou entre em
                contato para vincular a loja manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-left text-sm text-zinc-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Loja</p>
                <p className="mt-1 text-base font-medium text-zinc-900">{store.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Slug / cardápio público</p>
                <p className="mt-1 font-mono text-zinc-800">{store.slug}</p>
                <Link
                  href={`/${store.slug}`}
                  className="mt-2 inline-block text-zinc-900 underline underline-offset-2"
                >
                  Abrir cardápio público
                </Link>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Telefone da loja</p>
                <p className="mt-1">{store.phone ?? "—"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
