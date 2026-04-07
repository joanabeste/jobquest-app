'use client';

interface TabButtonProps {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}

export default function TabButton({ label, active, badge, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-violet-600 text-violet-600'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}
