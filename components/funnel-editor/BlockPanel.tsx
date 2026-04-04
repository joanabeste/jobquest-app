'use client';

import { FunnelBlockType, FunnelContentType, BLOCK_CATALOG, getDefaultProps } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';

interface BlockPanelProps {
  contentType: FunnelContentType;
  onInsertBlock: (type: FunnelBlockType, props: Record<string, unknown>) => void;
}

export default function BlockPanel({ contentType, onInsertBlock }: BlockPanelProps) {
  const catalog = BLOCK_CATALOG[contentType];
  const categories = Array.from(new Set(catalog.map((b) => b.category)));

  return (
    <aside className="w-44 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Blöcke</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 py-2 scrollbar-thin">
        {/* Block types by category */}
        {categories.map((cat) => {
          const blocks = catalog.filter((b) => b.category === cat);
          return (
            <div key={cat} className="px-2 mt-3">
              <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider px-1 mb-1">{cat}</p>
              {blocks.map((block) => {
                const meta = BLOCK_META[block.type];
                const Icon = meta?.icon;
                return (
                  <button
                    key={block.type}
                    onClick={() => onInsertBlock(block.type, getDefaultProps(block.type))}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-violet-50 transition-colors text-left group mb-0.5"
                    title={block.description}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${meta?.bg ?? 'bg-slate-100'}`}>
                      {Icon && <Icon size={11} className={meta?.color ?? 'text-slate-500'} />}
                    </div>
                    <span className="text-xs text-slate-600 group-hover:text-violet-700 font-medium truncate">{block.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
