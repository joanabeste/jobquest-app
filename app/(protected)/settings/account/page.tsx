'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Trash2, Eye, EyeOff, CheckCircle, AlertTriangle, UserCog } from 'lucide-react';

export default function SettingsAccountPage() {
  const { company, currentMember, logout } = useAuth();
  const router = useRouter();

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  const [confirmText, setConfirmText] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [isLastAdmin, setIsLastAdmin] = useState(false);

  const checkLastAdmin = useCallback(async () => {
    if (!company || !currentMember || currentMember.role !== 'admin') {
      setIsLastAdmin(false);
      return;
    }
    try {
      const res = await fetch('/api/members');
      if (!res.ok) return;
      const members = await res.json();
      const activeAdmins = members.filter((m: { role: string; status: string }) => m.role === 'admin' && m.status === 'active');
      setIsLastAdmin(activeAdmins.length <= 1);
    } catch { /* ignore */ }
  }, [company, currentMember]);

  useEffect(() => { checkLastAdmin(); }, [checkLastAdmin]);

  if (!currentMember || !company) return null;

  const isPlatformAdmin = currentMember.role === 'platform_admin';
  const deleteRequired = isLastAdmin ? 'LÖSCHEN' : currentMember.name;

  async function handleSavePassword() {
    setPwError('');
    if (newPw.length < 6) {
      setPwError('Neues Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Die Passwörter stimmen nicht überein.');
      return;
    }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentMember!.email,
      password: oldPw,
    });
    if (signInError) {
      setPwError('Das aktuelle Passwort ist falsch.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    if (updateError) {
      setPwError(updateError.message);
      return;
    }
    setPwDone(true);
    setOldPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwDone(false), 3000);
  }

  async function handleDeleteAccount() {
    if (!currentMember || !company) return;
    if (isLastAdmin) {
      await fetch('/api/companies/me/delete', { method: 'POST' });
    } else {
      await fetch(`/api/members/${currentMember.id}`, { method: 'DELETE' });
    }
    await logout();
    router.push('/login');
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <UserCog size={22} className="text-slate-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mein Konto</h1>
          <p className="text-slate-500 text-sm mt-0.5">{currentMember.email}</p>
        </div>
      </div>

      {/* Change password */}
      {!isPlatformAdmin && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound size={17} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">Passwort ändern</h2>
          </div>

          {pwDone ? (
            <div className="flex items-center gap-2 text-emerald-600 py-2">
              <CheckCircle size={18} />
              <p className="font-medium">Passwort erfolgreich geändert!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Aktuelles Passwort</label>
                <div className="relative">
                  <input type={showOld ? 'text' : 'password'} className="input-field pr-10"
                    value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Neues Passwort</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} className="input-field pr-10"
                    value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Mindestens 6 Zeichen" />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Neues Passwort bestätigen</label>
                <input type={showNew ? 'text' : 'password'} className="input-field"
                  value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Passwort wiederholen" />
              </div>
              {pwError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={14} />
                  {pwError}
                </div>
              )}
              <button onClick={handleSavePassword} className="btn-primary">
                <KeyRound size={15} />
                Passwort speichern
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete account */}
      {!isPlatformAdmin && (
        <div className="card p-6 border-red-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Trash2 size={17} className="text-red-500" />
              <h2 className="font-semibold text-slate-900">Account löschen</h2>
            </div>
            {!showDeleteSection && (
              <button onClick={() => setShowDeleteSection(true)}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Löschen
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-4">
            {isLastAdmin
              ? 'Du bist der letzte Admin. Das Löschen entfernt den gesamten Workspace unwiderruflich.'
              : 'Entfernt deinen Zugang zu diesem Workspace. Die Inhalte bleiben erhalten.'}
          </p>

          {showDeleteSection && (
            <div className="space-y-4 border-t border-red-100 pt-4">
              {isLastAdmin && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-2">
                  <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    Du bist der letzte Administrator. <strong>Alle Daten werden unwiderruflich gelöscht.</strong>
                  </p>
                </div>
              )}
              <div>
                <label className="label">
                  Zur Bestätigung{' '}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 text-xs font-mono">{deleteRequired}</code>{' '}
                  eintippen:
                </label>
                <input type="text" className="input-field font-mono" placeholder={deleteRequired}
                  value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowDeleteSection(false); setConfirmText(''); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  Abbrechen
                </button>
                <button onClick={handleDeleteAccount} disabled={confirmText !== deleteRequired}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Trash2 size={15} />
                  Endgültig löschen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
