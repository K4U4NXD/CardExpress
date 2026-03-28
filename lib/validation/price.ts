/** Interpreta preço digitado (pt-BR: vírgula ou ponto). Retorna valor em unidades monetárias (ex.: reais). */
export function parseMoneyInput(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) {
    return { ok: false, message: "Informe o preço." };
  }

  let s = t;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Preço inválido. Use números, vírgula ou ponto decimal." };
  }
  if (n < 0) {
    return { ok: false, message: "O preço não pode ser negativo." };
  }
  if (n > 1_000_000) {
    return { ok: false, message: "Preço acima do limite permitido." };
  }

  return { ok: true, value: Math.round(n * 100) / 100 };
}

export function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0
  );
}

/** Valor inicial em campo de texto (pt-BR). */
export function formatPriceForInput(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2).replace(".", ",");
}
