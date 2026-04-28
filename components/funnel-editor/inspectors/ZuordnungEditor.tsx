'use client';

import { Plus, X } from 'lucide-react';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';

export type ZuordnungPair = { id: string; left: string; right: string };

export function ZuordnungEditor({ props, onChange, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
}) {
  const pairs = (props.pairs as ZuordnungPair[]) ?? [];
  const showFeedback = (props.showFeedback as boolean) ?? true;
  const shuffleRight = (props.shuffleRight as boolean) ?? true;

  function updatePair(id: string, patch: Partial<ZuordnungPair>) {
    onChange({ pairs: pairs.map((p) => p.id === id ? { ...p, ...patch } : p) });
  }

  function removePair(id: string) {
    onChange({ pairs: pairs.filter((p) => p.id !== id) });
  }

  return (
    <div className="space-y-3">
      <Field label="Frage / Aufgabe">
        <VarInput
          html
          value={(props.question as string) ?? ''}
          onChange={(v) => onChange({ question: v })}
          variables={variables}
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Paare</p>
          <button
            onClick={() => onChange({ pairs: [...pairs, { id: crypto.randomUUID(), left: 'Begriff', right: 'Erklärung' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"
          >
            <Plus size={11} /> Paar
          </button>
        </div>

        <div className="space-y-1.5">
          {pairs.map((pair, i) => (
            <div key={pair.id} className="bg-slate-50 rounded-lg px-2 py-2 space-y-1">
              <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-0.5">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[9px]">{i + 1}</span>
                <span className="flex-1">Links</span>
                <span className="flex-1">Rechts</span>
                <span className="w-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  value={pair.left}
                  onChange={(e) => updatePair(pair.id, { left: e.target.value })}
                  className="flex-1 mini-input"
                  placeholder={`Begriff ${i + 1}`}
                />
                <span className="text-slate-300 text-xs flex-shrink-0">↔</span>
                <input
                  value={pair.right}
                  onChange={(e) => updatePair(pair.id, { right: e.target.value })}
                  className="flex-1 mini-input"
                  placeholder={`Erklärung ${i + 1}`}
                />
                <button
                  onClick={() => removePair(pair.id)}
                  disabled={pairs.length <= 2}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-20 flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="shuffleRight"
            checked={shuffleRight}
            onChange={(e) => onChange({ shuffleRight: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="shuffleRight" className="text-[11px] text-slate-600 cursor-pointer">
            Rechte Seite beim Start mischen
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showFeedback"
            checked={showFeedback}
            onChange={(e) => onChange({ showFeedback: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="showFeedback" className="text-[11px] text-slate-600 cursor-pointer">
            Feedback anzeigen (richtig/falsch)
          </label>
        </div>
      </div>

      {showFeedback && (
        <Field label="Feedback-Text (bei korrekter Zuordnung)">
          <input
            value={(props.feedbackText as string) ?? ''}
            onChange={(e) => onChange({ feedbackText: e.target.value })}
            className="input-field text-sm w-full"
            placeholder="Gut gemacht!"
          />
        </Field>
      )}
    </div>
  );
}
