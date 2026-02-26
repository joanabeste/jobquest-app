import { createBrowserClient } from '@supabase/ssr';

// Browser client without strict Database types — the RLS policies restrict
// Insert/Update which causes 'never' type errors with typed clients.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
