'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // Exchange the one-time code in the URL for a live session.
  // Supabase PKCE flow sends ?code=... in the reset link.
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Ungültiger oder abgelaufener Link. Bitte fordere einen neuen an.');
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchErr }) => {
      if (exchErr) {
        setError('Link abgelaufen oder ungültig. Bitte fordere einen neuen an.');
      } else {
        setReady(true);
      }
    });
  }, [searchParams]);

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

    router.replace('/dashboard');
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
            <div className="text-sm text-slate-500 text-center py-4">Link wird überprüft…</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={`space-y-4 ${!ready ? 'hidden' : ''}`}>
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
        </div>
      </div>
    </div>
  );
}
