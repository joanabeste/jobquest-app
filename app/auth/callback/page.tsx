'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Auth callback page.
 * Handles Supabase redirects in two formats:
 *   PKCE     → ?code=CODE&next=/reset-password
 *   Implicit → ?next=/reset-password#access_token=TOKEN&refresh_token=REFRESH
 *
 * We let the Supabase client auto-process the URL (detectSessionInUrl: true by default)
 * and listen for the resulting auth events via onAuthStateChange.
 * A timeout shows an error if nothing happens within 8 seconds.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const next = searchParams.get('next') ?? '/';
    const code = searchParams.get('code');
    const hash = window.location.hash;

    // Debug — visible in browser devtools console
    console.log('[auth/callback] URL debug', {
      href: window.location.href,
      search: window.location.search,
      hash,
      code,
      hasHashToken: hash.includes('access_token'),
    });

    const hasCode = !!code;
    const hasHashToken = hash.includes('access_token');

    if (!hasCode && !hasHashToken) {
      console.warn('[auth/callback] No code and no hash token found — invalid link');
      setErrorMsg('Der Link ist ungültig oder abgelaufen.');
      return;
    }

    const supabase = createClient();

    // For PKCE (?code=), the Supabase client auto-exchanges the code when initialized.
    // For implicit (#access_token=), the client auto-detects and fires PASSWORD_RECOVERY.
    // We listen to the resulting event instead of manually calling exchangeCodeForSession.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth/callback] onAuthStateChange', { event, hasSession: !!session });
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        subscription.unsubscribe();
        clearTimeout(timer);
        router.replace(next);
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe();
        clearTimeout(timer);
        setErrorMsg('Der Link ist ungültig oder abgelaufen.');
      }
    });

    // Fallback: session may already be set if client processed URL synchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[auth/callback] getSession result', { hasSession: !!session });
      if (session) {
        subscription.unsubscribe();
        clearTimeout(timer);
        router.replace(next);
      }
    });

    // For implicit flow: if client doesn't auto-detect hash, set session manually
    if (hasHashToken && !hasCode) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      console.log('[auth/callback] Trying manual setSession from hash', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            console.log('[auth/callback] setSession result', { hasSession: !!data.session, error: error?.message });
            if (data.session && !error) {
              subscription.unsubscribe();
              clearTimeout(timer);
              router.replace(next);
            } else if (error) {
              subscription.unsubscribe();
              clearTimeout(timer);
              setErrorMsg(`Fehler: ${error.message}`);
            }
          });
      }
    }

    // Timeout: show error if nothing resolves within 8 s
    const timer = setTimeout(() => {
      console.warn('[auth/callback] Timeout — no auth event received');
      subscription.unsubscribe();
      setErrorMsg('Der Link ist ungültig oder abgelaufen.');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl font-bold">✕</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Link ungültig</h1>
            <p className="text-slate-500 text-sm">{errorMsg}</p>
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
