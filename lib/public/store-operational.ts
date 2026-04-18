import type { PublicMenuRpcRow } from "@/types";

type PublicStoreOperationalInput = {
  acceptsOrdersSetting: boolean;
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
  menuRows,
}: PublicStoreOperationalInput): PublicStoreOperationalState {
  const visibleMenuItems = countVisiblePublicMenuItems(menuRows);
  const purchasableMenuItems = countPurchasablePublicMenuItems(menuRows);
  const isOperationallyReady = purchasableMenuItems > 0;
  const acceptsOrders = acceptsOrdersSetting;
  const canPlaceOrders = acceptsOrders && isOperationallyReady;

  if (canPlaceOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Aceitando pedidos",
      unavailableMessage: null,
    };
  }

  if (!acceptsOrders) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Pedidos pausados",
      unavailableMessage: "A loja pausou temporariamente o recebimento de novos pedidos. Tente novamente quando reabrir.",
    };
  }

  if (visibleMenuItems > 0) {
    return {
      isOperationallyReady,
      acceptsOrders,
      canPlaceOrders,
      visibleMenuItems,
      purchasableMenuItems,
      summaryLabel: "Loja indisponivel para pedidos",
      unavailableMessage: "Os itens do cardapio estao temporariamente indisponiveis para novos pedidos.",
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
  };
}
