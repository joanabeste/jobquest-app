'use client';

import { Plus, X } from 'lucide-react';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';
import { DimensionScoresEditor } from './FrageEditor';

interface SwipeOption { label?: string; emoji?: string; scores: Record<string, number> }
interface SwipeCard {
  id: string;
  text: string;
  imageUrl?: string;
  optionPositive: SwipeOption;
  optionNeutral:  SwipeOption;
  optionNegative: SwipeOption;
}

function uid() { return crypto.randomUUID(); }

export function SwipeDeckEditor({ props, onChange, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
}) {
  const cards = (props.cards as SwipeCard[]) ?? [];
  const allowSkip = props.allowSkip !== false;

  function patchCard(id: string, patch: Partial<SwipeCard>) {
    onChange({ cards: cards.map((c) => c.id === id ? { ...c, ...patch } : c) });
  }
  function addCard() {
    onChange({
      cards: [...cards, {
        id: uid(),
        text: 'Würdest du …?',
        optionPositive: { label: 'Ja',         emoji: '👍', scores: {} },
        optionNeutral:  { label: 'Vielleicht', emoji: '😐', scores: {} },
        optionNegative: { label: 'Nein',       emoji: '👎', scores: {} },
      }],
    });
  }
  function removeCard(id: string) {
    onChange({ cards: cards.filter((c) => c.id !== id) });
  }

  return (
    <div className="space-y-3">
      <Field label="Header (optional)">
        <VarInput html value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} variables={variables} />
      </Field>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={allowSkip} onChange={(e) => onChange({ allowSkip: e.target.checked })} className="accent-violet-600" />
        <span className="text-xs text-slate-700">&bdquo;Weiß nicht / überspringen&ldquo;-Button anzeigen</span>
      </label>

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Karten ({cards.length})</p>
          <button onClick={addCard} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium">
            <Plus size={11} /> Karte
          </button>
        </div>
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <details key={card.id} className="border border-slate-200 rounded-lg bg-slate-50/50" open={idx === cards.length - 1}>
              <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-slate-700 flex items-center justify-between hover:bg-slate-100/60 rounded-t-lg">
                <span className="truncate">#{idx + 1} {card.text || '(Kein Text)'}</span>
                <button
                  onClick={(e) => { e.preventDefault(); removeCard(card.id); }}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                >
                  <X size={11} />
                </button>
              </summary>
              <div className="p-3 pt-2 space-y-2">
                <textarea
                  value={card.text}
                  onChange={(e) => patchCard(card.id, { text: e.target.value })}
                  className="input-field text-xs resize-none w-full"
                  rows={2}
                  placeholder="Szenario-Text…"
                />
                <input
                  value={card.imageUrl ?? ''}
                  onChange={(e) => patchCard(card.id, { imageUrl: e.target.value || undefined })}
                  className="input-field text-xs w-full"
                  placeholder="Bild-URL (optional)"
                />

                <OptionEditor
                  label="👍 Ja"
                  color="emerald"
                  option={card.optionPositive}
                  onChange={(o) => patchCard(card.id, { optionPositive: o })}
                />
                <OptionEditor
                  label="😐 Vielleicht"
                  color="slate"
                  option={card.optionNeutral}
                  onChange={(o) => patchCard(card.id, { optionNeutral: o })}
                />
                <OptionEditor
                  label="👎 Nein"
                  color="rose"
                  option={card.optionNegative}
                  onChange={(o) => patchCard(card.id, { optionNegative: o })}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionEditor({ label, color, option, onChange }: {
  label: string;
  color: 'emerald' | 'slate' | 'rose';
  option: SwipeOption;
  onChange: (o: SwipeOption) => void;
}) {
  const headerColor = color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-500';
  return (
    <div className="bg-white border border-slate-200 rounded p-2 space-y-1.5">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${headerColor}`}>{label}</p>
      <DimensionScoresEditor
        scores={option?.scores ?? {}}
        onChange={(scores) => onChange({ ...option, scores })}
      />
    </div>
  );
}
