'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FunnelContentType, FunnelBlockType, BLOCK_CATALOG, DEFAULT_BLOCK_PROPS } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';


interface BlockLibraryProps {
  contentType: FunnelContentType;
  onInsertBlock: (type: FunnelBlockType, props: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function BlockLibrary({ contentType, onInsertBlock, onClose }: BlockLibraryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const catalog = BLOCK_CATALOG[contentType];
  const categories = Array.from(new Set(catalog.map((b) => b.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div ref={ref} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Block hinzufügen</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {categories.map((cat) => {
            const blocks = catalog.filter((b) => b.category === cat);
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-2 gap-2">
                  {blocks.map((block) => {
                    const meta = BLOCK_META[block.type];
                    const Icon = meta?.icon;
                    return (
                      <button
                        key={block.type}
                        onClick={() => onInsertBlock(block.type, { ...DEFAULT_BLOCK_PROPS[block.type] })}
                        className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 transition-colors text-left group"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${meta?.bg ?? 'bg-slate-100'} group-hover:bg-violet-100`}>
                          {Icon && <Icon size={14} className={`${meta?.color ?? 'text-slate-500'} group-hover:text-violet-600`} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">{block.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{block.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
