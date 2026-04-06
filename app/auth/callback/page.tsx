'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase PKCE auth callback — runs in the browser so the session
 * is stored in the browser's own cookie storage (no server→client handoff).
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = params.get('next') ?? '/';

    if (!code) {
      router.replace('/login?error=link_expired');
      return;
    }

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('[auth/callback] exchangeCodeForSession error:', error.message);
        router.replace('/login?error=link_expired');
      } else {
        router.replace(next);
      }
    });
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
