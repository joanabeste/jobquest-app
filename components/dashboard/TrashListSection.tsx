'use client';

import { useMemo, useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  questConfig, checkConfig, formConfig,
  type BaseContentItem, type ContentTypeConfig,
} from '@/lib/dashboard/contentTypes';
import { useTrashList } from '@/hooks/useTrashList';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { ListItemSkeleton } from '@/components/ui/Skeleton';
import { invalidateContentList } from '@/hooks/useContentList';

const RETENTION_DAYS = 30;

interface Props {
  /** Whether the trash tab is active. Hooks stay idle while false. */
  active: boolean;
}

interface TrashRow {
  configKey: string;
  configLabel: string;
  configIcon: ContentTypeConfig<BaseContentItem>['icon'];
  configColor: ContentTypeConfig<BaseContentItem>['color'];
  item: BaseContentItem;
  daysLeft: number;
  deletedAtLabel: string;
}

export default function TrashListSection({ active }: Props) {
  // Three explicit hooks — one per content type — to satisfy hooks rules and
  // keep the Active-list cache invalidation tied to the right cacheKey.
  const questTrash = useTrashList<BaseContentItem>({
    storage: questConfig.storage,
    enabled: active,
    onChange: () => invalidateContentList(questConfig.cacheKey),
  });
  const checkTrash = useTrashList<BaseContentItem>({
    storage: checkConfig.storage,
    enabled: active,
    onChange: () => invalidateContentList(checkConfig.cacheKey),
  });
  const formTrash = useTrashList<BaseContentItem>({
    storage: formConfig.storage,
    enabled: active,
    onChange: () => invalidateContentList(formConfig.cacheKey),
  });

  // Each entry's storage type differs (JobQuest / CareerCheck / FormPage), but
  // the trash UI only reads the metadata fields shared via BaseContentItem.
  // Cast through `unknown` to keep the union list ergonomic.
  const lists = useMemo(() => ([
    { cfg: questConfig as unknown as ContentTypeConfig<BaseContentItem>, list: questTrash },
    { cfg: checkConfig as unknown as ContentTypeConfig<BaseContentItem>, list: checkTrash },
    { cfg: formConfig as unknown as ContentTypeConfig<BaseContentItem>, list: formTrash },
  ]), [questTrash, checkTrash, formTrash]);

  const [pendingPermanent, setPendingPermanent] = useState<{
    configKey: string; id: string; title: string;
  } | null>(null);

  const rows: TrashRow[] = useMemo(() => {
    const out: TrashRow[] = [];
    for (const { cfg, list } of lists) {
      for (const item of list.items) {
        if (!item.deletedAt) continue;
        const deleted = new Date(item.deletedAt).getTime();
        const ageMs = Date.now() - deleted;
        const daysLeft = Math.max(0, RETENTION_DAYS - Math.floor(ageMs / (24 * 60 * 60 * 1000)));
        out.push({
          configKey: cfg.key,
          configLabel: cfg.label,
          configIcon: cfg.icon,
          configColor: cfg.color,
          item,
          daysLeft,
          deletedAtLabel: relativeDate(deleted),
        });
      }
    }
    out.sort((a, b) => (b.item.deletedAt ?? '').localeCompare(a.item.deletedAt ?? ''));
    return out;
  }, [lists]);

  const loading = lists.some(({ list }) => list.loading);

  if (!active) return null;

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Trash2 size={32} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium text-slate-700">Papierkorb ist leer</p>
        <p className="text-sm mt-1">Gelöschte Inhalte werden hier 30 Tage aufbewahrt, bevor sie endgültig entfernt werden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2 text-xs text-amber-900">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <p>Inhalte im Papierkorb werden nach 30 Tagen automatisch und unwiderruflich gelöscht. Wiederhergestellte Inhalte zählen wieder gegen dein Kontingent.</p>
      </div>

      {rows.map((row) => {
        const entry = lists.find(({ cfg }) => cfg.key === row.configKey);
        return (
          <TrashRowCard
            key={`${row.configKey}:${row.item.id}`}
            row={row}
            onRestore={() => entry?.list.restore(row.item.id)}
            onAskPermanent={() => setPendingPermanent({
              configKey: row.configKey,
              id: row.item.id,
              title: row.item.title,
            })}
          />
        );
      })}

      {pendingPermanent && (
        <ConfirmModal
          title="Endgültig löschen?"
          description={
            <>
              <span className="font-medium">&ldquo;{pendingPermanent.title}&rdquo;</span> wird sofort und unwiderruflich gelöscht. Alle zugehörigen Kontakte werden ebenfalls entfernt.
            </>
          }
          onConfirm={() => {
            const entry = lists.find(({ cfg }) => cfg.key === pendingPermanent.configKey);
            void entry?.list.permanentDelete(pendingPermanent.id);
            setPendingPermanent(null);
          }}
          onCancel={() => setPendingPermanent(null)}
        />
      )}
    </div>
  );
}

function TrashRowCard({ row, onRestore, onAskPermanent }: {
  row: TrashRow;
  onRestore: () => void;
  onAskPermanent: () => void;
}) {
  const Icon = row.configIcon;
  const colorClass = row.configColor === 'violet' ? 'text-violet-600 bg-violet-50'
    : row.configColor === 'indigo' ? 'text-indigo-600 bg-indigo-50'
    : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h3 className="font-semibold text-slate-900 truncate">{row.item.title}</h3>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">
            {row.configLabel}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Gelöscht {row.deletedAtLabel} ·{' '}
          <span className={row.daysLeft <= 3 ? 'text-amber-700 font-medium' : 'text-slate-500'}>
            wird in {row.daysLeft} {row.daysLeft === 1 ? 'Tag' : 'Tagen'} endgültig entfernt
          </span>
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          title="Wiederherstellen"
        >
          <RotateCcw size={14} /> Wiederherstellen
        </button>
        <button
          onClick={onAskPermanent}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
          title="Endgültig löschen"
        >
          <Trash2 size={14} /> Endgültig
        </button>
      </div>
    </div>
  );
}

function relativeDate(ts: number): string {
  const diffSec = Math.round((Date.now() - ts) / 1000);
  const min = Math.floor(diffSec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  if (day >= 1) return day === 1 ? 'gestern' : `vor ${day} Tagen`;
  if (hour >= 1) return hour === 1 ? 'vor 1 Stunde' : `vor ${hour} Stunden`;
  if (min >= 1) return min === 1 ? 'vor 1 Minute' : `vor ${min} Minuten`;
  return 'gerade eben';
}
