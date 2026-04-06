'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Disable auto-detection so we process the URL exactly once, manually.
    { auth: { detectSessionInUrl: false } },
  );
}

/**
 * Handles two Supabase auth redirect formats:
 *   PKCE   → /auth/callback?code=XXXX&next=/reset-password
 *   Implicit → /auth/callback?next=/reset-password#access_token=...&refresh_token=...
 *
 * We parse explicitly and call the matching Supabase method so there is no
 * race condition with the client's own URL-detection logic.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const next = searchParams.get('next') ?? '/';
    const code = searchParams.get('code');

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    const supabase = getSupabase();

    if (code) {
      // PKCE flow: exchange authorization code for session
      supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
        if (err) {
          console.error('[auth/callback] PKCE exchange failed:', err.message);
          setError('Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.');
        } else {
          router.replace(next);
        }
      });
      return;
    }

    if (accessToken && refreshToken) {
      // Implicit flow: set session directly from hash tokens
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: err }) => {
        if (err) {
          console.error('[auth/callback] setSession failed:', err.message);
          setError('Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.');
        } else {
          router.replace(next);
        }
      });
      return;
    }

    // Neither code nor hash token present
    setError('Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.');
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl">✕</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Link ungültig</h1>
            <p className="text-slate-500 text-sm">{error}</p>
            <a href="/forgot-password" className="btn-primary inline-flex justify-center w-full py-2.5">
              Neuen Link anfordern
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-400">
        <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-violet-500 animate-spin" />
        <span className="text-sm">Wird verifiziert…</span>
      </div>
    </div>
  );
}
