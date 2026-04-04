'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { FunnelContentType, FunnelBlockType, BLOCK_CATALOG, getDefaultProps } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';

interface BlockLibraryProps {
  contentType: FunnelContentType;
  onInsertBlock: (type: FunnelBlockType, props: Record<string, unknown>) => void;
  onClose: () => void;
}

// Ordered category list — defines display order in the picker
const CATEGORY_ORDER = ['Inhalt', 'Interaktion', 'Eingabe', 'Medien', 'Logik', 'Abschluss'];

export default function BlockLibrary({ contentType, onInsertBlock, onClose }: BlockLibraryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  // Auto-focus search on open
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const catalog = BLOCK_CATALOG[contentType];
  const q = query.trim().toLowerCase();

  // Filter by search query
  const filtered = q
    ? catalog.filter((b) =>
        b.label.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      )
    : catalog;

  // Group by category in defined order
  const knownCats = new Set(CATEGORY_ORDER);
  const grouped = [
    ...CATEGORY_ORDER.map((cat) => ({ cat, blocks: filtered.filter((b) => b.category === cat) })).filter(({ blocks }) => blocks.length > 0),
    // Catch-all for any unlisted categories
    ...Array.from(new Set(filtered.filter((b) => !knownCats.has(b.category)).map((b) => b.category)))
      .map((cat) => ({ cat, blocks: filtered.filter((b) => b.category === cat) })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl w-full max-w-[300px] max-h-[72vh] flex flex-col overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Block suchen…"
            className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400 bg-transparent"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          ) : (
            <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Block list */}
        <div className="overflow-y-auto flex-1 pb-2">
          {grouped.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-10">
              Kein Block gefunden für &bdquo;{query}&ldquo;
            </p>
          )}

          {grouped.map(({ cat, blocks }) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1 select-none">
                {cat}
              </p>
              {blocks.map((block) => {
                const meta = BLOCK_META[block.type];
                const Icon = meta?.icon;
                return (
                  <button
                    key={block.type}
                    onClick={() => {
                      onInsertBlock(block.type, getDefaultProps(block.type));
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-violet-50 active:bg-violet-100 transition-colors text-left group"
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${meta?.bg ?? 'bg-slate-100'} group-hover:bg-violet-100`}>
                      {Icon && <Icon size={11} className={`${meta?.color ?? 'text-slate-500'} group-hover:text-violet-600`} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 group-hover:text-violet-700 leading-none">{block.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">{block.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
