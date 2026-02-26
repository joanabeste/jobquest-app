'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { careerCheckStorage, careerCheckLeadStorage } from '@/lib/storage';
import { CareerCheck, CareerCheckLead, Dimension } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { ArrowLeft, Download, Users, Search, Mail, Phone, Calendar } from 'lucide-react';

function exportLeadsCSV(leads: CareerCheckLead[], dimensions: Dimension[], checkTitle: string) {
  const dimHeaders = dimensions.map((d) => d.name);
  const headers = ['Vorname', 'Nachname', 'E-Mail', 'Telefon', 'DSGVO', ...dimHeaders, 'Eingegangen am'];

  const rows = leads.map((l) => [
    l.firstName,
    l.lastName,
    l.email,
    l.phone ?? '',
    l.gdprConsent ? 'Ja' : 'Nein',
    ...dimensions.map((d) => String(l.scores[d.id] ?? 0)),
    formatDateTime(l.submittedAt),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${checkTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BerufsCheckLeadsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { company } = useAuth();

  const [check, setCheck] = useState<CareerCheck | null>(null);
  const [leads, setLeads] = useState<CareerCheckLead[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CareerCheckLead | null>(null);

  const load = useCallback(() => {
    const c = careerCheckStorage.getById(id);
    if (!c || c.companyId !== company?.id) { router.push('/dashboard'); return; }
    setCheck(c);
    const l = careerCheckLeadStorage.getByCheck(id);
    setLeads(l.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
  }, [id, company, router]);

  useEffect(() => { load(); }, [load]);

  if (!check) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const dims = check.dimensions;

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.firstName.toLowerCase().includes(q) ||
      l.lastName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q)
    );
  });

  // Top dimension per lead
  function topDimension(lead: CareerCheckLead): Dimension | null {
    if (dims.length === 0) return null;
    return dims.reduce((best, d) =>
      (lead.scores[d.id] ?? 0) > (lead.scores[best.id] ?? 0) ? d : best
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/dashboard"
          className="mt-1 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-0.5">Berufscheck</p>
          <h1 className="text-xl font-bold text-slate-900 truncate">{check.title}</h1>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => exportLeadsCSV(leads, dims, check.title)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex-shrink-0 shadow-sm"
          >
            <Download size={15} />
            CSV herunterladen
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
            <p className="text-sm text-slate-500">Kontakte gesamt</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {leads.length > 0 ? new Date(leads[0].submittedAt).toLocaleDateString('de-DE') : '—'}
            </p>
            <p className="text-sm text-slate-500">Letzter Eintrag</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <Mail size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{dims.length}</p>
            <p className="text-sm text-slate-500">Berufsfelder</p>
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Noch keine Kontakte</h2>
          <p className="text-slate-500 text-sm">Sobald jemand den Berufscheck abschließt, erscheinen die Kontakte hier.</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Kontakte durchsuchen (Name, E-Mail)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">E-Mail</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Telefon</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Top-Berufsfeld</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap">Eingegangen</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => {
                    const top = topDimension(lead);
                    return (
                      <tr key={lead.id}
                        className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                        onClick={() => setSelectedLead(lead)}>
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {lead.firstName} {lead.lastName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{lead.email}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{lead.phone || '—'}</td>
                        <td className="px-4 py-3">
                          {top ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                              style={{ background: top.color ?? '#7c3aed' }}>
                              {top.name}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {new Date(lead.submittedAt).toLocaleString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-violet-600 font-medium hover:underline">Details</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Keine Kontakte für &ldquo;{search}&rdquo; gefunden.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          dimensions={dims}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────────────────────
function LeadDetailModal({ lead, dimensions, onClose }: {
  lead: CareerCheckLead;
  dimensions: Dimension[];
  onClose: () => void;
}) {
  const maxScore = Math.max(...dimensions.map((d) => lead.scores[d.id] ?? 0), 1);
  const sorted = [...dimensions].sort((a, b) => (lead.scores[b.id] ?? 0) - (lead.scores[a.id] ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{lead.firstName} {lead.lastName}</h2>
              <p className="text-violet-200 text-sm mt-0.5">
                {new Date(lead.submittedAt).toLocaleString('de-DE')}
              </p>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Kontakt */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Kontaktdaten</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-violet-600 hover:underline truncate">{lead.email}</a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={14} className="text-slate-400 flex-shrink-0" />
                  <a href={`tel:${lead.phone}`} className="text-slate-700">{lead.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="text-xs">DSGVO:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lead.gdprConsent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {lead.gdprConsent ? 'Eingewilligt' : 'Nicht eingewilligt'}
                </span>
              </div>
            </div>
          </div>

          {/* Scores */}
          {dimensions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Berufsfeld-Scores</p>
              <div className="space-y-2.5">
                {sorted.map((dim) => {
                  const score = lead.scores[dim.id] ?? 0;
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
