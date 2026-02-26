'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceMember, WorkspaceRole, ROLE_LABELS, ROLE_COLORS, VISIBLE_ROLES } from '@/lib/types';
import { memberStorage } from '@/lib/storage';
import {
  Users, UserPlus, Trash2, Shield, Eye, Edit3, Crown,
  ChevronDown, X, Check, AlertTriangle, CheckCircle,
} from 'lucide-react';

const ROLE_ORDER: WorkspaceRole[] = ['superadmin', 'admin', 'editor', 'viewer'];

const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  platform_admin: '',
  superadmin: 'Vollzugriff auf alles. Kann alle Mitglieder und Rollen verwalten.',
  admin: 'Kann Inhalte erstellen, bearbeiten, löschen, veröffentlichen & Mitglieder einladen.',
  editor: 'Kann Inhalte erstellen & bearbeiten, aber nicht löschen oder veröffentlichen.',
  viewer: 'Kann Leads und Inhalte nur lesen (kein Bearbeiten).',
};

const ROLE_ICONS: Record<WorkspaceRole, React.ReactNode> = {
  platform_admin: null,
  superadmin: <Crown size={14} />,
  admin: <Shield size={14} />,
  editor: <Edit3 size={14} />,
  viewer: <Eye size={14} />,
};

export default function SettingsTeamPage() {
  const { company, currentMember, can } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [saved, setSaved] = useState(false);

  const [invite, setInvite] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor' as WorkspaceRole,
  });
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (company) reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  function reload() {
    if (!company) return;
    setMembers(memberStorage.getByCompany(company.id));
  }

  function handleInvite() {
    setInviteError('');
    if (!invite.name.trim() || !invite.email.trim() || !invite.password.trim()) {
      setInviteError('Alle Felder sind Pflichtfelder.');
      return;
    }
    if (invite.password.length < 6) {
      setInviteError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    const existing = members.find((m) => m.email === invite.email);
    if (existing) {
      setInviteError('Diese E-Mail-Adresse ist bereits im Workspace vorhanden.');
      return;
    }
    const newMember: WorkspaceMember = {
      id: crypto.randomUUID(),
      companyId: company!.id,
      name: invite.name.trim(),
      email: invite.email.trim().toLowerCase(),
      password: invite.password,
      role: invite.role,
      invitedBy: currentMember?.id,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    memberStorage.save(newMember);
    reload();
    setShowInvite(false);
    setInvite({ name: '', email: '', password: '', role: 'editor' });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleRoleChange(member: WorkspaceMember, newRole: WorkspaceRole) {
    if (member.role === 'superadmin') return;
    memberStorage.save({ ...member, role: newRole });
    reload();
  }

  function handleRemove(member: WorkspaceMember) {
    if (member.role === 'superadmin' || member.role === 'platform_admin') return;
    if (member.id === currentMember?.id) return;
    memberStorage.delete(member.id);
    reload();
  }

  if (!company || !currentMember) return null;

  const visibleMembers = members.filter((m) => m.role !== 'platform_admin');
  const isSuperAdmin = currentMember.role === 'superadmin';
  const canManage = can('manage_members');

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Users size={22} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {visibleMembers.length} {visibleMembers.length === 1 ? 'Mitglied' : 'Mitglieder'} im Workspace
            </p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus size={16} />
            Person einladen
          </button>
        )}
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} />
          Mitglied wurde erfolgreich hinzugefügt.
        </div>
      )}

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Rollenübersicht</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[role]}`}>
                {ROLE_ICONS[role]}
                {ROLE_LABELS[role]}
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card divide-y divide-slate-100">
        {visibleMembers
          .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
          .map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isSelf={member.id === currentMember.id}
              isSuperAdmin={isSuperAdmin}
              canManage={canManage}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
            />
          ))}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-900">Person einladen</h2>
              </div>
              <button onClick={() => { setShowInvite(false); setInviteError(''); }}
                className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input-field" placeholder="Max Mustermann"
                  value={invite.name} onChange={(e) => setInvite((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">E-Mail *</label>
                <input type="email" className="input-field" placeholder="max@firma.de"
                  value={invite.email} onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Initiales Passwort *</label>
                <input type="text" className="input-field font-mono" placeholder="Mindestens 6 Zeichen"
                  value={invite.password} onChange={(e) => setInvite((p) => ({ ...p, password: e.target.value }))} />
                <p className="text-xs text-slate-400 mt-1">
                  Teile dieses Passwort mit der Person – sie kann es nach dem Einloggen nicht ändern (localStorage-Demo).
                </p>
              </div>
              <div>
                <label className="label">Rolle *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {VISIBLE_ROLES.filter((r) => r !== 'superadmin').map((role) => (
                    <button key={role} type="button" onClick={() => setInvite((p) => ({ ...p, role }))}
                      className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        invite.role === role ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold flex-shrink-0 ${ROLE_COLORS[role]}`}>
                        {ROLE_ICONS[role]}
                        {ROLE_LABELS[role]}
                      </span>
                      {invite.role === role && <Check size={14} className="text-violet-600 ml-auto flex-shrink-0 mt-0.5" />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">{ROLE_DESCRIPTIONS[invite.role]}</p>
              </div>
              {inviteError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertTriangle size={14} />
                  {inviteError}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowInvite(false); setInviteError(''); }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  Abbrechen
                </button>
                <button onClick={handleInvite} className="flex-1 btn-primary justify-center">
                  <UserPlus size={15} />
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, isSelf, isSuperAdmin, canManage, onRoleChange, onRemove }: {
  member: WorkspaceMember; isSelf: boolean; isSuperAdmin: boolean; canManage: boolean;
  onRoleChange: (member: WorkspaceMember, role: WorkspaceRole) => void;
  onRemove: (member: WorkspaceMember) => void;
}) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwner = member.role === 'superadmin' || member.role === 'platform_admin';
  const canEdit = canManage && !isOwner && !isSelf;
  const canDelete = canManage && !isOwner && !isSelf;
  const assignableRoles = VISIBLE_ROLES.filter((r) => r !== 'superadmin');

  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
        <span className="text-violet-700 text-sm font-semibold">{member.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
          {isSelf && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">Du</span>}
        </div>
        <p className="text-xs text-slate-400 truncate">{member.email}</p>
      </div>
      <div className="flex-shrink-0">
        {canEdit ? (
          <div className="relative">
            <button onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm ${ROLE_COLORS[member.role]}`}>
              {ROLE_ICONS[member.role]}
              {ROLE_LABELS[member.role]}
              <ChevronDown size={11} className={`transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {roleMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                  {assignableRoles.map((role) => (
                    <button key={role} onClick={() => { onRoleChange(member, role); setRoleMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors ${
                        member.role === role ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center ${ROLE_COLORS[role]}`}>{ROLE_ICONS[role]}</span>
                      {ROLE_LABELS[role]}
                      {member.role === role && <Check size={12} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${ROLE_COLORS[member.role]}`}>
            {ROLE_ICONS[member.role]}
            {ROLE_LABELS[member.role]}
          </span>
        )}
      </div>
      {canDelete && (
        confirmDelete ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onRemove(member)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
              <Check size={12} /> Ja
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors">
              <X size={12} /> Nein
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Mitglied entfernen">
            <Trash2 size={15} />
          </button>
        )
      )}
      {isOwner && isSuperAdmin && !isSelf && <span className="text-xs text-slate-300 flex-shrink-0">–</span>}
    </div>
  );
}
