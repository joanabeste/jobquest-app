'use client';

import { Filter } from 'lucide-react';

export type DateFilter = '7' | '30' | 'all' | 'custom';

interface Props {
  filter: DateFilter;
  onFilterChange: (f: DateFilter) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  showLabel?: boolean;
}

export function DateRangeFilter({
  filter, onFilterChange, customFrom, customTo, onCustomFromChange, onCustomToChange, showLabel,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter size={15} className="text-slate-400" />
      {showLabel && <span className="text-sm text-slate-600 mr-1">Zeitraum:</span>}
      {[
        { label: '7 Tage', value: '7' as const },
        { label: '30 Tage', value: '30' as const },
        { label: 'Gesamt', value: 'all' as const },
        { label: 'Zeitraum', value: 'custom' as const },
      ].map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onFilterChange(value)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
            filter === value
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          {label}
        </button>
      ))}
      {filter === 'custom' && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
          />
          <span className="text-slate-400 text-sm">–</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
          />
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
