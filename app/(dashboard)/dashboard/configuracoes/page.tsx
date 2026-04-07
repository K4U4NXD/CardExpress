import { PageHeader } from "@/components/layout/page-header";
import { StoreSettingsForm } from "@/components/dashboard/store-settings-form";
import { getUserStore } from "@/lib/auth/store";
import { formatPostgrestError } from "@/lib/db-errors";
import { buildAbsolutePublicStoreUrl, buildPublicStorePath } from "@/lib/public-store-url";
import { calculateStoreReadiness, type StoreReadinessResult } from "@/lib/store-readiness";
import { headers } from "next/headers";
import Link from "next/link";

const FALLBACK_READINESS: StoreReadinessResult = {
  isReady: false,
  pendingItems: ["Não foi possível calcular a prontidão da loja agora. Tente novamente."],
  activeCategories: 0,
  activeAvailableProducts: 0,
};

/** Dados do estabelecimento (1 conta = 1 estabelecimento nesta fase). */
export default async function DashboardSettingsPage() {
  const { supabase, store } = await getUserStore();
  const requestHeaders = await headers();

  let errorMessage: string | null = null;
  let acceptsOrders = true;
  let publicMessage = "";
  let readiness = FALLBACK_READINESS;

  if (store) {
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("accepts_orders, public_message")
      .eq("store_id", store.id)
      .maybeSingle();

    if (settingsError) {
      errorMessage = formatPostgrestError(settingsError);
    } else {
      acceptsOrders = settings?.accepts_orders ?? true;
      publicMessage = settings?.public_message ?? "";
    }

    try {
      readiness = await calculateStoreReadiness(supabase, {
        storeId: store.id,
        storeName: store.name,
        storePhone: store.phone,
        storeSlug: store.slug,
      });
    } catch (error) {
      if (!errorMessage) {
        errorMessage = formatPostgrestError(error as { message?: string; code?: string; details?: string });
      }
    }
  }

  const publicStorePath = store ? buildPublicStorePath(store.slug) : null;
  const publicStoreUrl = publicStorePath ? buildAbsolutePublicStoreUrl(publicStorePath, requestHeaders) : null;

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados básicos da loja e operação de pedidos."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
        actions={
          publicStoreUrl ? (
            <Link
              href={publicStoreUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 sm:inline-flex"
            >
              Ver cardápio público
            </Link>
          ) : null
        }
        bottomContent={
          publicStoreUrl ? (
            <div className="flex sm:hidden">
              <Link
                href={publicStoreUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 sm:w-auto"
              >
                Ver cardápio público
              </Link>
            </div>
          ) : null
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {errorMessage ? (
          <p
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {!store ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de editar configurações.
          </div>
        ) : (
          <StoreSettingsForm
            initialValues={{
              name: store.name,
              phone: store.phone ?? "",
              slug: store.slug,
              public_path: publicStorePath ?? buildPublicStorePath(store.slug),
              public_url: publicStoreUrl ?? buildPublicStorePath(store.slug),
              accepts_orders: readiness.isReady ? acceptsOrders : false,
              public_message: publicMessage,
            }}
            initialReadiness={readiness}
            forcedAcceptsOrdersOff={!readiness.isReady && acceptsOrders}
          />
        )}
      </div>
    </>
  );
}
