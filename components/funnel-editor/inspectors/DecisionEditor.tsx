'use client';

import { Plus, X } from 'lucide-react';
import { FunnelPage } from '@/lib/funnel-types';
import { Field } from './shared';

export function DecisionEditor({ props, onChange, pages }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  pages?: FunnelPage[];
}) {
  const options = (props.options as { id: string; text: string; reaction: string; targetPageId?: string }[]) ?? [];

  function updateOpt(i: number, patch: Partial<typeof options[0]>) {
    onChange({ options: options.map((x, j) => j === i ? { ...x, ...patch } : x) });
  }

  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', reaction: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
        </div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
              <div className="flex gap-1">
                <input value={o.text} onChange={(e) => updateOpt(i, { text: e.target.value })}
                  className="flex-1 mini-input" placeholder="Optionstext" />
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
              </div>
              <input value={o.reaction} onChange={(e) => updateOpt(i, { reaction: e.target.value })}
                className="w-full mini-input" placeholder="Reaktion nach Auswahl" />
              {pages && pages.length > 1 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 flex-shrink-0">→ Weiter zu</span>
                  <select
                    value={o.targetPageId ?? ''}
                    onChange={(e) => updateOpt(i, { targetPageId: e.target.value || undefined })}
                    className="flex-1 mini-input"
                  >
                    <option value="">Nächste Seite</option>
                    {pages.map((pg) => (
                      <option key={pg.id} value={pg.id}>{pg.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
