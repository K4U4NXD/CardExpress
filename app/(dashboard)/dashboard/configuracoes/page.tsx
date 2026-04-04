import { PageHeader } from "@/components/layout/page-header";
import { StoreSettingsForm } from "@/components/dashboard/store-settings-form";
import { getUserStore } from "@/lib/auth/store";
import { formatPostgrestError } from "@/lib/db-errors";
import { calculateStoreReadiness, type StoreReadinessResult } from "@/lib/store-readiness";
import { headers } from "next/headers";

function resolvePublicStoreUrl(slug: string, requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return `/${slug}`;
  }

  return `${proto}://${host}/${slug}`;
}

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

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados básicos da loja e operação de pedidos."
      />

      <div className="mx-auto max-w-4xl px-6 py-8">
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
              public_url: resolvePublicStoreUrl(store.slug, requestHeaders),
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
