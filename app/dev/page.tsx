'use client';

/**
 * Secret developer/support panel – not linked anywhere.
 * Access via: /dev
 *
 * Allows the platform_admin (you) to log into any workspace for support.
 * platform_admin members are invisible to regular workspace users.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Company, DEV_PASSWORD } from '@/lib/types';
import { Terminal, LogIn, Building2, Lock, Eye, EyeOff, Users, Globe, AlertTriangle } from 'lucide-react';

const DEV_MEMBER_EMAIL = 'dev@jobquest.internal';

export default function DevPage() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    if (unlocked) {
      const load = async () => {
        try {
          const res = await fetch(`/api/dev/companies?pw=${encodeURIComponent(password)}`);
          if (!res.ok) return;
          const data = await res.json();
          setCompanies(data.companies ?? []);
          setMemberCounts(data.memberCounts ?? {});
        } catch { /* ignore */ }
      };
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  function handleUnlock() {
    if (password === DEV_PASSWORD) {
      setUnlocked(true);
      setPwError('');
    } else {
      setPwError('Falsches Passwort.');
      setPassword('');
    }
  }

  async function handleJoin(company: Company) {
    setLoggingIn(company.id);
    try {
      const res = await fetch('/api/dev/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, pw: password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch { /* ignore */ }
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Terminal size={20} className="text-slate-300" />
            </div>
            <span className="text-lg font-mono font-semibold text-slate-200">JobQuest Dev Panel</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={15} className="text-slate-500" />
              <p className="text-sm text-slate-400 font-mono">developer access required</p>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-slate-100 font-mono text-sm outline-none focus:border-slate-500 placeholder-slate-600"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwError && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-400 font-mono">
                <AlertTriangle size={12} />
                {pwError}
              </div>
            )}
            <button
              onClick={handleUnlock}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm py-2.5 rounded-xl transition-colors"
            >
              <LogIn size={15} />
              Zugang anfordern
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-700 font-mono">
            Diese Seite existiert nicht. — /dev
          </p>
        </div>
      </div>
    );
  }

  // ── Workspace list ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Terminal size={20} className="text-slate-300" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-semibold text-slate-200">Dev Panel</h1>
            <p className="text-xs font-mono text-slate-500">
              {companies.length} workspace{companies.length !== 1 ? 's' : ''} in localStorage
            </p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3 mb-6 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-mono text-amber-400">
            Du erhältst als <span className="font-bold">platform_admin</span> Vollzugriff.
            Dein Eintrag ist für reguläre Workspace-Nutzer unsichtbar.
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-500 font-mono text-sm">Keine Workspaces gefunden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-slate-700 transition-colors"
              >
                {/* Logo / avatar */}
                {company.logo ? (
                  <img src={company.logo} alt={company.name}
                    className="w-10 h-10 rounded-xl object-contain bg-white/5 p-0.5 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-slate-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate">{company.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Users size={11} />
                      {memberCounts[company.id] ?? 0} Mitglieder
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Globe size={11} />
                      {company.industry}
                    </span>
                    <span className="text-xs font-mono text-slate-600 truncate">
                      {company.contactEmail}
                    </span>
                  </div>
                </div>

                {/* Join button */}
                <button
                  onClick={() => handleJoin(company)}
                  disabled={loggingIn === company.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-xs font-medium transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  <LogIn size={13} />
                  {loggingIn === company.id ? 'Einloggen…' : 'Einloggen'}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs font-mono text-slate-700">
          platform_admin · {DEV_MEMBER_EMAIL}
        </p>
      </div>
    </div>
  );
}
