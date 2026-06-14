'use client';

import { MessageSquare } from 'lucide-react';

interface ReviewPinProps {
  openCount: number;
  resolvedCount: number;
  isActive: boolean;
  onClick: () => void;
}

export default function ReviewPin({ openCount, resolvedCount, isActive, onClick }: ReviewPinProps) {
  const total = openCount + resolvedCount;
  if (total === 0) {
    return null;
  }
  const onlyResolved = openCount === 0;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1 px-1.5 py-1 rounded-full shadow-sm border transition-all ${
        isActive
          ? 'bg-ci text-ci-on border-ci'
          : onlyResolved
          ? 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
          : 'bg-white text-ci-ink border-ci hover:bg-ci-soft'
      }`}
      title={`${openCount} offen, ${resolvedCount} erledigt`}
    >
      <MessageSquare size={11} />
      <span className="text-[10px] font-bold leading-none">
        {onlyResolved ? resolvedCount : openCount}
      </span>
    </button>
  );
}
