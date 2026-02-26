'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { memberStorage } from '@/lib/storage';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import {
  KeyRound, Trash2, Building2, UserCog, CreditCard,
  Eye, EyeOff, CheckCircle, AlertTriangle, ChevronRight,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

export default function EinstellungenPage() {
  const { company, currentMember, logout, can, updateCompany } = useAuth();
  const router = useRouter();

  const role = currentMember?.role;
  const isPlatformAdmin = role === 'platform_admin';
  const isSuperAdmin = role === 'superadmin';

  // ── Passwort ändern ─────────────────────────────────────────────────────────
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  async function handleChangePw() {
    setPwError('');
    if (!currentMember) return;
    if (oldPw !== currentMember.password) {
      setPwError('Das aktuelle Passwort ist falsch.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('Neues Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Die Passwörter stimmen nicht überein.');
      return;
    }
    const updated = { ...currentMember, password: newPw };
    await memberStorage.save(updated);
    if (company && company.contactEmail === currentMember.email) {
      await updateCompany({ ...company, password: newPw });
    }
    setPwDone(true);
    setOldPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwDone(false), 3000);
  }

  // ── Account löschen ─────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const required = isSuperAdmin ? 'LÖSCHEN' : (currentMember?.name ?? '');

  async function handleDeleteAccount() {
    if (!currentMember || !company) return;
    if (isSuperAdmin) {
      // Server-side cascade handles everything
      await fetch('/api/companies/me/delete', { method: 'POST' });
    } else {
      await memberStorage.delete(currentMember.id);
    }
    await logout();
    router.push('/login');
  }

  const canSeeWorkspace = can('edit_company') || can('view_team');

  return (
    <div className="min-h-screen bg-slate-50 pt-14">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Settings size={18} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Einstellungen</h1>
            <p className="text-sm text-slate-500">Account & Workspace verwalten</p>
          </div>
        </div>

        {/* ── Mein Konto ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Mein Konto</h2>
          </div>

          {/* Profil-Info */}
          <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <span className="text-violet-700 text-lg font-bold">
                {currentMember?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{currentMember?.name || company?.contactName}</p>
              <p className="text-sm text-slate-400">{currentMember?.email || company?.contactEmail}</p>
              {role && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold mt-1 ${
                  isPlatformAdmin ? 'bg-slate-900 text-slate-300 font-mono' : ROLE_COLORS[role]
                }`}>
                  {isPlatformAdmin ? 'Developer Mode' : ROLE_LABELS[role]}
                </span>
              )}
            </div>
          </div>

          {/* Passwort ändern */}
          {!isPlatformAdmin && (
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={15} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Passwort ändern</h3>
              </div>

              {pwDone ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm py-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Passwort erfolgreich geändert!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="label">Aktuelles Passwort</label>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        className="input-field pr-10"
                        value={oldPw}
                        onChange={(e) => setOldPw(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowOld(!showOld)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Neues Passwort</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        className="input-field pr-10"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Mindestens 6 Zeichen"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Neues Passwort bestätigen</label>
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="input-field"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Passwort wiederholen"
                    />
                  </div>

                  {pwError && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertTriangle size={14} />
                      {pwError}
                    </div>
                  )}

                  <button
                    onClick={handleChangePw}
                    className="btn-primary"
                  >
                    <KeyRound size={15} />
                    Passwort speichern
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Account löschen */}
          {!isPlatformAdmin && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <Trash2 size={15} className="text-red-500" />
                <h3 className="text-sm font-semibold text-slate-700">Gefahrenzone</h3>
              </div>

              {isSuperAdmin ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-semibold mb-1">Du bist der Inhaber dieses Workspaces.</p>
                      <p>Damit wird der <strong>gesamte Workspace unwiderruflich gelöscht</strong> – inklusive aller JobQuests, Berufschecks, Formulare, Kontakte und Teammitglieder.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Dein Zugang zu diesem Workspace wird entfernt. Die Inhalte bleiben erhalten.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label">
                    Zur Bestätigung{' '}
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 text-xs font-mono">
                      {required}
                    </code>{' '}
                    eintippen:
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder={required}
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== required}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 size={15} />
                  {isSuperAdmin ? 'Workspace endgültig löschen' : 'Account entfernen'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Workspace ────────────────────────────────────────────────────── */}
        {canSeeWorkspace && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Workspace</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {can('edit_company') && (
                <Link href="/company-profile"
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                    <Building2 size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Firmenprofil</p>
                    <p className="text-xs text-slate-400">Logo, Corporate Design, Ansprechpartner:in</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                </Link>
              )}

              {can('view_team') && (
                <Link href="/team"
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <UserCog size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Team</p>
                    <p className="text-xs text-slate-400">Mitglieder verwalten & Rollen vergeben</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                </Link>
              )}

              {/* Abonnement – Placeholder */}
              <div className="flex items-center gap-4 px-6 py-4 opacity-60 cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={18} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-500">Zahlung & Abonnement</p>
                  <p className="text-xs text-slate-400">Plan, Rechnungen & Limits</p>
                </div>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md">
                  Bald
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
