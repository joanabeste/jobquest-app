'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Works for both flows:
    // – Implicit flow: Supabase parses #access_token automatically and fires PASSWORD_RECOVERY
    // – PKCE flow: we exchange ?code= and the resulting SIGNED_IN event fires below
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // PKCE flow: exchange ?code= query parameter for a session
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setError('Link abgelaufen oder ungültig. Bitte fordere einen neuen an.');
      });
    }

    // Fallback: if no session event fires within 8 seconds, the link is invalid
    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setError('Link abgelaufen oder ungültig. Bitte fordere einen neuen an.');
        return r;
      });
    }, 8_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">JobQuest</span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Neues Passwort</h1>
          <p className="text-slate-500 text-sm mb-6">Gib dein neues Passwort ein.</p>

          {!ready && !error && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-violet-500 animate-spin" />
              Link wird überprüft…
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {ready && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Neues Passwort</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Passwort bestätigen</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Passwort wiederholen"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full justify-center py-2.5 text-base"
              >
                {submitting ? 'Speichern…' : 'Passwort speichern'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
