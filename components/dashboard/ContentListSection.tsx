'use client';

import { Plus } from 'lucide-react';
import type { BaseContentItem, ContentTypeConfig } from '@/lib/dashboard/contentTypes';
import ContentItemRow from './ContentItemRow';

const EMPTY_BG: Record<string, string> = {
  violet: 'bg-violet-50',
  indigo: 'bg-indigo-50',
  emerald: 'bg-emerald-50',
};
const EMPTY_FG: Record<string, string> = {
  violet: 'text-violet-400',
  indigo: 'text-indigo-400',
  emerald: 'text-emerald-400',
};

interface ContentListSectionProps<T extends BaseContentItem> {
  config: ContentTypeConfig<T>;
  filtered: T[];
  total: number;
  counts: Record<string, number>;
  search: string;
  canCreate: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onDuplicate: (item: T) => void;
  onAskDelete: (item: { id: string; title: string }) => void;
}

export default function ContentListSection<T extends BaseContentItem>({
  config, filtered, total, counts, search,
  canCreate, canDelete, onCreate, onDuplicate, onAskDelete,
}: ContentListSectionProps<T>) {
  if (filtered.length === 0) {
    return (
      <div className="card p-16 text-center">
        {total === 0 ? (
          <>
            <div className={`w-16 h-16 rounded-2xl ${EMPTY_BG[config.color]} flex items-center justify-center mx-auto mb-4`}>
              <config.icon size={28} className={EMPTY_FG[config.color]} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{config.emptyTitle}</h2>
            <p className="text-slate-500 text-sm mb-6">{config.emptyText}</p>
            {canCreate && (
              <button onClick={onCreate} className="btn-primary mx-auto">
                <Plus size={16} />
                {config.emptyCreateLabel}
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-500">Keine {config.label} für &ldquo;{search}&rdquo; gefunden.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((item) => (
        <ContentItemRow
          key={item.id}
          item={item}
          config={config}
          count={counts[item.id] || 0}
          canCreate={canCreate}
          canDelete={canDelete}
          onDuplicate={onDuplicate}
          onAskDelete={onAskDelete}
        />
      ))}
    </div>
  );
}
