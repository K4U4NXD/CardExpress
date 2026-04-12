import type { PublicCartItem, PublicMenuRpcRow } from "@/types";

type MenuCatalogItem = {
  product_id: string;
  name: string;
  unit_price: number;
};

export type CartReconcileResult = {
  items: PublicCartItem[];
  removedCount: number;
  updatedCount: number;
  priceUpdatedCount: number;
  canCheckout: boolean;
};

function buildMenuCatalog(menuRows: PublicMenuRpcRow[]) {
  const catalog = new Map<string, MenuCatalogItem>();

  for (const row of menuRows) {
    if (!row.product_id || !row.product_name) {
      continue;
    }

    const unitPrice = Number(row.product_price ?? 0);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }

    catalog.set(row.product_id, {
      product_id: row.product_id,
      name: row.product_name,
      unit_price: unitPrice,
    });
  }

  return catalog;
}

export function reconcileCartWithMenu(
  items: PublicCartItem[],
  menuRows: PublicMenuRpcRow[],
  acceptsOrders: boolean
): CartReconcileResult {
  const catalog = buildMenuCatalog(menuRows);
  const byProductId = new Map<string, PublicCartItem>();
  let removedCount = 0;
  let updatedCount = 0;
  let priceUpdatedCount = 0;

  for (const item of items) {
    const menuItem = catalog.get(item.product_id);
    if (!menuItem) {
      removedCount += 1;
      continue;
    }

    const parsedQuantity = Number(item.quantity);
    const quantity = Number.isFinite(parsedQuantity) ? Math.max(1, Math.floor(parsedQuantity)) : 1;
    const normalizedItem: PublicCartItem = {
      product_id: item.product_id,
      name: menuItem.name,
      unit_price: menuItem.unit_price,
      quantity,
    };

    if (
      normalizedItem.name !== item.name ||
      normalizedItem.unit_price !== item.unit_price ||
      normalizedItem.quantity !== item.quantity
    ) {
      updatedCount += 1;

      if (normalizedItem.unit_price !== item.unit_price) {
        priceUpdatedCount += 1;
      }
    }

    const current = byProductId.get(normalizedItem.product_id);
    if (!current) {
      byProductId.set(normalizedItem.product_id, normalizedItem);
      continue;
    }

    byProductId.set(normalizedItem.product_id, {
      ...current,
      quantity: current.quantity + normalizedItem.quantity,
    });
    updatedCount += 1;
  }

  const reconciledItems = Array.from(byProductId.values());

  return {
    items: reconciledItems,
    removedCount,
    updatedCount,
    priceUpdatedCount,
    canCheckout: acceptsOrders && reconciledItems.length > 0,
  };
}
