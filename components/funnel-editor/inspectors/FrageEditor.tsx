'use client';

import { Plus, X } from 'lucide-react';
import { Field, NumberInput } from './shared';

export function FrageEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const frageType = (props.frageType as string) ?? 'single_choice';
  const options = (props.options as { id: string; text: string; scores: Record<string, number> }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Typ">
        <select value={frageType} onChange={(e) => onChange({ frageType: e.target.value })} className="input-field text-sm">
          <option value="single_choice">Einfachauswahl</option>
          <option value="slider">Slider</option>
        </select>
      </Field>
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      {frageType === 'single_choice' ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Min" value={(props.sliderMin as number) ?? 0} onChange={(v) => onChange({ sliderMin: v })} />
          <NumberInput label="Max" value={(props.sliderMax as number) ?? 10} onChange={(v) => onChange({ sliderMax: v })} />
        </div>
      )}
    </div>
  );
}

export function ErgebnisfrageEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const options = (props.options as { id: string; text: string; scores: Record<string, number> }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
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
