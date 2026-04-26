import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { StoreSettingsForm } from "@/components/dashboard/store-settings-form";
import { getUserStore } from "@/lib/auth/store";
import { formatPostgrestError } from "@/lib/db-errors";
import { buildAbsolutePublicStoreUrl, buildPublicStorePath } from "@/lib/public-store-url";
import { calculateStoreReadiness, type StoreReadinessResult } from "@/lib/store-readiness";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Configurações",
};

const FALLBACK_READINESS: StoreReadinessResult = {
  isReady: false,
  pendingItems: ["Não foi possível calcular a prontidão da loja agora. Tente novamente."],
  activeCategories: 0,
  activeAvailableProducts: 0,
};

function normalizeTimeToInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return "";
  }

  return `${match[1]}:${match[2]}`;
}

/** Dados do estabelecimento (1 conta = 1 estabelecimento nesta fase). */
export default async function DashboardSettingsPage() {
  const { supabase, store } = await getUserStore();
  const requestHeaders = await headers();

  let errorMessage: string | null = null;
  let acceptsOrders = true;
  let publicMessage = "";
  let autoAcceptOrdersBySchedule = false;
  let openingTime = "";
  let closingTime = "";
  let readiness = FALLBACK_READINESS;

  if (store) {
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("accepts_orders, public_message, auto_accept_orders_by_schedule, opening_time, closing_time")
      .eq("store_id", store.id)
      .maybeSingle();

    if (settingsError) {
      errorMessage = formatPostgrestError(settingsError);
    } else {
      acceptsOrders = settings?.accepts_orders ?? true;
      publicMessage = settings?.public_message ?? "";
      autoAcceptOrdersBySchedule = settings?.auto_accept_orders_by_schedule ?? false;
      openingTime = normalizeTimeToInput(settings?.opening_time);
      closingTime = normalizeTimeToInput(settings?.closing_time);
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
        description="Dados básicos da loja e operação de pedidos. O slug público permanece bloqueado nesta fase."
        sticky
        compact
        stickyTopClassName="top-14 md:top-0"
        maxWidthClassName="max-w-6xl"
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {errorMessage ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {!store ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
            Nenhuma loja vinculada à sua conta. Conclua o cadastro antes de editar configurações.
          </div>
        ) : (
          <StoreSettingsForm
            storeId={store.id}
            initialValues={{
              name: store.name,
              phone: store.phone ?? "",
              logo_url: store.logo_url ?? "",
              slug: store.slug,
              public_path: publicStorePath ?? buildPublicStorePath(store.slug),
              public_url: publicStoreUrl ?? buildPublicStorePath(store.slug),
              accepts_orders: readiness.isReady ? acceptsOrders : false,
              auto_accept_orders_by_schedule: autoAcceptOrdersBySchedule,
              opening_time: openingTime,
              closing_time: closingTime,
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
