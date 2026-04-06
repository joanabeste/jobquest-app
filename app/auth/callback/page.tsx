'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase auth callback — handles both PKCE (?code=) and implicit (#access_token=) flows.
 * The Supabase browser client auto-processes the URL when detectSessionInUrl is true (default).
 * We listen to onAuthStateChange instead of manually calling exchangeCodeForSession to avoid
 * double-exchange race conditions.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') ?? '/';
    const hasCode = !!params.get('code');
    const hasHashToken = window.location.hash.includes('access_token');

    if (!hasCode && !hasHashToken) {
      router.replace('/login?error=link_expired');
      return;
    }

    const supabase = createClient();

    // The Supabase client automatically exchanges ?code= (PKCE) or processes
    // #access_token= (implicit) from the URL. Listen for the resulting event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        subscription.unsubscribe();
        router.replace(next);
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe();
        router.replace('/login?error=link_expired');
      }
    });

    // Also check immediately in case the client already processed the URL
    // synchronously before our listener was registered.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.replace(next);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-violet-500 animate-spin" />
        <span className="text-sm">Wird verifiziert…</span>
      </div>
    </div>
  );
}
