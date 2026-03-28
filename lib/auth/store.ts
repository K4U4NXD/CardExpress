import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Resolve a loja do usuário autenticado (1 loja por conta). Usado em actions e páginas do dashboard. */
export async function getUserStore() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, store: null };
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select("id, name, slug, phone")
    .eq("owner_id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    store: store ?? null,
    storeError: error,
  };
}
