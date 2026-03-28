/** Normaliza o slug para comparação e persistência (minúsculas, sem bordas). */
export function normalizeStoreSlug(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Slug público da loja: minúsculas, sem espaços, segmentos separados por hífen.
 * Ex.: minha-loja, cafe-123
 */
export function validateStoreSlug(slug: string): string | null {
  if (!slug) return "O slug da loja é obrigatório.";
  if (slug.length < 2) return "O slug deve ter pelo menos 2 caracteres.";
  if (slug.length > 64) return "O slug deve ter no máximo 64 caracteres.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Use apenas letras minúsculas, números e hífens (sem espaços).";
  }
  return null;
}
