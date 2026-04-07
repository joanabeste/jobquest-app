'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage, leadStorage, analyticsStorage, careerCheckStorage, careerCheckLeadStorage, formPageStorage, formSubmissionStorage } from '@/lib/storage';
import { JobQuest, Lead, AnalyticsEvent, CareerCheck, CareerCheckLead, FormPage, FormSubmission } from '@/lib/types';
import {
  BarChart2, Eye, TrendingUp, Users, Clock, ChevronRight, LineChart,
} from 'lucide-react';
import { DateRangeFilter, computeRange, defaultCustomFrom, defaultCustomTo, type DateFilter } from '@/components/stats/DateRangeFilter';

interface Kpis {
  views: number;
  starts: number;
  completions: number;
  abandonRate: number;
  avgDurationSec: number | null;
}

function computeKpis(events: AnalyticsEvent[]): Kpis {
  // Aufrufe = unique sessions (a session can produce multiple 'view' heartbeats)
  const viewSessions = new Set<string>();
  for (const e of events) if (e.type === 'view') viewSessions.add(e.sessionId);
  const views = viewSessions.size;
  const starts = events.filter((e) => e.type === 'start').length;
  const completions = events.filter((e) => e.type === 'complete').length;
  const abandonRate = starts > 0 ? Math.round(((starts - completions) / starts) * 100) : 0;
  // Average of longest dwell time per session.
  const maxBySession = new Map<string, number>();
  for (const e of events) {
    if (!e.duration || !e.sessionId) continue;
    const cur = maxBySession.get(e.sessionId) ?? 0;
    if (e.duration > cur) maxBySession.set(e.sessionId, e.duration);
  }
  const avgDurationSec = maxBySession.size
    ? Array.from(maxBySession.values()).reduce((s, v) => s + v, 0) / maxBySession.size
    : null;
  return { views, starts, completions, abandonRate, avgDurationSec };
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
  const [checks, setChecks] = useState<CareerCheck[]>([]);
  const [forms, setForms] = useState<FormPage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [checkLeads, setCheckLeads] = useState<CareerCheckLead[]>([]);
  const [formSubs, setFormSubs] = useState<FormSubmission[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<DateFilter>('30');
  const [customFrom, setCustomFrom] = useState<string>(defaultCustomFrom);
  const [customTo, setCustomTo] = useState<string>(defaultCustomTo);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      questStorage.getByCompany(company.id),
      careerCheckStorage.getByCompany(company.id),
      formPageStorage.getByCompany(company.id),
      leadStorage.getAll(),
      careerCheckLeadStorage.getAll(),
      formSubmissionStorage.getAll(),
      analyticsStorage.getAll(),
    ])
      .then(([qs, cs, fs, ls, cls, fss, evs]) => {
        if (cancelled) return;
        setQuests(qs);
        setChecks(cs);
        setForms(fs);
        setLeads(ls);
        setCheckLeads(cls);
        setFormSubs(fss);
        setEvents(evs);
      })
      .catch((err) => {
        console.error('[statistiken] load failed', err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  const [fromDate, toDate] = useMemo<[Date, Date]>(
    () => computeRange(filter, customFrom, customTo),
    [filter, customFrom, customTo],
  );

  const inRange = (iso: string) => {
    const d = new Date(iso).getTime();
    return d >= fromDate.getTime() && d <= toDate.getTime();
  };

  const filteredEvents = useMemo(
    () => events.filter((e) => inRange(e.timestamp)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, fromDate, toDate],
  );
  const filteredLeads = useMemo(
    () => leads.filter((l) => inRange(l.submittedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, fromDate, toDate],
  );
  const filteredCheckLeads = useMemo(
    () => checkLeads.filter((l) => inRange(l.submittedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkLeads, fromDate, toDate],
  );
  const filteredFormSubs = useMemo(
    () => formSubs.filter((s) => inRange(s.submittedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formSubs, fromDate, toDate],
  );

  const kpis = useMemo(() => computeKpis(filteredEvents), [filteredEvents]);
  const totalLeadCount = filteredLeads.length + filteredCheckLeads.length + filteredFormSubs.length;

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

  // Per-check rows
  const checkRows = useMemo(() => {
    return checks
      .map((c) => {
        const cEvents = filteredEvents.filter((e) => e.careerCheckId === c.id);
        const cLeads = filteredCheckLeads.filter((l) => l.careerCheckId === c.id);
        const k = computeKpis(cEvents);
        return { check: c, kpis: k, leads: cLeads.length };
      })
      .filter((r) => r.kpis.views > 0 || r.kpis.starts > 0 || r.leads > 0 || r.check.status === 'published')
      .sort((a, b) => b.kpis.views - a.kpis.views);
  }, [checks, filteredEvents, filteredCheckLeads]);

  // Per-form rows
  const formRows = useMemo(() => {
    return forms
      .map((f) => {
        const fEvents = filteredEvents.filter((e) => e.formPageId === f.id);
        const fSubs = filteredFormSubs.filter((s) => s.formPageId === f.id);
        const k = computeKpis(fEvents);
        return { form: f, kpis: k, leads: fSubs.length };
      })
      .filter((r) => r.kpis.views > 0 || r.kpis.starts > 0 || r.leads > 0 || r.form.status === 'published')
      .sort((a, b) => b.kpis.views - a.kpis.views);
  }, [forms, filteredEvents, filteredFormSubs]);

  const funnelMax = Math.max(kpis.views, 1);
  const funnelRows = [
    { label: 'Aufrufe', value: kpis.views, color: 'bg-blue-400' },
    { label: 'Starts', value: kpis.starts, color: 'bg-violet-500' },
    { label: 'Abschlüsse', value: kpis.completions, color: 'bg-green-500' },
    { label: 'Kontakte', value: totalLeadCount, color: 'bg-amber-400' },
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
          <p className="text-slate-500 text-sm mt-0.5">Aufrufe, Starts und Abschlüsse über deine Inhalte</p>
        </div>
        <DateRangeFilter
          filter={filter}
          onFilterChange={setFilter}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Aufrufe', value: kpis.views, icon: Eye, color: 'blue' },
          { label: 'Starts', value: kpis.starts, icon: TrendingUp, color: 'violet' },
          { label: 'Abschlüsse', value: kpis.completions, icon: BarChart2, color: 'green' },
          { label: 'Kontakte', value: totalLeadCount, icon: Users, color: 'rose' },
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

      {/* Empty state when there is no content at all */}
      {!loading && quests.length === 0 && checks.length === 0 && forms.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <LineChart size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Noch keine Inhalte</h3>
          <p className="text-slate-500 text-sm">Sobald du JobQuests, Berufschecks oder Formulare anlegst, erscheinen hier die Statistiken.</p>
        </div>
      )}

      {/* Per-quest table */}
      {quests.length > 0 && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Pro JobQuest</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sortiert nach Aufrufen im gewählten Zeitraum</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Laden…</div>
        ) : questRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <LineChart size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Noch keine Daten für JobQuests.</p>
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
      )}

      {/* Per-check table */}
      {checks.length > 0 && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Pro Berufscheck</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sortiert nach Aufrufen im gewählten Zeitraum</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Laden…</div>
        ) : checkRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <LineChart size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Noch keine Daten für Berufschecks.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Berufscheck</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aufrufe</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Starts</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abschlüsse</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kontakte</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkRows.map(({ check, kpis: k, leads: leadCount }) => (
                  <tr key={check.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link href={`/berufscheck/${check.id}/stats`} className="hover:text-violet-600">
                        {check.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className={check.status === 'published' ? 'badge-published' : 'badge-draft'}>
                        {check.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.views}</td>
                    <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">{k.starts}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.completions}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{leadCount}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/berufscheck/${check.id}/stats`}
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
      )}

      {/* Per-form table */}
      {forms.length > 0 && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Pro Formular</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sortiert nach Aufrufen im gewählten Zeitraum</p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Laden…</div>
        ) : formRows.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <LineChart size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 text-sm">Noch keine Daten für Formulare.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Formular</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aufrufe</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Starts</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Abschlüsse</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Einreichungen</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formRows.map(({ form, kpis: k, leads: leadCount }) => (
                  <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link href={`/formular/${form.id}/stats`} className="hover:text-violet-600">
                        {form.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <span className={form.status === 'published' ? 'badge-published' : 'badge-draft'}>
                        {form.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.views}</td>
                    <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">{k.starts}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{k.completions}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{leadCount}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/formular/${form.id}/stats`}
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
      )}
    </div>
  );
}
