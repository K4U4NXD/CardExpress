import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components (ex.: subscribe realtime, chamadas no browser).
 * Login/cadastro/logout usam Server Actions + `createServerSupabaseClient` para gravar cookies de sessão no servidor.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local"
    );
  }

  return createBrowserClient(url, anonKey);
}
