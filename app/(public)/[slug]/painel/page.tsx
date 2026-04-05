import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/orders/presenter";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type LatestReadyOrder = {
  order_id: string;
  display_code: string | null;
  ready_at: string | null;
};

export default async function PublicReadyPanelPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createServerSupabaseClient();

  const [storeResult, readyResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .rpc("get_latest_ready_order_for_store", { p_slug: resolvedParams.slug })
      .maybeSingle(),
  ]);

  const store = storeResult.data;
  if (!store) {
    notFound();
  }

  const order = readyResult.error ? null : (readyResult.data as LatestReadyOrder | null);

  return (
    <>
      <PageHeader
        title={`Painel de retirada — ${store.name}`}
        description="Exibicao do ultimo pedido liberado para retirada."
        backHref={`/${store.slug}`}
        backLabel="Voltar ao cardápio"
      />
      <div className="bg-zinc-950 py-10">
        <div className="mx-auto max-w-3xl px-6">
          {!order ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 text-center text-sm text-zinc-400">
              <p className="text-sm font-medium text-zinc-200">Nenhum pedido pronto no momento.</p>
              <p className="mt-1 text-xs text-zinc-400">Atualize esta tela para acompanhar novos chamados.</p>
            </div>
          ) : (
            <div className="rounded-[32px] border border-emerald-400/40 bg-gradient-to-b from-zinc-900 to-black p-10 text-center text-white shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              <p className="text-sm font-semibold uppercase tracking-[0.6em] text-emerald-300">SENHA</p>
              <p className="mt-4 text-7xl font-black text-white">{order.display_code ?? "----"}</p>
              <p className="mt-6 text-sm text-zinc-400">
                Atualizado {formatDateTime(order.ready_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
