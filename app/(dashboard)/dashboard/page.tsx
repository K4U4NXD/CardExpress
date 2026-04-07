import { LogoutButton } from "@/components/auth/logout-button";
import { CopyButton } from "@/components/layout/copy-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateStoreReadiness } from "@/lib/store-readiness";
import { buildAbsolutePublicStoreUrl, buildPublicStorePath } from "@/lib/public-store-url";
import { PageHeader } from "@/components/layout/page-header";
import { formatBRL } from "@/lib/validation/price";
import { headers } from "next/headers";
import Link from "next/link";
import type { OrderStatus } from "@/types";

type OrderTotalRow = {
  total_amount: number;
};

function statusLabel(acceptsOrders: boolean, isReady: boolean) {
  if (!isReady) return { text: "Com pendências", badge: "bg-amber-100 text-amber-900" };
  if (acceptsOrders) return { text: "Aceitando pedidos", badge: "bg-emerald-100 text-emerald-900" };
  return { text: "Pedidos pausados", badge: "bg-zinc-200 text-zinc-700" };
}

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();
  const requestHeaders = await headers();
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

  let acceptsOrders = true;
  let activeCategories = 0;
  let visibleProducts = 0;
  let waitingOrders = 0;
  let preparingOrders = 0;
  let readyOrders = 0;
  let finalizedTodayCount = 0;
  let soldToday = 0;
  let readiness = null as Awaited<ReturnType<typeof calculateStoreReadiness>> | null;

  if (store) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();

    const [
      settingsResult,
      readinessResult,
      activeCategoriesResult,
      waitingOrdersResult,
      preparingOrdersResult,
      readyOrdersResult,
      finalizedTodayResult,
    ] = await Promise.all([
      supabase
        .from("store_settings")
        .select("accepts_orders")
        .eq("store_id", store.id)
        .maybeSingle(),
      calculateStoreReadiness(supabase, {
        storeId: store.id,
        storeName: store.name,
        storePhone: store.phone,
        storeSlug: store.slug,
      }).catch(() => null),
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("is_active", true),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "aguardando_aceite" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "em_preparo" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "pronto_para_retirada" satisfies OrderStatus),
      supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", store.id)
        .eq("status", "finalizado" satisfies OrderStatus)
        .gte("finalized_at", startOfTodayIso),
    ]);

    acceptsOrders = settingsResult.data?.accepts_orders ?? true;
    readiness = readinessResult;
    activeCategories = activeCategoriesResult.count ?? 0;
  visibleProducts = readinessResult?.activeAvailableProducts ?? 0;
    waitingOrders = waitingOrdersResult.count ?? 0;
    preparingOrders = preparingOrdersResult.count ?? 0;
    readyOrders = readyOrdersResult.count ?? 0;

    const finalizedTodayRows = (finalizedTodayResult.data ?? []) as OrderTotalRow[];
    finalizedTodayCount = finalizedTodayRows.length;
    soldToday = finalizedTodayRows.reduce((acc, row) => acc + Number(row.total_amount ?? 0), 0);
  }

  const publicStorePath = store ? buildPublicStorePath(store.slug) : null;
  const publicStoreUrl = publicStorePath ? buildAbsolutePublicStoreUrl(publicStorePath, requestHeaders) : null;
  const operationStatus = statusLabel(acceptsOrders, readiness?.isReady ?? false);

  return (
    <>
      <PageHeader
        title="Início"
        description="Resumo operacional da loja."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
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
            <div className="space-y-4">
              <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Loja</p>
                    <p className="mt-1 text-base font-semibold text-zinc-900">{store.name}</p>
                    <p className="mt-1 text-sm text-zinc-600">Telefone: {store.phone ?? "—"}</p>
                    <p className="mt-1 text-xs text-zinc-500">Conta: {displayName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${operationStatus.badge}`}>
                      {operationStatus.text}
                    </span>
                    <LogoutButton />
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-900">Visão operacional</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Categorias ativas</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{activeCategories}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Produtos visíveis</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{visibleProducts}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aguardando aceite</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{waitingOrders}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Em preparo</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{preparingOrders}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prontos para retirada</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{readyOrders}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Finalizados hoje</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{finalizedTodayCount}</p>
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:col-span-2 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vendido hoje</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatBRL(soldToday)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Somatório de pedidos finalizados no dia.</p>
                  </article>
                </div>
              </section>

              {readiness && !readiness.isReady ? (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Pendências para operar</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {readiness.pendingItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="rounded-lg border border-zinc-200 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Atalhos rápidos</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/pedidos"
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Ir para pedidos
                  </Link>
                  <Link
                    href="/dashboard/produtos"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Ir para produtos
                  </Link>
                  <Link
                    href="/dashboard/configuracoes"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Ir para configurações
                  </Link>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-200 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Link público</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="max-w-full truncate rounded bg-zinc-100 px-2 py-1 text-sm text-zinc-700">
                    {publicStorePath}
                  </span>
                  {publicStoreUrl ? <CopyButton text={publicStoreUrl} /> : null}
                  {publicStoreUrl ? (
                    <a
                      href={publicStoreUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      Abrir cardápio público
                    </a>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
