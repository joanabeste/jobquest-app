'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { questStorage, leadStorage, careerCheckStorage, careerCheckLeadStorage, formPageStorage, formSubmissionStorage } from '@/lib/storage';
import { Dimension, FormField } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Users, Download, Search, Mail, Phone, X, Filter, MailCheck, MailX, Trash2, AlertTriangle } from 'lucide-react';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton';

type Source = 'jobquest' | 'berufscheck' | 'formular';
type SourceFilter = 'all' | Source;

interface UnifiedLead {
  id: string;
  source: Source;
  sourceName: string;
  sourceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gdprConsent: boolean;
  submittedAt: string;
  emailSent?: boolean;
  scores?: Record<string, number>;
  dimensions?: Dimension[];
  formAnswers?: Record<string, string>;
  formFieldDefs?: FormField[];
}

// Extract best-guess name/email from form answers
function extractFromAnswers(
  answers: Record<string, string>,
  fields: FormField[],
): { firstName: string; lastName: string; email: string; phone?: string } {
  let firstName = '';
  let lastName = '';
  let email = '';
  let phone: string | undefined;

  fields.forEach((f) => {
    const val = answers[f.id] ?? '';
    const label = f.label.toLowerCase();
    if (!email && f.type === 'email' && val) email = val;
    if (!phone && f.type === 'phone' && val) phone = val;
    if (!firstName && (label.includes('vorname') || label === 'name') && val) firstName = val;
    if (!lastName && label.includes('nachname') && val) lastName = val;
  });

  // Fallback: first text field as firstName if still empty
  if (!firstName && !lastName) {
    const firstText = fields.find((f) => f.type === 'text' && answers[f.id]);
    if (firstText) firstName = answers[firstText.id] ?? '';
  }

  return { firstName, lastName, email, phone };
}

