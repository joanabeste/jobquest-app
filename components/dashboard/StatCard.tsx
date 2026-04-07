'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ContentColor } from '@/lib/dashboard/contentTypes';

const BG: Record<StatColor, string> = {
  violet: 'bg-violet-100',
  indigo: 'bg-indigo-100',
  emerald: 'bg-emerald-100',
  blue: 'bg-blue-100',
};
const FG: Record<StatColor, string> = {
  violet: 'text-violet-600',
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
};

export type StatColor = ContentColor | 'blue';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: StatColor;
  /** If set, the card becomes a button calling onClick (used for tab switching). */
  onClick?: () => void;
  /** If set, the card becomes a Link to this href. Ignored when onClick is set. */
  href?: string;
}

export default function StatCard({ label, value, icon: Icon, color, onClick, href }: StatCardProps) {
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${BG[color]}`}>
        <Icon size={20} className={FG[color]} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick}
        className="card p-5 flex items-center gap-4 text-left hover:shadow-md transition-shadow cursor-pointer w-full">
        {inner}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
        {inner}
      </Link>
    );
  }
  return <div className="card p-5 flex items-center gap-4">{inner}</div>;
}
