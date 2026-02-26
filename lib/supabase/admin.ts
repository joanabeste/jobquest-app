import { createClient } from '@supabase/supabase-js';

// Admin client without strict Database types — it uses the service_role key
// which bypasses RLS, so the typed Insert/Update restrictions don't apply.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
