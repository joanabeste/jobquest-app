'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const { company, isLoading } = useAuth();
  const router = useRouter();
  const [processingTokens, setProcessingTokens] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const hasHashTokens = hash.includes('access_token');
    const params = new URLSearchParams(window.location.search);
    const hasCode = !!params.get('code');

    if (!hasHashTokens && !hasCode) return;

    // Hash tokens or PKCE code detected — process them before redirecting
    setProcessingTokens(true);
    const supabase = createClient();

    if (hasHashTokens) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type'); // e.g. 'recovery', 'magiclink', 'invite'

      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data }) => {
            if (data.session) {
              if (type === 'recovery') {
                router.replace('/reset-password');
              } else {
                // Check if member is pending (invite flow) or active
                fetch('/api/auth/me').then(r => r.json()).then(me => {
                  if (me.member) {
                    router.replace('/dashboard');
                  } else {
                    // Member is pending or not found — go to accept-invite
                    router.replace('/accept-invite');
                  }
                });
              }
            } else {
              setProcessingTokens(false);
            }
          });
        return;
      }
    }

    // PKCE code exchange
    if (hasCode) {
      supabase.auth.exchangeCodeForSession(params.get('code')!).then(({ data }) => {
        if (data.session) {
          router.replace('/dashboard');
        } else {
          setProcessingTokens(false);
        }
      });
      return;
    }

    setProcessingTokens(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (processingTokens || isLoading) return;
    if (company) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [company, isLoading, processingTokens, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">J</span>
        </div>
        <p className="text-slate-500 text-sm">Laden…</p>
      </div>
    </div>
  );
}
