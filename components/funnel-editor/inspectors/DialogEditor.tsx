'use client';

import { Plus, X } from 'lucide-react';
import { Field, ImageUploadField } from './shared';

type DialogLineDef = { id: string; speaker: string; text: string; imageUrl?: string };

export function DialogEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const lines = (props.lines as DialogLineDef[]) ?? [];
  const choices = (props.choices as { id: string; text: string; reaction?: string }[]) ?? [];
  const input = (props.input as { placeholder?: string; captures?: string; followUpText?: string } | undefined) ?? null;
  const hasChoices = choices.length > 0;
  const hasInput = !!input;

  function updateLine(id: string, patch: Partial<DialogLineDef>) {
    onChange({ lines: lines.map((l) => l.id === id ? { ...l, ...patch } : l) });
  }
  function updateChoice(i: number, patch: Partial<{ text: string; reaction: string }>) {
    onChange({ choices: choices.map((c, j) => j === i ? { ...c, ...patch } : c) });
  }

  return (
    <div className="space-y-3">
      <Field label="Titel (optional)"><input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Zeilen</p>
          <button onClick={() => onChange({ lines: [...lines, { id: crypto.randomUUID(), speaker: 'Sprecher', text: '', imageUrl: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 font-medium">
            <Plus size={11} /> Zeile
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={l.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <input value={l.speaker} onChange={(e) => updateLine(l.id, { speaker: e.target.value })}
                  className="flex-1 mini-input" placeholder="Sprecher" />
                <button onClick={() => onChange({ lines: lines.filter((_, idx) => idx !== i) })}
                  disabled={lines.length <= 1} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30">
                  <X size={12} />
                </button>
              </div>
              <textarea value={l.text} onChange={(e) => updateLine(l.id, { text: e.target.value })}
                rows={2} className="w-full mini-input resize-none" placeholder="Text…" />
              <ImageUploadField label="Bild (optional)" value={l.imageUrl ?? ''} onChange={(v) => updateLine(l.id, { imageUrl: v })} />
            </div>
          ))}
        </div>
      </div>

      {!hasInput && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Antwortoptionen</p>
            <button onClick={() => onChange({ choices: [...choices, { id: crypto.randomUUID(), text: '', reaction: '' }] })}
              className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 font-medium">
              <Plus size={11} /> Option
            </button>
          </div>
          {hasChoices && (
            <div className="space-y-2">
              {choices.map((c, i) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                  <div className="flex gap-1">
                    <input value={c.text} onChange={(e) => updateChoice(i, { text: e.target.value })}
                      className="flex-1 mini-input" placeholder="Antworttext" />
                    <button onClick={() => onChange({ choices: choices.filter((_, j) => j !== i) })}
                      className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                  <input value={c.reaction ?? ''} onChange={(e) => updateChoice(i, { reaction: e.target.value })}
                    className="w-full mini-input" placeholder="Reaktion des Sprechers (optional)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasChoices && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Eingabefeld</p>
            <button
              onClick={() => hasInput
                ? onChange({ input: undefined })
                : onChange({ input: { placeholder: 'Dein Vorname…', captures: 'firstName', followUpText: '' } })}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${hasInput ? 'bg-violet-100 text-violet-700 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:text-violet-600'}`}
            >
              {hasInput ? '× Entfernen' : '+ Hinzufügen'}
            </button>
          </div>
          {hasInput && (
            <div className="space-y-1.5">
              <input value={input?.placeholder ?? ''} onChange={(e) => onChange({ input: { ...input, placeholder: e.target.value } })}
                className="w-full mini-input" placeholder="Platzhalter…" />
              <select value={input?.captures ?? ''} onChange={(e) => onChange({ input: { ...input, captures: e.target.value || undefined } })}
                className="w-full mini-input">
                <option value="">Kein Capture</option>
                <option value="firstName">Vorname speichern (als &#123;&#123;name&#125;&#125;)</option>
              </select>
              <textarea value={input?.followUpText ?? ''} onChange={(e) => onChange({ input: { ...input, followUpText: e.target.value } })}
                rows={2} className="w-full mini-input resize-none" placeholder="Reaktion des Sprechers nach Eingabe (optional)…" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
