import type { OrderStatus } from "@/types";

const STORAGE_PREFIX = "cardexpress:public-flow:recovery:";
const RECOVERY_VERSION = 1;
const CHECKOUT_FALLBACK_TTL_MS = 2 * 60 * 60 * 1000;
const ORDER_RECOVERY_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_RECOVERY_ORDERS_PER_STORE = 10;

export type PublicCheckoutRecovery = {
  checkoutSessionId: string;
  checkoutPublicToken: string;
  storeId: string;
  status: string;
  totalAmount: number;
  expiresAt: string | null;
  checkoutUrl: string;
  updatedAt: string;
};

export type PublicOrderRecovery = {
  orderId: string;
  orderPublicToken: string;
  status: string;
  displayCode: string | null;
  orderUrl: string;
  updatedAt: string;
};

export type PublicFlowRecoveryRecord = {
  version: 1;
  slug: string;
  updatedAt: string;
  checkout?: PublicCheckoutRecovery;
  orders?: PublicOrderRecovery[];
};

type SaveCheckoutRecoveryInput = {
  slug: string;
  checkoutSessionId: string;
  checkoutPublicToken: string;
  storeId: string;
  status: string;
  totalAmount: number;
  expiresAt: string | null;
  checkoutUrl?: string;
};

type SaveOrderRecoveryInput = {
  slug: string;
  orderId: string;
  orderPublicToken: string;
  status: string;
  displayCode?: string | null;
  orderUrl?: string;
  clearCheckout?: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function hasWindow() {
  return typeof window !== "undefined";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePathForSlug(path: string, slug: string, fallbackPath: string) {
  const normalized = path.trim();

  if (!normalized.startsWith(`/${slug}`)) {
    return fallbackPath;
  }

  return normalized;
}

function readStorageValue(storageKey: string) {
  if (!hasWindow()) {
    return null;
  }

  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStorageValue(storageKey: string, value: string) {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // Ignora falha de persistencia para nao quebrar o fluxo publico.
  }
}

function removeStorageValue(storageKey: string) {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Falha silenciosa em navegadores com bloqueio de storage.
  }
}

function sortOrdersByUpdatedAtDesc(orders: PublicOrderRecovery[]) {
  return [...orders].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function sanitizeCheckoutRecovery(slug: string, rawCheckout: unknown, nowMs: number): PublicCheckoutRecovery | undefined {
  if (!rawCheckout || typeof rawCheckout !== "object") {
    return undefined;
  }

  const candidate = rawCheckout as Partial<PublicCheckoutRecovery>;

  if (
    !isNonEmptyString(candidate.checkoutSessionId) ||
    !isNonEmptyString(candidate.checkoutPublicToken) ||
    !isNonEmptyString(candidate.storeId) ||
    !isNonEmptyString(candidate.status) ||
    !isFiniteNumber(candidate.totalAmount)
  ) {
    return undefined;
  }

  const updatedAt = isIsoDate(candidate.updatedAt) ? candidate.updatedAt : nowIso();
  const expiresAt = isIsoDate(candidate.expiresAt) ? candidate.expiresAt : null;
  const fallbackCheckoutPath = `/${slug}/checkout`;
  const checkoutUrl = normalizePathForSlug(
    isNonEmptyString(candidate.checkoutUrl) ? candidate.checkoutUrl : fallbackCheckoutPath,
    slug,
    fallbackCheckoutPath
  );

  const isExpiredByDate = expiresAt ? Date.parse(expiresAt) <= nowMs : false;
  const isExpiredByFallbackWindow = !expiresAt && Date.parse(updatedAt) <= nowMs - CHECKOUT_FALLBACK_TTL_MS;

  if (isExpiredByDate || isExpiredByFallbackWindow) {
    return undefined;
  }

  return {
    checkoutSessionId: candidate.checkoutSessionId,
    checkoutPublicToken: candidate.checkoutPublicToken,
    storeId: candidate.storeId,
    status: candidate.status,
    totalAmount: candidate.totalAmount,
    expiresAt,
    checkoutUrl,
    updatedAt,
  };
}

function sanitizeOrderRecovery(slug: string, rawOrder: unknown, nowMs: number): PublicOrderRecovery | undefined {
  if (!rawOrder || typeof rawOrder !== "object") {
    return undefined;
  }

  const candidate = rawOrder as Partial<PublicOrderRecovery>;

  if (
    !isNonEmptyString(candidate.orderId) ||
    !isNonEmptyString(candidate.orderPublicToken) ||
    !isNonEmptyString(candidate.status)
  ) {
    return undefined;
  }

  const updatedAt = isIsoDate(candidate.updatedAt) ? candidate.updatedAt : nowIso();
  if (Date.parse(updatedAt) <= nowMs - ORDER_RECOVERY_TTL_MS) {
    return undefined;
  }

  if (isTerminalOrderStatus(candidate.status)) {
    return undefined;
  }

  const fallbackOrderPath = `/${slug}/pedido/${candidate.orderId}?token=${encodeURIComponent(candidate.orderPublicToken)}`;
  const orderUrl = normalizePathForSlug(
    isNonEmptyString(candidate.orderUrl) ? candidate.orderUrl : fallbackOrderPath,
    slug,
    fallbackOrderPath
  );

  return {
    orderId: candidate.orderId,
    orderPublicToken: candidate.orderPublicToken,
    status: candidate.status,
    displayCode: typeof candidate.displayCode === "string" ? candidate.displayCode : null,
    orderUrl,
    updatedAt,
  };
}

function sanitizeOrdersRecovery(slug: string, rawOrders: unknown, nowMs: number): PublicOrderRecovery[] {
  const sourceList: unknown[] = Array.isArray(rawOrders)
    ? rawOrders
    : rawOrders && typeof rawOrders === "object"
      ? [rawOrders]
      : [];

  const byOrderId = new Map<string, PublicOrderRecovery>();

  for (const rawOrder of sourceList) {
    const sanitized = sanitizeOrderRecovery(slug, rawOrder, nowMs);
    if (!sanitized) {
      continue;
    }

    const existing = byOrderId.get(sanitized.orderId);
    if (!existing || Date.parse(sanitized.updatedAt) > Date.parse(existing.updatedAt)) {
      byOrderId.set(sanitized.orderId, sanitized);
    }
  }

  const sorted = sortOrdersByUpdatedAtDesc(Array.from(byOrderId.values()));
  return sorted.slice(0, MAX_RECOVERY_ORDERS_PER_STORE);
}

function sanitizeRecord(slug: string, rawRecord: unknown): PublicFlowRecoveryRecord | null {
  if (!rawRecord || typeof rawRecord !== "object") {
    return null;
  }

  const candidate = rawRecord as Partial<PublicFlowRecoveryRecord> & {
    order?: unknown;
    orders?: unknown;
  };

  if (candidate.version !== RECOVERY_VERSION || candidate.slug !== slug) {
    return null;
  }

  const nowMs = Date.now();
  const checkout = sanitizeCheckoutRecovery(slug, candidate.checkout, nowMs);
  const orders = sanitizeOrdersRecovery(slug, candidate.orders ?? candidate.order, nowMs);

  if (!checkout && orders.length === 0) {
    return null;
  }

  return {
    version: RECOVERY_VERSION,
    slug,
    updatedAt: isIsoDate(candidate.updatedAt) ? candidate.updatedAt : nowIso(),
    ...(checkout ? { checkout } : {}),
    ...(orders.length > 0 ? { orders } : {}),
  };
}

function persistRecord(slug: string, nextRecord: PublicFlowRecoveryRecord | null) {
  const storageKey = getPublicFlowRecoveryStorageKey(slug);

  if (!nextRecord) {
    removeStorageValue(storageKey);
    return;
  }

  writeStorageValue(storageKey, JSON.stringify(nextRecord));
}

export function getPublicFlowRecoveryStorageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

export function isTerminalOrderStatus(status: string): status is OrderStatus {
  return status === "finalizado" || status === "recusado" || status === "cancelado";
}

export function isCheckoutRecoveryExpired(checkout: Pick<PublicCheckoutRecovery, "expiresAt" | "updatedAt">, nowMs = Date.now()) {
  if (isIsoDate(checkout.expiresAt)) {
    return Date.parse(checkout.expiresAt) <= nowMs;
  }

  return Date.parse(checkout.updatedAt) <= nowMs - CHECKOUT_FALLBACK_TTL_MS;
}

export function readPublicFlowRecovery(slug: string): PublicFlowRecoveryRecord | null {
  const storageKey = getPublicFlowRecoveryStorageKey(slug);
  const raw = readStorageValue(storageKey);

  if (!raw) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStorageValue(storageKey);
    return null;
  }

  const sanitized = sanitizeRecord(slug, parsed);
  if (!sanitized) {
    removeStorageValue(storageKey);
    return null;
  }

  const sanitizedRaw = JSON.stringify(sanitized);
  if (sanitizedRaw !== raw) {
    writeStorageValue(storageKey, sanitizedRaw);
  }

  return sanitized;
}

export function clearPublicFlowRecovery(slug: string) {
  persistRecord(slug, null);
}

export function clearCheckoutRecovery(slug: string) {
  const current = readPublicFlowRecovery(slug);

  if (!current) {
    return;
  }

  if (!current.orders || current.orders.length === 0) {
    clearPublicFlowRecovery(slug);
    return;
  }

  persistRecord(slug, {
    version: RECOVERY_VERSION,
    slug,
    updatedAt: nowIso(),
    orders: current.orders,
  });
}

export function clearOrderRecovery(slug: string, orderId?: string) {
  const current = readPublicFlowRecovery(slug);

  if (!current) {
    return;
  }

  const remainingOrders = orderId
    ? (current.orders ?? []).filter((item) => item.orderId !== orderId)
    : [];

  if (!current.checkout && remainingOrders.length === 0) {
    clearPublicFlowRecovery(slug);
    return;
  }

  persistRecord(slug, {
    version: RECOVERY_VERSION,
    slug,
    updatedAt: nowIso(),
    ...(current.checkout ? { checkout: current.checkout } : {}),
    ...(remainingOrders.length > 0 ? { orders: remainingOrders } : {}),
  });
}

export function saveCheckoutRecovery({
  slug,
  checkoutSessionId,
  checkoutPublicToken,
  storeId,
  status,
  totalAmount,
  expiresAt,
  checkoutUrl,
}: SaveCheckoutRecoveryInput) {
  const current = readPublicFlowRecovery(slug);
  const now = nowIso();
  const fallbackPath = `/${slug}/checkout`;

  const nextRecord: PublicFlowRecoveryRecord = {
    version: RECOVERY_VERSION,
    slug,
    updatedAt: now,
    ...(current?.orders && current.orders.length > 0 ? { orders: current.orders } : {}),
    checkout: {
      checkoutSessionId,
      checkoutPublicToken,
      storeId,
      status,
      totalAmount,
      expiresAt,
      checkoutUrl: normalizePathForSlug(checkoutUrl ?? fallbackPath, slug, fallbackPath),
      updatedAt: now,
    },
  };

  persistRecord(slug, nextRecord);
}

export function saveOrderRecovery({
  slug,
  orderId,
  orderPublicToken,
  status,
  displayCode = null,
  orderUrl,
  clearCheckout = true,
}: SaveOrderRecoveryInput) {
  if (isTerminalOrderStatus(status)) {
    clearOrderRecovery(slug, orderId);
    return;
  }

  const current = readPublicFlowRecovery(slug);
  const now = nowIso();
  const fallbackPath = `/${slug}/pedido/${orderId}?token=${encodeURIComponent(orderPublicToken)}`;

  const nextOrder: PublicOrderRecovery = {
    orderId,
    orderPublicToken,
    status,
    displayCode,
    orderUrl: normalizePathForSlug(orderUrl ?? fallbackPath, slug, fallbackPath),
    updatedAt: now,
  };

  const nextOrdersMap = new Map<string, PublicOrderRecovery>();

  for (const item of current?.orders ?? []) {
    nextOrdersMap.set(item.orderId, item);
  }

  nextOrdersMap.set(nextOrder.orderId, nextOrder);

  const nextOrders = sortOrdersByUpdatedAtDesc(Array.from(nextOrdersMap.values())).slice(0, MAX_RECOVERY_ORDERS_PER_STORE);

  const nextRecord: PublicFlowRecoveryRecord = {
    version: RECOVERY_VERSION,
    slug,
    updatedAt: now,
    ...(current?.checkout && !clearCheckout ? { checkout: current.checkout } : {}),
    orders: nextOrders,
  };

  persistRecord(slug, nextRecord);
}