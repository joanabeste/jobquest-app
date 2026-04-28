'use client';

import { Plus, X } from 'lucide-react';
import { Field, NumberInput } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';
import { useFunnelEditorCtx } from '../FunnelEditorContext';

interface ScoreOption { id: string; text: string; scores: Record<string, number> }

/**
 * Inline editor for editing per-dimension scores on a single Frage option.
 * Reused by SwipeDeckEditor to keep score-editing UX consistent.
 */
export function DimensionScoresEditor({ scores, onChange }: {
  scores: Record<string, number>;
  onChange: (scores: Record<string, number>) => void;
}) {
  const ctx = useFunnelEditorCtx();
  const dimensions = ctx?.dimensions ?? [];
  if (dimensions.length === 0) {
    return (
      <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
        Keine Berufsfelder definiert. In den Check-Einstellungen anlegen.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {dimensions.map((dim) => {
        const cur = scores[dim.id] ?? 0;
        return (
          <div key={dim.id} className="flex items-center gap-2">
            <span className="text-[11px] flex-1 truncate" style={{ color: dim.color || '#64748b' }}>{dim.name}</span>
            <input
              type="number"
              value={cur}
              min={-10}
              max={10}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                const next = { ...scores };
                if (v === 0) delete next[dim.id]; else next[dim.id] = v;
                onChange(next);
              }}
              className="w-12 text-[11px] text-center bg-white border border-slate-200 rounded px-1 py-0.5"
            />
          </div>
        );
      })}
    </div>
  );
}

export function FrageEditor({ props, onChange, variables = [] }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void; variables?: VariableDef[] }) {
  const frageType = (props.frageType as string) ?? 'single_choice';
  const options = (props.options as ScoreOption[]) ?? [];
  const allowSkip = !!props.allowSkip;
  return (
    <div className="space-y-3">
      <Field label="Typ">
        <select value={frageType} onChange={(e) => onChange({ frageType: e.target.value })} className="input-field text-sm">
          <option value="single_choice">Einfachauswahl</option>
          <option value="slider">Slider</option>
        </select>
      </Field>
      <Field label="Frage"><VarInput html value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} variables={variables} /></Field>
      {frageType === 'single_choice' ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
            <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', scores: {} }] })}
              className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={o.id} className="border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50/50">
                <div className="flex gap-1">
                  <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                    className="flex-1 mini-input" />
                  <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                    className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
                </div>
                <DimensionScoresEditor
                  scores={o.scores ?? {}}
                  onChange={(scores) => onChange({ options: options.map((x, j) => j === i ? { ...x, scores } : x) })}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Min" value={(props.sliderMin as number) ?? 0} onChange={(v) => onChange({ sliderMin: v })} />
          <NumberInput label="Max" value={(props.sliderMax as number) ?? 10} onChange={(v) => onChange({ sliderMax: v })} />
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input type="checkbox" checked={allowSkip} onChange={(e) => onChange({ allowSkip: e.target.checked })} className="accent-violet-600" />
        <span className="text-xs text-slate-700">&bdquo;Weiß nicht / überspringen&ldquo;-Option zeigen</span>
      </label>
    </div>
  );
}

export function ErgebnisfrageEditor({ props, onChange, variables = [] }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void; variables?: VariableDef[] }) {
  const options = (props.options as { id: string; text: string; scores: Record<string, number> }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Frage"><VarInput html value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} variables={variables} /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', scores: {} }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
        </div>
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div key={o.id} className="flex gap-1">
              <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                className="flex-1 mini-input" />
              <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
