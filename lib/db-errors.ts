type PgError = {
  message?: string;
  code?: string;
  details?: string;
};

/** Mensagem amigável para erros comuns do PostgREST em operações do dashboard. */
export function formatPostgrestError(err: PgError): string {
  const m = (err.message ?? "").trim();
  const lower = m.toLowerCase();
  const details = (err.details ?? "").toLowerCase();
  const combined = `${lower} ${details}`;

  if (err.code === "23505" || combined.includes("duplicate key") || combined.includes("unique constraint")) {
    if (combined.includes("categor")) {
      return "Já existe uma categoria com este nome na sua loja.";
    }
    if (combined.includes("product") || combined.includes("category_id")) {
      return "Já existe um produto com este nome nesta categoria. Use outro nome ou troque de categoria.";
    }
    return "Já existe um registro com os mesmos dados. Verifique nomes únicos na loja.";
  }

  if (m.includes("Could not find") && m.includes("column")) {
    return "Coluna ou tabela inesperada no banco. Confira o schema no Supabase.";
  }
  if (
    err.code === "42501" ||
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls")
  ) {
    return "Operação bloqueada pelas regras de segurança (RLS) no Supabase.";
  }

  return m || "Erro ao comunicar com o banco de dados.";
}
