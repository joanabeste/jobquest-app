'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Edit2, Eye, BarChart2, Copy, Trash2, Users, MoreHorizontal } from 'lucide-react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

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
          </div>
          {isPublished && (
            <Link href={publicHref} target="_blank"
              className="inline-flex items-center gap-1 mt-1 text-xs text-green-600 hover:text-green-700 hover:underline truncate max-w-full">
              {publicHref}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={editorHref}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
            title="Bearbeiten">
            <Edit2 size={14} />
            <span className="hidden sm:block">Bearbeiten</span>
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Weitere Aktionen">
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                {isPublished && (
                  <>
                    <Link href={publicHref} target="_blank" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                      <Eye size={14} /> Vorschau
                    </Link>
                    <div onClick={() => setMenuOpen(false)}>
                      <ShareButton path={publicHref} title={item.title} />
                    </div>
                  </>
                )}
                {config.statsHref && (
                  <Link href={config.statsHref(item)} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <BarChart2 size={14} /> Statistiken
                  </Link>
                )}
                {config.extraAction && (
                  <Link href={config.extraAction.href(item)} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <config.extraAction.icon size={14} /> {config.extraAction.label}
                  </Link>
                )}
                {canCreate && (
                  <button onClick={() => { setMenuOpen(false); onDuplicate(item); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <Copy size={14} /> Duplizieren
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => { setMenuOpen(false); onAskDelete({ id: item.id, title: item.title }); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Löschen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
