'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage, leadStorage, analyticsStorage } from '@/lib/storage';
import { JobQuest, Lead, AnalyticsEvent } from '@/lib/types';
import {
  BarChart2, Eye, TrendingUp, Users, Clock, Filter, ChevronRight, LineChart,
} from 'lucide-react';

type DateFilter = '7' | '30' | 'all';

interface Kpis {
  views: number;
  starts: number;
  completions: number;
  abandonRate: number;
  conversionRate: number;
  avgDurationSec: number | null;
}

function computeKpis(events: AnalyticsEvent[]): Kpis {
  const views = events.filter((e) => e.type === 'view').length;
  const starts = events.filter((e) => e.type === 'start').length;
  const completions = events.filter((e) => e.type === 'complete').length;
  const abandonRate = starts > 0 ? Math.round(((starts - completions) / starts) * 100) : 0;
  const conversionRate = views > 0 ? Math.round((completions / views) * 100) : 0;
  const withDuration = events.filter((e) => e.type === 'complete' && e.duration);
  const avgDurationSec = withDuration.length
    ? withDuration.reduce((s, e) => s + (e.duration || 0), 0) / withDuration.length
    : null;
  return { views, starts, completions, abandonRate, conversionRate, avgDurationSec };
}

function formatDuration(sec: number | null): string {
  if (sec == null) return '–';
  const mins = Math.floor(sec / 60);
  const secs = Math.round(sec % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} Min`;
}

export default function StatistikenPage() {
  const { company } = useAuth();
  const [quests, setQuests] = useState<JobQuest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<DateFilter>('30');

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      questStorage.getByCompany(company.id),
      leadStorage.getAll(),
      analyticsStorage.getAll(),
    ])
      .then(([qs, ls, evs]) => {
        if (cancelled) return;
        setQuests(qs);
        setLeads(ls);
        setEvents(evs);
      })
      .catch((err) => {
        console.error('[statistiken] load failed', err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  const filterDate = useMemo(() => {
    const d = new Date();
    if (filter === '7') d.setDate(d.getDate() - 7);
    else if (filter === '30') d.setDate(d.getDate() - 30);
    else d.setFullYear(2000);
    return d;
  }, [filter]);

  const filteredEvents = useMemo(
    () => events.filter((e) => new Date(e.timestamp) >= filterDate),
    [events, filterDate],
  );
  const filteredLeads = useMemo(
    () => leads.filter((l) => new Date(l.submittedAt) >= filterDate),
    [leads, filterDate],
  );

  const kpis = useMemo(() => computeKpis(filteredEvents), [filteredEvents]);

  // Per-quest rows
  const questRows = useMemo(() => {
    return quests
      .map((q) => {
        const qEvents = filteredEvents.filter((e) => e.jobQuestId === q.id);
        const qLeads = filteredLeads.filter((l) => l.jobQuestId === q.id);
        const k = computeKpis(qEvents);
        return { quest: q, kpis: k, leads: qLeads.length };
      })
      .filter((r) => r.kpis.views > 0 || r.kpis.starts > 0 || r.leads > 0 || r.quest.status === 'published')
      .sort((a, b) => b.kpis.views - a.kpis.views);
  }, [quests, filteredEvents, filteredLeads]);

  const funnelMax = Math.max(kpis.views, 1);
  const funnelRows = [
    { label: 'Aufrufe', value: kpis.views, color: 'bg-blue-400' },
    { label: 'Starts', value: kpis.starts, color: 'bg-violet-500' },
    { label: 'Abschlüsse', value: kpis.completions, color: 'bg-green-500' },
    { label: 'Kontakte', value: filteredLeads.length, color: 'bg-amber-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {loadError && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <span className="flex-1">Statistiken konnten nicht geladen werden.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statistiken</h1>
          <p className="text-slate-500 text-sm mt-0.5">Aufrufe, Starts und Abschlüsse über alle JobQuests</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          {[
            { label: '7 Tage', value: '7' as const },
            { label: '30 Tage', value: '30' as const },
            { label: 'Gesamt', value: 'all' as const },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Aufrufe', value: kpis.views, icon: Eye, color: 'blue' },
          { label: 'Starts', value: kpis.starts, icon: TrendingUp, color: 'violet' },
          { label: 'Abschlüsse', value: kpis.completions, icon: BarChart2, color: 'green' },
          { label: 'Conversion', value: `${kpis.conversionRate}%`, icon: Users, color: 'rose' },
          { label: 'Ø Dauer', value: formatDuration(kpis.avgDurationSec), icon: Clock, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
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
            <p className="text-xl font-bold text-slate-900">{loading ? '–' : value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Funnel overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-8">
        <h2 className="font-semibold text-slate-900 mb-4">Funnel-Übersicht (gesamt)</h2>
        <div className="space-y-4">
          {funnelRows.map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-24 flex-shrink-0">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${color} transition-all duration-700`}
                  style={{ width: `${Math.round((value / funnelMax) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 w-10 text-right">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600">
            Ø Verweildauer: <strong>{formatDuration(kpis.avgDurationSec)}</strong>
          </span>
          <span className="ml-auto text-xs text-slate-400">Abbruchrate: {kpis.abandonRate}%</span>
        </div>
      </div>

      {/* Per-quest table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Pro JobQuest</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sortiert nach Aufrufen im gewählten Zeitraum</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Laden…</div>
        ) : questRows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <LineChart size={28} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Noch keine Daten</h3>
            <p className="text-slate-500 text-sm">Sobald deine JobQuests aufgerufen werden, erscheinen hier die Statistiken.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">JobQuest</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aufrufe</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Starts</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abschlüsse</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Conv.</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kontakte</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questRows.map(({ quest, kpis: k, leads: leadCount }) => (
                  <tr key={quest.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link href={`/jobquest/${quest.id}/stats`} className="hover:text-violet-600">
                        {quest.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className={quest.status === 'published' ? 'badge-published' : 'badge-draft'}>
                        {quest.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.views}</td>
                    <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">{k.starts}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.completions}</td>
                    <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">{k.conversionRate}%</td>
                    <td className="px-3 py-3 text-right tabular-nums">{leadCount}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/jobquest/${quest.id}/stats`}
                        className="inline-flex items-center text-slate-400 hover:text-violet-600">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
