'use client';

import { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Copy, Plus } from 'lucide-react';
import { CareerCheck, BerufsCheckBlock, BerufsCheckBlockType, BLOCK_LABELS, Dimension, DIMENSION_COLORS } from '@/lib/types';

const BLOCK_COLORS: Record<BerufsCheckBlockType, string> = {
  intro:              'bg-violet-100 text-violet-700',
  vorname:            'bg-blue-100   text-blue-700',
  selbsteinschaetzung:'bg-cyan-100   text-cyan-700',
  frage:              'bg-amber-100  text-amber-700',
  ergebnisfrage:      'bg-orange-100 text-orange-700',
  text:               'bg-slate-200  text-slate-600',
  lead:               'bg-green-100  text-green-700',
  ergebnis:           'bg-pink-100   text-pink-700',
  button:             'bg-slate-100  text-slate-700',
};

// ── Blocks Panel ──────────────────────────────────────────────────────────────
export function BlocksPanel({
  check, selectedBlockId, onSelect, onAdd, onDelete, onMove, onDuplicate,
}: {
  check: CareerCheck;
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BerufsCheckBlockType) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDuplicate: (id: string) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {check.blocks.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-xs text-slate-400">Noch keine Blöcke.</p>
            <p className="text-xs text-slate-400 mt-1">Füge deinen ersten Block hinzu.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {check.blocks.map((block, idx) => (
              <BlockListItem
                key={block.id}
                block={block}
                idx={idx}
                total={check.blocks.length}
                selected={block.id === selectedBlockId}
                onSelect={() => onSelect(block.id)}
                onDelete={() => onDelete(block.id)}
                onMoveUp={() => onMove(block.id, -1)}
                onMoveDown={() => onMove(block.id, 1)}
                onDuplicate={() => onDuplicate(block.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-100 relative">
        <button
          onClick={() => setShowAddMenu((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <Plus size={14} /> Block hinzufügen
        </button>
        {showAddMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-20">
            {(Object.keys(BLOCK_LABELS) as BerufsCheckBlockType[]).map((type) => (
              <button
                key={type}
                onClick={() => { onAdd(type); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BLOCK_COLORS[type]}`}>
                  {BLOCK_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockListItem({
  block, idx, total, selected, onSelect, onDelete, onMoveUp, onMoveDown, onDuplicate,
}: {
  block: BerufsCheckBlock; idx: number; total: number; selected: boolean;
  onSelect: () => void; onDelete: () => void; onMoveUp: () => void;
  onMoveDown: () => void; onDuplicate: () => void;
}) {
  function getLabel() {
    switch (block.type) {
      case 'intro':              return block.headline || 'Intro';
      case 'vorname':            return block.question || 'Vorname';
      case 'selbsteinschaetzung':return block.question || 'Selbsteinschätzung';
      case 'frage':              return block.question || 'Frage';
      case 'ergebnisfrage':      return block.question || 'Ergebnisfrage';
      case 'text':               return block.headline || block.content.slice(0, 30) || 'Text';
      case 'lead':               return block.headline || 'Kontaktformular';
      case 'ergebnis':           return 'Ergebnis';
      case 'button':             return block.text || 'Button';
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`group rounded-lg border cursor-pointer transition-all ${
        selected ? 'border-violet-300 bg-violet-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BLOCK_COLORS[block.type]}`}>
              {BLOCK_LABELS[block.type]}
            </span>
          </div>
          <p className="text-xs text-slate-700 truncate">{getLabel()}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={idx === 0}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <ChevronUp size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={idx === total - 1}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <ChevronDown size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-0.5 rounded hover:bg-slate-200 transition-colors">
            <Copy size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-red-100 transition-colors">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dimensions Panel ──────────────────────────────────────────────────────────
export function DimensionsPanel({ dimensions, onChange }: {
  dimensions: Dimension[];
  onChange: (dims: Dimension[]) => void;
}) {
  function addDimension() {
    const colorIdx = dimensions.length % DIMENSION_COLORS.length;
    onChange([...dimensions, { id: crypto.randomUUID(), name: 'Neues Berufsfeld', color: DIMENSION_COLORS[colorIdx] }]);
  }

  function updateDim(id: string, partial: Partial<Dimension>) {
    onChange(dimensions.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  }

  function deleteDim(id: string) {
    onChange(dimensions.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {dimensions.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-xs text-slate-400">Noch keine Berufsfelder.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dimensions.map((dim) => (
              <div key={dim.id} className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="color"
                    value={dim.color ?? '#7c3aed'}
                    onChange={(e) => updateDim(dim.id, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={dim.name}
                    onChange={(e) => updateDim(dim.id, { name: e.target.value })}
                    className="flex-1 text-xs font-medium text-slate-800 bg-transparent border-b border-slate-300 focus:border-violet-400 outline-none py-0.5"
                    placeholder="Berufsfeld"
                  />
                  <button onClick={() => deleteDim(dim.id)} className="p-0.5 rounded hover:bg-red-100 transition-colors flex-shrink-0">
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </div>
                <input
                  value={dim.description ?? ''}
                  onChange={(e) => updateDim(dim.id, { description: e.target.value })}
                  className="w-full text-xs text-slate-500 bg-transparent border-b border-slate-200 focus:border-violet-300 outline-none py-0.5"
                  placeholder="Beschreibung (optional)"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-slate-100">
        <button onClick={addDimension} className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
          <Plus size={14} /> Berufsfeld hinzufügen
        </button>
      </div>
    </div>
  );
}
