'use client';

import { useState } from 'react';
import { Plus, X, Smile } from 'lucide-react';
import { FunnelPage } from '@/lib/funnel-types';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';
import { DECISION_ICONS, isIconName } from '@/lib/decision-icons';

type DecisionOption = { id: string; text: string; reaction: string; emoji?: string; targetPageId?: string };

export function DecisionEditor({ props, onChange, pages, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  pages?: FunnelPage[];
  variables?: VariableDef[];
}) {
  const options = (props.options as DecisionOption[]) ?? [];
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);

  function updateOpt(i: number, patch: Partial<DecisionOption>) {
    onChange({ options: options.map((x, j) => j === i ? { ...x, ...patch } : x) });
  }

  return (
    <div className="space-y-3">
      <Field label="Frage"><VarInput value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} variables={variables} /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', reaction: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
        </div>
        <div className="space-y-2">
          {options.map((o, i) => {
            const IconComp = isIconName(o.emoji) ? DECISION_ICONS[o.emoji] : null;
            return (
              <div key={o.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                <div className="flex gap-1 items-center">
                  {/* Icon picker trigger */}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(pickerOpen === o.id ? null : o.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white hover:border-violet-300 transition-colors"
                    title="Icon wählen"
                  >
                    {IconComp
                      ? <IconComp size={14} className="text-violet-500" />
                      : <Smile size={14} className="text-slate-400" />
                    }
                  </button>
                  <input value={o.text} onChange={(e) => updateOpt(i, { text: e.target.value })}
                    className="flex-1 mini-input" placeholder="Optionstext" />
                  <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                    className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
                </div>

                {/* Icon picker grid */}
                {pickerOpen === o.id && (
                  <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-md">
                    <div className="grid grid-cols-8 gap-1">
                      {/* Clear option */}
                      <button
                        type="button"
                        onClick={() => { updateOpt(i, { emoji: undefined }); setPickerOpen(null); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-300 hover:text-slate-500 border border-dashed border-slate-200"
                        title="Kein Icon"
                      >
                        <X size={10} />
                      </button>
                      {Object.entries(DECISION_ICONS).map(([name, Icon]) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => { updateOpt(i, { emoji: name }); setPickerOpen(null); }}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center hover:bg-violet-50 transition-colors ${o.emoji === name ? 'bg-violet-100 text-violet-600' : 'text-slate-500'}`}
                          title={name}
                        >
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <VarInput value={o.reaction} onChange={(v) => updateOpt(i, { reaction: v })}
                  className="w-full mini-input" placeholder="Reaktion nach Auswahl" variables={variables} />
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
