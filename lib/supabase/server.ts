import { createClient } from "@supabase/supabase-js";

/**
 * Server-side klient med service role-nøkkel. Brukes i server actions
 * der vi trenger å gjøre operasjoner på vegne av spillere uten å stole
 * på klienten. Aldri eksponer denne klienten til klient-bundlen.
 */
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
