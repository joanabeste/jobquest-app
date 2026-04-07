'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { questStorage, leadStorage, analyticsStorage } from "@/lib/storage";
import { JobQuest, Lead, AnalyticsEvent } from '@/lib/types';
import { formatDateShort, exportLeadsAsCSV } from "@/lib/utils";
import {
  BarChart2, Users, Eye, TrendingUp, Clock, Download,
  ArrowLeft, Globe, Calendar, Filter,
} from 'lucide-react';

type DateFilter = '7' | '30' | 'all';

export default function StatsPage() {
  const { slug: id } = useParams<{ slug: string }>();
  const router = useRouter();
  const [quest, setQuest] = useState<JobQuest | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [filter, setFilter] = useState<DateFilter>('30');
  const [notAuthorized, setNotAuthorized] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch current session from auth API
      let companyId: string | null = null;
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          companyId = data.company?.id ?? null;
        }
      } catch { /* ignore */ }
      if (!companyId) {
        router.replace('/login');
        return;
      }
      const found = await questStorage.getById(id);
      if (!found || found.companyId !== companyId) {
        setNotAuthorized(true);
        return;
      }
      setQuest(found);
      setLeads(await leadStorage.getByQuest(id));
      setEvents(await analyticsStorage.getByQuest(id));
    }
    load();
  }, [id, router]);

  function getFilterDate(): Date {
    const d = new Date();
    if (filter === '7') d.setDate(d.getDate() - 7);
    else if (filter === '30') d.setDate(d.getDate() - 30);
    else d.setFullYear(2000);
    return d;
  }

  const filterDate = getFilterDate();
  const filteredEvents = events.filter((e) => new Date(e.timestamp) >= filterDate);
  const filteredLeads = leads.filter((l) => new Date(l.submittedAt) >= filterDate);

  const views = filteredEvents.filter((e) => e.type === 'view').length;
  const starts = filteredEvents.filter((e) => e.type === 'start').length;
  const completions = filteredEvents.filter((e) => e.type === 'complete').length;
  const abandonRate = starts > 0 ? Math.round(((starts - completions) / starts) * 100) : 0;
  const conversionRate = views > 0 ? Math.round((completions / views) * 100) : 0;
  const avgDuration = (() => {
    const withDuration = filteredEvents.filter((e) => e.type === 'complete' && e.duration);
    if (!withDuration.length) return null;
    const avg = withDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / withDuration.length;
    const mins = Math.floor(avg / 60);
    const secs = Math.round(avg % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} Min`;
  })();

  if (notAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-slate-600">Du hast keinen Zugriff auf diese Statistiken.</p>
        <Link href="/dashboard" className="btn-primary">Zum Dashboard</Link>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Laden…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900">{quest.title}</h1>
            <p className="text-xs text-slate-500">Statistiken & Kontakte</p>
          </div>
          {quest.status === 'published' && (
            <Link href={`/jobquest/${quest.slug}`} target="_blank" className="btn-secondary text-xs py-1.5">
              <Globe size={13} className="text-green-600" />
              Quest öffnen
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Zeitfilter */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <span className="text-sm text-slate-600 mr-1">Zeitraum:</span>
          {[
            { label: '7 Tage', value: '7' },
            { label: '30 Tage', value: '30' },
            { label: 'Gesamt', value: 'all' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value as DateFilter)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                filter === value
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Aufrufe', value: views, icon: Eye, color: 'blue' },
            { label: 'Starts', value: starts, icon: TrendingUp, color: 'violet' },
            { label: 'Abschlüsse', value: completions, icon: BarChart2, color: 'green' },
            { label: 'Abbruchrate', value: `${abandonRate}%`, icon: Calendar, color: 'amber' },
            { label: 'Conversion', value: `${conversionRate}%`, icon: Users, color: 'rose' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                color === 'blue' ? 'bg-blue-100' :
                color === 'violet' ? 'bg-violet-100' :
                color === 'green' ? 'bg-green-100' :
                color === 'amber' ? 'bg-amber-100' : 'bg-rose-100'
              }`}>
                <Icon size={16} className={
                  color === 'blue' ? 'text-blue-600' :
                  color === 'violet' ? 'text-violet-600' :
                  color === 'green' ? 'text-green-600' :
                  color === 'amber' ? 'text-amber-600' : 'text-rose-600'
                } />
              </div>
              <p className="text-xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Funnel-Übersicht</h2>
          <div className="space-y-4">
            {[
              { label: 'Aufrufe', value: views, max: Math.max(views, 1), color: 'bg-blue-400' },
              { label: 'Starts', value: starts, max: Math.max(views, 1), color: 'bg-violet-500' },
              { label: 'Abschlüsse', value: completions, max: Math.max(views, 1), color: 'bg-green-500' },
              { label: 'Kontakte', value: filteredLeads.length, max: Math.max(views, 1), color: 'bg-amber-400' },
            ].map(({ label, value, max, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-20 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-8 text-right">{value}</span>
              </div>
            ))}
          </div>
          {avgDuration && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600">Ø Verweildauer: <strong>{avgDuration}</strong></span>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900">Kontakte</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredLeads.length} Kontakte im gewählten Zeitraum</p>
            </div>
            {filteredLeads.length > 0 && (
              <button
                onClick={() => exportLeadsAsCSV(filteredLeads)}
                className="btn-secondary text-xs py-1.5"
              >
                <Download size={13} />
                CSV Export
              </button>
            )}
          </div>

          {filteredLeads.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              Noch keine Kontakte in diesem Zeitraum.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">E-Mail</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Telefon</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <a href={`mailto:${lead.email}`} className="hover:text-violet-600 transition-colors">
                          {lead.email}
                        </a>
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                        {lead.phone || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {formatDateShort(lead.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quest Info */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Quest-Informationen</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Status</p>
              <span className={quest.status === 'published' ? 'badge-published' : 'badge-draft'}>
                {quest.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Module</p>
              <p className="font-medium text-slate-900">{quest.modules.length}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Erstellt am</p>
              <p className="font-medium text-slate-900">{formatDateShort(quest.createdAt)}</p>
            </div>
            {quest.publishedAt && (
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Veröffentlicht am</p>
                <p className="font-medium text-slate-900">{formatDateShort(quest.publishedAt)}</p>
              </div>
            )}
            {quest.status === 'published' && (
              <div className="col-span-2">
                <p className="text-slate-500 text-xs mb-0.5">Öffentliche URL</p>
                <p className="font-mono text-xs text-violet-600 break-all">/jobquest/{quest.slug}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
