import type { PublicMenuRpcRow } from "@/types";

type PublicStoreOperationalInput = {
  acceptsOrdersSetting: boolean;
  acceptsOrdersManual?: boolean;
  autoAcceptOrdersBySchedule?: boolean;
  openingTime?: string | null;
  closingTime?: string | null;
  isWithinServiceHours?: boolean;
  menuRows: PublicMenuRpcRow[];
};

export type PublicStoreOperationalState = {
  isOperationallyReady: boolean;
  acceptsOrders: boolean;
  canPlaceOrders: boolean;
  visibleMenuItems: number;
  purchasableMenuItems: number;
  summaryLabel: string;
  unavailableMessage: string | null;
  scheduleWindowLabel: string | null;
  isOutsideServiceHours: boolean;
};

function toNonNegativeNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }

  return null;
}

function normalizeTimeToHHMM(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

function buildScheduleWindowLabel(openingTime?: string | null, closingTime?: string | null) {
  const opening = normalizeTimeToHHMM(openingTime);
  const closing = normalizeTimeToHHMM(closingTime);

  if (!opening || !closing) {
    return null;
  }

  return `${opening} às ${closing}`;
}

function hasRenderableMenuProduct(row: PublicMenuRpcRow) {
  if (!row.product_id || !row.product_name) {
    return false;
  }

  const unitPrice = toNonNegativeNumber(row.product_price);
  return unitPrice !== null;
}

export function isPublicMenuRowVisible(row: PublicMenuRpcRow) {
  return hasRenderableMenuProduct(row);
}

export function isPublicMenuRowPurchasableNow(row: PublicMenuRpcRow) {
  if (!hasRenderableMenuProduct(row)) {
    return false;
  }

  if (row.track_stock !== true) {
    return true;
  }

  const stockQuantity = toNonNegativeNumber(row.stock_quantity);
  if (stockQuantity === null) {
    return false;
  }

  return stockQuantity > 0;
}

export function countVisiblePublicMenuItems(menuRows: PublicMenuRpcRow[]) {
  const visibleIds = new Set<string>();

  for (const row of menuRows) {
    if (!row.product_id || !isPublicMenuRowVisible(row)) {
      continue;
    }

    visibleIds.add(row.product_id);
  }

  return visibleIds.size;
}

export function countPurchasablePublicMenuItems(menuRows: PublicMenuRpcRow[]) {
  const purchasableIds = new Set<string>();

  for (const row of menuRows) {
    if (!row.product_id || !isPublicMenuRowPurchasableNow(row)) {
      continue;
    }

    purchasableIds.add(row.product_id);
  }

  return purchasableIds.size;
}

export function getPublicStoreOperationalState({
  acceptsOrdersSetting,
  acceptsOrdersManual,
  autoAcceptOrdersBySchedule,
  openingTime,
  closingTime,
  isWithinServiceHours,
  menuRows,
}: PublicStoreOperationalInput): PublicStoreOperationalState {
  const visibleMenuItems = countVisiblePublicMenuItems(menuRows);
  const purchasableMenuItems = countPurchasablePublicMenuItems(menuRows);
  const isOperationallyReady = purchasableMenuItems > 0;
  const acceptsOrders = acceptsOrdersSetting;
  const canPlaceOrders = acceptsOrders && isOperationallyReady;
  const manualAcceptsOrders = acceptsOrdersManual ?? acceptsOrdersSetting;
  const hasAutoSchedule = autoAcceptOrdersBySchedule === true;
  const withinServiceHours = hasAutoSchedule ? isWithinServiceHours === true : true;
  const scheduleWindowLabel = buildScheduleWindowLabel(openingTime, closingTime);

  if (canPlaceOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Aceitando pedidos",
      unavailableMessage: null,
      scheduleWindowLabel,
      isOutsideServiceHours: false,
    };
  }

  if (!manualAcceptsOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Pedidos pausados",
      unavailableMessage: "A loja pausou temporariamente o recebimento de novos pedidos. Tente novamente quando reabrir.",
      scheduleWindowLabel,
      isOutsideServiceHours: false,
    };
  }

  if (hasAutoSchedule && !withinServiceHours) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Fora do horário de atendimento",
      unavailableMessage: scheduleWindowLabel
        ? `A loja está fora do horário de atendimento. Horário de atendimento: ${scheduleWindowLabel}.`
        : "A loja está fora do horário de atendimento.",
      scheduleWindowLabel,
      isOutsideServiceHours: true,
    };
  }

  if (visibleMenuItems > 0) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Loja indisponível para pedidos",
      unavailableMessage: "Os itens do cardápio estão temporariamente indisponíveis para novos pedidos.",
      scheduleWindowLabel,
      isOutsideServiceHours: false,
    };
  }

  return {
    isOperationallyReady,
    acceptsOrders,
    canPlaceOrders,
    visibleMenuItems,
    purchasableMenuItems,
    summaryLabel: "Loja indisponível para pedidos",
    unavailableMessage: "A loja ainda não está pronta para receber pedidos agora.",
    scheduleWindowLabel,
    isOutsideServiceHours: false,
  };
}
