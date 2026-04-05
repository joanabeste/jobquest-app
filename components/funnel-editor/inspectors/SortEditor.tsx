'use client';

import { Plus, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';

type SortItem = { id: string; text: string; correctIndex?: number };

export function SortEditor({ props, onChange, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
}) {
  const items = (props.items as SortItem[]) ?? [];
  const showFeedback = (props.showFeedback as boolean) ?? false;
  const shuffleItems = (props.shuffleItems as boolean) ?? true;

  function updateItem(id: string, patch: Partial<SortItem>) {
    onChange({ items: items.map((it) => it.id === id ? { ...it, ...patch } : it) });
  }

  function removeItem(id: string) {
    onChange({ items: items.filter((it) => it.id !== id) });
  }

  function moveItem(id: string, dir: 'up' | 'down') {
    const idx = items.findIndex((it) => it.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === items.length - 1) return;
    const next = [...items];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange({ items: next });
  }

  return (
    <div className="space-y-3">
      <Field label="Frage / Aufgabe">
        <VarInput
          value={(props.question as string) ?? ''}
          onChange={(v) => onChange({ question: v })}
          variables={variables}
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Elemente</p>
          <button
            onClick={() => onChange({ items: [...items, { id: crypto.randomUUID(), text: 'Neues Element' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"
          >
            <Plus size={11} /> Element
          </button>
        </div>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
              <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveItem(item.id, 'up')} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-20">
                  <ChevronUp size={11} />
                </button>
                <button onClick={() => moveItem(item.id, 'down')} disabled={i === items.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-20">
                  <ChevronDown size={11} />
                </button>
              </div>
              <span className="text-[10px] font-bold text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
              <input
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                className="flex-1 mini-input"
                placeholder={`Element ${i + 1}`}
              />
              {showFeedback && (
                <input
                  type="number"
                  min={1}
                  max={items.length}
                  value={item.correctIndex !== undefined ? item.correctIndex + 1 : ''}
                  onChange={(e) => updateItem(item.id, { correctIndex: e.target.value ? Number(e.target.value) - 1 : undefined })}
                  className="w-10 mini-input text-center"
                  placeholder="Pos."
                  title="Richtige Position (1-basiert)"
                />
              )}
              <button
                onClick={() => removeItem(item.id)}
                disabled={items.length <= 2}
                className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-20"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="shuffleItems"
            checked={shuffleItems}
            onChange={(e) => onChange({ shuffleItems: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="shuffleItems" className="text-[11px] text-slate-600 cursor-pointer">
            Elemente beim Start mischen
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
            Reihenfolge prüfen (richtig/falsch anzeigen)
          </label>
        </div>
        {showFeedback && (
          <p className="text-[10px] text-slate-400 pl-5">
            Gib für jedes Element die richtige Position (Pos.) ein. Leer = beliebig.
          </p>
        )}
      </div>

      {showFeedback && (
        <Field label="Feedback-Text (bei richtiger Reihenfolge)">
          <input
            value={(props.feedbackText as string) ?? ''}
            onChange={(e) => onChange({ feedbackText: e.target.value })}
            className="input-field text-sm w-full"
            placeholder="Gut sortiert!"
          />
        </Field>
      )}
    </div>
  );
}
