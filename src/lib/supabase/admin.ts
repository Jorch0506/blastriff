import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Server-only: bypasses Row Level Security via the service role key.
// Never import this file from a Client Component.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    }
  );
}
