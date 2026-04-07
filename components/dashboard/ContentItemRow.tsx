'use client';

import Link from 'next/link';
import { Edit2, Eye, BarChart2, Copy, Trash2, Users, Globe } from 'lucide-react';
import { formatDateShort } from '@/lib/utils';
import type { BaseContentItem, ContentTypeConfig } from '@/lib/dashboard/contentTypes';
import ShareButton from './ShareButton';

interface ContentItemRowProps<T extends BaseContentItem> {
  item: T;
  config: ContentTypeConfig<T>;
  count: number;
  canCreate: boolean;
  canDelete: boolean;
  onDuplicate: (item: T) => void;
  onAskDelete: (item: { id: string; title: string }) => void;
}

export default function ContentItemRow<T extends BaseContentItem>({
  item, config, count, canCreate, canDelete, onDuplicate, onAskDelete,
}: ContentItemRowProps<T>) {
  const editorHref = `${config.editorPathPrefix}/${item.id}`;
  const publicHref = `${config.publicPathPrefix}/${item.slug}`;
  const extraMeta = config.itemMeta?.(item) ?? [];
  const isPublished = item.status === 'published';

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
            {isPublished
              ? <span className="badge-published">Veröffentlicht</span>
              : <span className="badge-draft">Entwurf</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {count} {config.countLabel}
            </span>
            {extraMeta.map((m) => <span key={m}>{m}</span>)}
            <span>Aktualisiert {formatDateShort(item.updatedAt)}</span>
            {isPublished && (
              <span className="flex items-center gap-1 text-green-600">
                <Globe size={11} />
                {publicHref}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={editorHref}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bearbeiten">
            <Edit2 size={14} />
            <span className="hidden sm:block">Bearbeiten</span>
          </Link>
          {isPublished && (
            <>
              <Link href={publicHref} target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Vorschau">
                <Eye size={14} />
                <span className="hidden sm:block">Vorschau</span>
              </Link>
              <ShareButton path={publicHref} title={item.title} />
            </>
          )}
          {config.statsHref && (
            <Link href={config.statsHref(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Statistiken">
              <BarChart2 size={14} />
              <span className="hidden sm:block">Statistiken</span>
            </Link>
          )}
          {config.extraAction && (
            <Link href={config.extraAction.href(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={config.extraAction.title}>
              <config.extraAction.icon size={14} />
              <span className="hidden sm:block">{config.extraAction.label}</span>
            </Link>
          )}
          {canCreate && (
            <button onClick={() => onDuplicate(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Duplizieren">
              <Copy size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={() => onAskDelete({ id: item.id, title: item.title })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Löschen">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
