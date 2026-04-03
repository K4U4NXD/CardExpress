import type { PublicCartItem } from "@/types";

export function getPublicCartStorageKey(slug: string) {
  return `cardexpress:cart:${slug}`;
}

export function readPublicCartFromStorage(storageKey: string): PublicCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const candidate = item as Partial<PublicCartItem>;

      if (
        typeof candidate.product_id !== "string" ||
        typeof candidate.name !== "string" ||
        typeof candidate.unit_price !== "number" ||
        !Number.isFinite(candidate.unit_price) ||
        candidate.unit_price < 0 ||
        typeof candidate.quantity !== "number" ||
        !Number.isFinite(candidate.quantity)
      ) {
        return [];
      }

      return [
        {
          product_id: candidate.product_id,
          name: candidate.name,
          unit_price: candidate.unit_price,
          quantity: Math.max(1, Math.floor(candidate.quantity)),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function writePublicCartToStorage(storageKey: string, cartItems: PublicCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cartItems));
  } catch {
    // Se localStorage estiver indisponivel, mantemos apenas no estado local.
  }
}

export function clearPublicCartFromStorage(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Falha silenciosa para nao interromper a experiencia de checkout.
  }
}
