'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PLAN } from '@/lib/types';
import type { CompanyPlan } from '@/lib/types';
import { BarChart2, FileText, CheckSquare, ClipboardList, Mail } from 'lucide-react';

interface Usage { jobQuests: number; berufschecks: number; formulare: number }

function ProgressBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function SettingsPlanPage() {
  const { company } = useAuth();
  const [plan, setPlan] = useState<CompanyPlan>(company?.plan ?? DEFAULT_PLAN);
  const [usage, setUsage] = useState<Usage>({ jobQuests: 0, berufschecks: 0, formulare: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quota')
      .then((r) => r.json())
      .then((data) => {
        setPlan(data.plan);
        setUsage(data.usage);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = [
    { label: 'JobQuests', current: usage.jobQuests, max: plan.maxJobQuests, icon: FileText, color: '#7c3aed' },
    { label: 'Berufschecks', current: usage.berufschecks, max: plan.maxBerufschecks, icon: CheckSquare, color: '#6366f1' },
    { label: 'Formulare', current: usage.formulare, max: plan.maxFormulare, icon: ClipboardList, color: '#10b981' },
  ].filter((i) => i.max > 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
          <BarChart2 size={22} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kontingent</h1>
          <p className="text-slate-500 text-sm mt-0.5">Dein aktueller Plan und die Nutzung</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
              <div className="h-2 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map(({ label, current, max, icon: Icon, color }) => (
              <div key={label} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} style={{ color }} />
                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>
                    {current} / {max}
                  </span>
                </div>
                <ProgressBar current={current} max={max} color={color} />
                {current >= max && (
                  <p className="text-xs text-amber-600 mt-2">Kontingent erreicht</p>
                )}
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-slate-500 text-sm">Kein Kontingent konfiguriert.</p>
            </div>
          )}

          <div className="mt-8 card p-5 bg-slate-50 border-slate-200">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Kontingent anpassen?</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Kontaktiere uns, um dein Kontingent zu erweitern oder anzupassen.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
