'use client';

import { Plus, Trash2 } from 'lucide-react';
import { BerufsCheckBlock, Dimension, FrageOption, FrageBlock, ErgebnisfrageBlock } from '@/lib/types';
import { FieldRefs, BlockTypeTag, InlineLabel, CfgField, CfgInput, inlineLarge, inlineSmall, inlineTextarea } from './InlineEditors';

function uid() { return crypto.randomUUID(); }

function OptionRow({ opt, idx, dimensions, onUpdate, onDelete }: {
  opt: FrageOption;
  idx: number;
  dimensions: Dimension[];
  onUpdate: (id: string, partial: Partial<FrageOption>) => void;
  onDelete: (id: string) => void;
}) {
  const dimId = Object.keys(opt.scores)[0] ?? '';
  const dim = dimensions.find((d) => d.id === dimId);

  function setDimension(newDimId: string) {
    onUpdate(opt.id, { scores: newDimId ? { [newDimId]: opt.scores[newDimId] ?? 1 } : {} });
  }

  function setScore(newDimId: string, value: string) {
    onUpdate(opt.id, { scores: { ...opt.scores, [newDimId]: Math.max(0, parseInt(value) || 0) } });
  }

  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
      <span className="text-xs text-slate-400 w-4 flex-shrink-0">{idx + 1}</span>
      <input
        value={opt.text}
        onChange={(e) => onUpdate(opt.id, { text: e.target.value })}
        className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 min-w-0"
        placeholder="Antwort…"
      />
      {dimensions.length > 0 && (
        <>
          <select
            value={dimId}
            onChange={(e) => setDimension(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 max-w-[120px]"
            style={dim ? { borderColor: dim.color, color: dim.color } : {}}
          >
            <option value="">— Feld —</option>
            {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {dimId && (
            <input
              type="number" min="0" max="100" value={opt.scores[dimId] ?? 1}
              onChange={(e) => setScore(dimId, e.target.value)}
              className="w-12 text-xs text-center bg-white border border-slate-200 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          )}
        </>
      )}
      <button onClick={() => onDelete(opt.id)} className="p-1 rounded hover:bg-red-100 flex-shrink-0">
        <Trash2 size={12} className="text-red-400" />
      </button>
    </div>
  );
}

// ── Inline Frage Editor ───────────────────────────────────────────────────────
export function InlineFrageEditor({ block, dimensions, onChange, fieldRefs }: {
  block: FrageBlock; dimensions: Dimension[]; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<FrageBlock>) => onChange({ ...block, ...partial });

  function addOption() { u({ options: [...(block.options ?? []), { id: uid(), text: 'Neue Option', scores: {} }] }); }
  function updateOption(id: string, partial: Partial<FrageOption>) {
    u({ options: (block.options ?? []).map((o) => (o.id === id ? { ...o, ...partial } : o)) });
  }
  function deleteOption(id: string) { u({ options: (block.options ?? []).filter((o) => o.id !== id) }); }

  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Frage" />
      <div className="group">
        <InlineLabel>Frage</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Deine Frage…" className={inlineLarge} />
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">Fragetyp</p>
        <div className="flex gap-2">
          {(['single_choice', 'slider'] as const).map((ft) => (
            <button key={ft} onClick={() => u({ frageType: ft })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                block.frageType === ft ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
              }`}>
              {ft === 'single_choice' ? 'Einzelauswahl' : 'Schieberegler'}
            </button>
          ))}
        </div>

        {block.frageType === 'single_choice' && (
          <div>
            {dimensions.length === 0 && (
              <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Keine Berufsfelder definiert. Füge Berufsfelder unter &quot;Berufsfelder&quot; hinzu.
              </p>
            )}
            <div className="space-y-2">
              {(block.options ?? []).map((opt, i) => (
                <OptionRow key={opt.id} opt={opt} idx={i} dimensions={dimensions} onUpdate={updateOption} onDelete={deleteOption} />
              ))}
            </div>
            <button onClick={addOption} className="mt-2 flex items-center gap-1 text-xs text-violet-600 font-medium px-2 py-1">
              <Plus size={12} /> Option hinzufügen
            </button>
          </div>
        )}

        {block.frageType === 'slider' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <CfgField label="Min"><CfgInput type="number" value={block.sliderMin ?? 0} onChange={(v) => u({ sliderMin: parseInt(v) || 0 })} /></CfgField>
              <CfgField label="Max"><CfgInput type="number" value={block.sliderMax ?? 10} onChange={(v) => u({ sliderMax: parseInt(v) || 10 })} /></CfgField>
              <CfgField label="Schritt"><CfgInput type="number" value={block.sliderStep ?? 1} onChange={(v) => u({ sliderStep: parseInt(v) || 1 })} /></CfgField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CfgField label="Label links"><CfgInput value={block.sliderLabelMin ?? ''} onChange={(v) => u({ sliderLabelMin: v })} placeholder="Wenig" /></CfgField>
              <CfgField label="Label rechts"><CfgInput value={block.sliderLabelMax ?? ''} onChange={(v) => u({ sliderLabelMax: v })} placeholder="Viel" /></CfgField>
            </div>
            <CfgField label="Berufsfeld" hint="Slider-Wert wird als Punktzahl gewertet">
              <select value={block.sliderDimensionId ?? ''} onChange={(e) => u({ sliderDimensionId: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white">
                <option value="">— Kein Berufsfeld —</option>
                {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </CfgField>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline Ergebnisfrage Editor ───────────────────────────────────────────────
export function InlineErgebnisfrageEditor({ block, dimensions, onChange, fieldRefs }: {
  block: ErgebnisfrageBlock; dimensions: Dimension[]; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<ErgebnisfrageBlock>) => onChange({ ...block, ...partial });

  function addOption() { u({ options: [...block.options, { id: uid(), text: 'Neue Option', scores: {} }] }); }
  function updateOption(id: string, partial: Partial<FrageOption>) {
    u({ options: block.options.map((o) => (o.id === id ? { ...o, ...partial } : o)) });
  }
  function deleteOption(id: string) { u({ options: block.options.filter((o) => o.id !== id) }); }

  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Ergebnisfrage" />
      <div className="group">
        <InlineLabel>Frage</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Welche Aussage trifft am ehesten zu?" className={inlineLarge} />
      </div>
      <div className="group">
        <InlineLabel>Beschreibung (optional)</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['description'] = el; }}
          value={block.description ?? ''} onChange={(e) => u({ description: e.target.value || undefined })}
          placeholder="Weitere Erklärung…" rows={2} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="pt-3 border-t border-slate-100">
        {dimensions.length === 0 && (
          <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            Keine Berufsfelder definiert. Füge sie unter &quot;Berufsfelder&quot; hinzu.
          </p>
        )}
        <div className="space-y-2">
          {block.options.map((opt, i) => (
            <OptionRow key={opt.id} opt={opt} idx={i} dimensions={dimensions} onUpdate={updateOption} onDelete={deleteOption} />
          ))}
        </div>
        <button onClick={addOption} className="mt-2 flex items-center gap-1 text-xs text-violet-600 font-medium px-2 py-1">
          <Plus size={12} /> Option hinzufügen
        </button>
      </div>
    </div>
  );
}
