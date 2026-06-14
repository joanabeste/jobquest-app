'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, company, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isLoading && company) router.replace('/dashboard');
  }, [company, isLoading, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'link_expired') {
      setNotice('Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.');
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));
    const err = await login(email, password);
    if (!err) {
      router.push('/dashboard');
    } else {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-jq-cloud via-white to-jq-paper-2 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/brand/jobquest-logo.png" alt="JobQuest"
            className="h-20 w-auto mx-auto rounded-2xl shadow-lg" />
          <p className="text-slate-500 text-sm mt-3">Digitales Ausbildungsmarketing</p>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">Anmelden</h1>

          {notice && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-4">
              {notice}{' '}
              <a href="/forgot-password" className="underline font-medium">Neuen Link anfordern</a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-Mail-Adresse</label>
              <input
                type="email"
                className="input-field"
                placeholder="name@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              <LogIn size={18} />
              {submitting ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-500">
            <Link href="/forgot-password" className="text-jq-indigo hover:text-jq-indigo-deep font-medium">
              Passwort vergessen?
            </Link>
            <span>
              Noch kein Account?{' '}
              <Link href="/register" className="text-jq-indigo hover:text-jq-indigo-deep font-medium">
                Jetzt registrieren
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
