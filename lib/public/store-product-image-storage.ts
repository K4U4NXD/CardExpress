export const PRODUCT_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STORE_LOGOS_BUCKET?.trim() || "public-assets";

function resolveExtensionFromMimeType(mimeType: string): string | null {
  const normalized = mimeType.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "image/svg+xml") {
    return "svg";
  }

  if (normalized.startsWith("image/")) {
    const extension = normalized.slice("image/".length);
    return extension || null;
  }

  return null;
}

function resolveSafeExtension(fileName: string, mimeType: string): string {
  const extensionFromName = fileName
    .trim()
    .toLowerCase()
    .split(".")
    .pop();

  const extensionFromMimeType = resolveExtensionFromMimeType(mimeType);
  const extension = extensionFromName || extensionFromMimeType || "png";

  return extension.replace(/[^a-z0-9]/g, "") || "png";
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized;
}

export function buildStoreProductImageObjectPath(params: {
  storeId: string;
  fileName: string;
  mimeType: string;
  productId?: string | null;
}): string {
  const safeStoreId = sanitizePathSegment(params.storeId);
  if (!safeStoreId) {
    throw new Error("StoreId inválido para upload de imagem de produto.");
  }

  const safeProductSegment = sanitizePathSegment(params.productId ?? "") || "draft";
  const extension = resolveSafeExtension(params.fileName, params.mimeType);
  const entropy = Math.random().toString(36).slice(2, 10);

  return `product-images/${safeStoreId}/${safeProductSegment}/${Date.now()}-${entropy}.${extension}`;
}

export function splitStorageObjectPath(objectPath: string): string[] {
  return objectPath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}
