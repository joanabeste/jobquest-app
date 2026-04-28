'use client';

import { useState } from 'react';
import { Plus, X, Smile } from 'lucide-react';
import { FunnelPage } from '@/lib/funnel-types';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';
import { DECISION_ICONS, isIconName, isEmoji } from '@/lib/decision-icons';
import { IconEmojiPicker } from './IconEmojiPicker';

type DecisionOption = { id: string; text: string; reaction: string; emoji?: string; targetPageId?: string; isWrong?: boolean };

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
      <Field label="Frage"><VarInput html value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} variables={variables} /></Field>
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
                  {/* Icon/emoji picker trigger */}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(pickerOpen === o.id ? null : o.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white hover:border-violet-300 transition-colors"
                    title="Icon oder Emoji wählen"
                  >
                    {IconComp
                      ? <IconComp size={14} className="text-violet-500" />
                      : isEmoji(o.emoji)
                        ? <span className="text-base leading-none">{o.emoji}</span>
                        : <Smile size={14} className="text-slate-400" />
                    }
                  </button>
                  <input value={o.text} onChange={(e) => updateOpt(i, { text: e.target.value })}
                    className="flex-1 mini-input" placeholder="Optionstext" />
                  <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                    className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
                </div>

                {/* Icon/emoji picker */}
                {pickerOpen === o.id && (
                  <IconEmojiPicker
                    value={o.emoji}
                    onChange={(v) => updateOpt(i, { emoji: v || undefined })}
                    onClose={() => setPickerOpen(null)}
                  />
                )}

                <VarInput value={o.reaction} onChange={(v) => updateOpt(i, { reaction: v })}
                  className="w-full mini-input" placeholder="Reaktion nach Auswahl" variables={variables} />
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={!!o.isWrong}
                    onChange={(e) => updateOpt(i, { isWrong: e.target.checked || undefined })}
                    className="w-3 h-3 accent-red-500"
                  />
                  Diese Entscheidung ist nicht sinnvoll (zeigt rote Reaktion)
                </label>
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
