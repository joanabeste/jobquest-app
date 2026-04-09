'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Edit2, Eye, BarChart2, Copy, Trash2, Users, MoreHorizontal, QrCode, ExternalLink } from 'lucide-react';
import { formatDateShort } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { BaseContentItem, ContentTypeConfig } from '@/lib/dashboard/contentTypes';
import ShareModal from '@/components/ShareModal';
import { getPublicUrl } from '@/lib/url';

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
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { company } = useAuth();
  const shareUrl = getPublicUrl(publicHref, company, item.useCustomDomain);

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
      {shareOpen && (
        <ShareModal
          url={shareUrl}
          title={item.title}
          logoUrl={company?.corporateDesign?.faviconUrl || company?.logo}
          onClose={() => setShareOpen(false)}
        />
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
            {isPublished
              ? <span className="badge-published">Veröffentlicht</span>
              : <span className="badge-draft">Entwurf</span>}
          </div>
          <div className="flex flex-wrap items-center text-xs text-slate-500 gap-x-2 gap-y-1">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {count} {config.countLabel}
            </span>
            {extraMeta.map((m) => (
              <span key={m} className="flex items-center gap-2"><span className="text-slate-300">·</span>{m}</span>
            ))}
            <span className="flex items-center gap-2"><span className="text-slate-300">·</span>Aktualisiert {formatDateShort(item.updatedAt)}</span>
          </div>
          {isPublished && (
            <Link href={publicHref} target="_blank"
              className="md:hidden inline-flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 hover:text-violet-700 max-w-full">
              <ExternalLink size={11} className="flex-shrink-0 opacity-60" />
              <span className="font-mono truncate">{publicHref}</span>
            </Link>
          )}
        </div>
        {isPublished && (
          <Link href={publicHref} target="_blank"
            className="group hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-500 hover:text-violet-700 hover:bg-slate-50 max-w-[280px] flex-shrink min-w-0"
            title={publicHref}>
            <ExternalLink size={11} className="flex-shrink-0 opacity-60 group-hover:opacity-100" />
            <span className="font-mono truncate">{publicHref}</span>
          </Link>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={editorHref}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            title="Bearbeiten">
            <Edit2 size={13} className="text-slate-500" />
            <span className="hidden sm:block">Bearbeiten</span>
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center justify-center p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Weitere Aktionen"
              aria-label="Weitere Aktionen"
              aria-haspopup="menu"
              aria-expanded={menuOpen}>
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1.5 overflow-hidden">
                {isPublished && (
                  <>
                    <Link href={publicHref} target="_blank" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <Eye size={15} className="text-slate-400" /> Vorschau
                    </Link>
                    <button onClick={() => { setMenuOpen(false); setShareOpen(true); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <QrCode size={15} className="text-slate-400" /> Teilen &amp; QR-Code
                    </button>
                  </>
                )}
                {config.statsHref && (
                  <Link href={config.statsHref(item)} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <BarChart2 size={15} className="text-slate-400" /> Statistiken
                  </Link>
                )}
                {config.extraAction && (
                  <Link href={config.extraAction.href(item)} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <config.extraAction.icon size={15} className="text-slate-400" /> {config.extraAction.label}
                  </Link>
                )}
                {canCreate && (
                  <button onClick={() => { setMenuOpen(false); onDuplicate(item); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Copy size={15} className="text-slate-400" /> Duplizieren
                  </button>
                )}
                {canDelete && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button onClick={() => { setMenuOpen(false); onAskDelete({ id: item.id, title: item.title }); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={15} /> Löschen
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
