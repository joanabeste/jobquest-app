'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';

export type DateFilter = '7' | '30' | 'all' | 'custom';

interface Props {
  filter: DateFilter;
  onFilterChange: (f: DateFilter) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  /** unused, kept for backwards compat */
  showLabel?: boolean;
}

const PRESETS: { label: string; value: DateFilter }[] = [
  { label: 'Letzte 7 Tage', value: '7' },
  { label: 'Letzte 30 Tage', value: '30' },
  { label: 'Gesamter Zeitraum', value: 'all' },
];

function formatDe(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function currentLabel(filter: DateFilter, customFrom: string, customTo: string): string {
  if (filter === 'custom') return `${formatDe(customFrom)} – ${formatDe(customTo)}`;
  return PRESETS.find((p) => p.value === filter)?.label ?? '';
}

export function DateRangeFilter({
  filter, onFilterChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 transition-colors"
      >
        <CalendarDays size={15} className="text-slate-400" />
        <span className="font-medium">{currentLabel(filter, customFrom, customTo)}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
          <ul className="py-1">
            {PRESETS.map(({ label, value }) => (
              <li key={value}>
                <button
                  type="button"
                  onClick={() => { onFilterChange(value); setOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>{label}</span>
                  {filter === value && <Check size={14} className="text-violet-600" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Eigener Zeitraum</span>
              {filter === 'custom' && <Check size={14} className="text-violet-600" />}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => { onCustomFromChange(e.target.value); onFilterChange('custom'); }}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
              />
              <span className="text-slate-400 text-sm">–</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => { onCustomToChange(e.target.value); onFilterChange('custom'); }}
                className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function computeRange(
  filter: DateFilter,
  customFrom: string,
  customTo: string,
): [Date, Date] {
  const now = new Date();
  if (filter === 'custom') {
    const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
    const t = new Date(customTo); t.setHours(23, 59, 59, 999);
    return [f, t];
  }
  const f = new Date();
  if (filter === '7') f.setDate(f.getDate() - 7);
  else if (filter === '30') f.setDate(f.getDate() - 30);
  else f.setFullYear(2000);
  return [f, now];
}

export function defaultCustomFrom(): string {
  const d = new Date(); d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export function defaultCustomTo(): string {
  return new Date().toISOString().slice(0, 10);
}