function exportCSV(leads: UnifiedLead[]) {
  // Collect all unique dimension names across berufscheck leads
  const allDimNames: string[] = [];
  leads.forEach((l) => {
    (l.dimensions ?? []).forEach((d) => {
      if (!allDimNames.includes(d.name)) allDimNames.push(d.name);
    });
  });

  const headers = ['Quelle', 'Titel', 'Vorname', 'Nachname', 'E-Mail', 'Telefon', 'DSGVO', ...allDimNames, 'Eingegangen am'];

  const rows = leads.map((l) => {
    const dimScores = allDimNames.map((name) => {
      const dim = l.dimensions?.find((d) => d.name === name);
      return dim ? String(l.scores?.[dim.id] ?? 0) : '';
    });
    return [
      l.source === 'jobquest' ? 'JobQuest' : l.source === 'berufscheck' ? 'Berufscheck' : 'Formular',
      l.sourceName,
      l.firstName,
      l.lastName,
      l.email,
      l.phone ?? '',
      l.gdprConsent ? 'Ja' : 'Nein',
      ...dimScores,
      formatDateTime(l.submittedAt),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alle-kontakte-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { company } = useAuth();
  const toast = useToast();
  const [allLeads, setAllLeads] = useState<UnifiedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedLead, setSelectedLead] = useState<UnifiedLead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<UnifiedLead | null>(null);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const unified: UnifiedLead[] = [];
    try {

    // JobQuest leads
    const quests = await questStorage.getByCompany(company.id);
    const questMap = Object.fromEntries(quests.map((q) => [q.id, q.title]));
    const companyLeads = await leadStorage.getByCompany(company.id);
    companyLeads.forEach((l) => {
      unified.push({
        id: l.id,
        source: 'jobquest',
        sourceName: questMap[l.jobQuestId] ?? 'Unbekannt',
        sourceId: l.jobQuestId,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        gdprConsent: l.gdprConsent,
        submittedAt: l.submittedAt,
        emailSent: l.emailSent,
      });
    });

    // Berufscheck leads
    const checks = await careerCheckStorage.getByCompany(company.id);
    const checkMap = Object.fromEntries(checks.map((c) => [c.id, c]));
    const companyCheckLeads = await careerCheckLeadStorage.getByCompany(company.id);
    companyCheckLeads.forEach((l) => {
      const check = checkMap[l.careerCheckId];
      unified.push({
        id: l.id,
        source: 'berufscheck',
        sourceName: check?.title ?? 'Unbekannt',
        sourceId: l.careerCheckId,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        gdprConsent: l.gdprConsent,
        submittedAt: l.submittedAt,
        scores: l.scores,
        dimensions: check?.dimensions,
      });
    });

    // Formular submissions
    const formPages = await formPageStorage.getByCompany(company.id);
    const formPageMap = Object.fromEntries(formPages.map((f) => [f.id, f]));
    const companySubmissions = await formSubmissionStorage.getByCompany(company.id);
    companySubmissions.forEach((s) => {
      const fp = formPageMap[s.formPageId];
      const allFields = (fp?.formSteps ?? []).flatMap((step) => step.fields);
      const extracted = extractFromAnswers(s.answers, allFields);
      unified.push({
        id: s.id,
        source: 'formular',
        sourceName: fp?.title ?? 'Unbekannt',
        sourceId: s.formPageId,
        firstName: extracted.firstName,
        lastName: extracted.lastName,
        email: extracted.email,
        phone: extracted.phone,
        gdprConsent: s.gdprConsent,
        submittedAt: s.submittedAt,
        formAnswers: s.answers,
        formFieldDefs: allFields,
      });
    });

      unified.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
      setAllLeads(unified);
      setLoadError(false);
    } catch (err) {
      console.error('[LeadsPage] load failed:', err);
      setLoadError(true);
      toast.error('Leads konnten nicht geladen werden. Bitte Seite neu laden.');
    } finally {
      setLoading(false);
    }
  }, [company, toast]);

  useEffect(() => { load(); }, [load]);

  async function deleteLead(lead: UnifiedLead) {
    setDeletingId(lead.id);
    try {
      if (lead.source === 'jobquest') await leadStorage.delete(lead.id);
      else if (lead.source === 'berufscheck') await careerCheckLeadStorage.delete(lead.id);
      else await formSubmissionStorage.delete(lead.id);
      setAllLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelectedLead(null);
      toast.success('Kontakt gelöscht');
    } catch {
      toast.error('Löschen fehlgeschlagen');
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = allLeads.filter((l) => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    const q = search.toLowerCase();
    return (
      !q ||
      l.firstName.toLowerCase().includes(q) ||
      l.lastName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.sourceName.toLowerCase().includes(q)
    );
  });

  const jqCount = allLeads.filter((l) => l.source === 'jobquest').length;
  const bcCount = allLeads.filter((l) => l.source === 'berufscheck').length;
  const fmCount = allLeads.filter((l) => l.source === 'formular').length;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Load error banner */}
      {loadError && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span className="flex-1">Kontakte konnten nicht geladen werden.</span>
          <button onClick={load} className="font-medium underline hover:text-red-900">Erneut versuchen</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontakte</h1>
          <p className="text-slate-500 text-sm mt-0.5">Alle Kontakte aus JobQuests, Berufschecks und Formularen</p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <Download size={15} />
            CSV herunterladen
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </>
        ) : [
          { label: 'Kontakte gesamt', value: allLeads.length, color: 'violet' },
          { label: 'aus JobQuests', value: jqCount, color: 'indigo' },
          { label: 'aus Berufschecks', value: bcCount, color: 'blue' },
          { label: 'aus Formularen', value: fmCount, color: 'emerald' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              color === 'violet' ? 'bg-violet-100' :
              color === 'indigo' ? 'bg-indigo-100' :
              color === 'blue' ? 'bg-blue-100' : 'bg-emerald-100'
            }`}>
              <Users size={20} className={
                color === 'violet' ? 'text-violet-600' :
                color === 'indigo' ? 'text-indigo-600' :
                color === 'blue' ? 'text-blue-600' : 'text-emerald-600'
              } />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">E-Mail</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Telefon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Quelle</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">Eingegangen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : allLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Noch keine Kontakte</h2>
          <p className="text-slate-500 text-sm">Sobald jemand eine JobQuest abschließt, einen Berufscheck ausfüllt oder ein Formular einreicht, erscheinen die Kontakte hier.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name, E-Mail oder Titel suchen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter size={15} className="text-slate-400 flex-shrink-0" />
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white flex-shrink-0">
                {([['all', 'Alle'], ['jobquest', 'JobQuest'], ['berufscheck', 'Check'], ['formular', 'Formular']] as [SourceFilter, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setSourceFilter(val)}
                    className={`px-2.5 sm:px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      sourceFilter === val
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">E-Mail</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden md:table-cell">Telefon</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Quelle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">Eingegangen</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{lead.email}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden md:table-cell">{lead.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex self-start items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            lead.source === 'jobquest'
                              ? 'bg-violet-100 text-violet-700'
                              : lead.source === 'berufscheck'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {lead.source === 'jobquest' ? 'JobQuest' : lead.source === 'berufscheck' ? 'Berufscheck' : 'Formular'}
                          </span>
                          <span className="text-xs text-slate-500 truncate max-w-[140px]">{lead.sourceName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap hidden sm:table-cell">
                        {new Date(lead.submittedAt).toLocaleString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-violet-600 font-medium cursor-pointer" onClick={() => setSelectedLead(lead)}>Details</span>
                          <button
                            onClick={() => setDeleteConfirmLead(lead)}
                            disabled={deletingId === lead.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Kontakt löschen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Keine Kontakte gefunden.
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-right">{filtered.length} von {allLeads.length} Kontakten</p>
        </>
      )}

      {/* Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onDelete={() => setDeleteConfirmLead(selectedLead)}
          deleting={deletingId === selectedLead.id}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-1">Kontakt löschen?</h2>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">{deleteConfirmLead.firstName} {deleteConfirmLead.lastName}</span> wird unwiderruflich gelöscht und kann nicht wiederhergestellt werden.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmLead(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => { deleteLead(deleteConfirmLead); setDeleteConfirmLead(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function LeadDetailModal({ lead, onClose, onDelete, deleting }: {
  lead: UnifiedLead;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const dims = lead.dimensions ?? [];
  const maxScore = dims.length > 0 ? Math.max(...dims.map((d) => lead.scores?.[d.id] ?? 0), 1) : 1;
  const sortedDims = [...dims].sort((a, b) => (lead.scores?.[b.id] ?? 0) - (lead.scores?.[a.id] ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-5 text-white ${
          lead.source === 'jobquest' ? 'bg-gradient-to-br from-violet-600 to-violet-800' :
          lead.source === 'berufscheck' ? 'bg-gradient-to-br from-indigo-600 to-indigo-800' :
          'bg-gradient-to-br from-emerald-600 to-emerald-800'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-medium mb-1 ${
                lead.source === 'jobquest' ? 'text-violet-200' :
                lead.source === 'berufscheck' ? 'text-indigo-200' : 'text-emerald-200'
              }`}>
                {lead.source === 'jobquest' ? 'JobQuest' : lead.source === 'berufscheck' ? 'Berufscheck' : 'Formular'} · {lead.sourceName}
              </p>
              <h2 className="text-lg font-bold">{lead.firstName} {lead.lastName}</h2>
              <p className={`text-sm mt-0.5 ${lead.source === 'jobquest' ? 'text-violet-200' : 'text-indigo-200'}`}>
                {new Date(lead.submittedAt).toLocaleString('de-DE')}
              </p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 flex justify-end">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
            {deleting ? 'Wird gelöscht…' : 'Kontakt löschen'}
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Kontakt */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kontaktdaten</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-sm text-violet-600 hover:underline truncate">
                  {lead.email}
                </a>
                {lead.emailSent === true && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <MailCheck size={10} /> gesendet
                  </span>
                )}
                {lead.emailSent === false && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    <MailX size={10} /> fehlgeschlagen
                  </span>
                )}
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-sm text-slate-700">{lead.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">DSGVO-Einwilligung:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  lead.gdprConsent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {lead.gdprConsent ? 'Erteilt' : 'Nicht erteilt'}
                </span>
              </div>
            </div>
          </div>

          {/* Formular-Antworten */}
          {lead.source === 'formular' && lead.formFieldDefs && lead.formFieldDefs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Formular-Antworten</p>
              <div className="space-y-2.5">
                {lead.formFieldDefs.map((field) => {
                  const val = lead.formAnswers?.[field.id];
                  if (!val) return null;
                  return (
                    <div key={field.id} className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">{field.label}</p>
                      <p className="text-sm text-slate-800 break-words">{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Berufsfeld-Scores (nur bei Berufscheck) */}
          {lead.source === 'berufscheck' && sortedDims.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Berufsfeld-Scores</p>
              <div className="space-y-2.5">
                {sortedDims.map((dim) => {
                  const score = lead.scores?.[dim.id] ?? 0;
                  const pct = Math.round((score / maxScore) * 100);
                  return (
                    <div key={dim.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{dim.name}</span>
                        <span className="text-slate-500">{score} Pkt.</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: dim.color ?? '#7c3aed' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
