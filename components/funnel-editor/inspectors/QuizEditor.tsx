'use client';

import { Plus, X } from 'lucide-react';
import { Field } from './shared';

export function QuizEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const options = (props.options as { id: string; text: string; correct: boolean; feedback: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Antworten</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Antwort', correct: false, feedback: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Antwort</button>
        </div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className={`rounded-xl p-2 space-y-1.5 border ${o.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex gap-1 items-center">
                <input type="checkbox" checked={o.correct}
                  onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, correct: e.target.checked } : x) })}
                  className="accent-emerald-600" title="Richtige Antwort" />
                <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                  className="flex-1 mini-input" />
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
              </div>
              <input value={o.feedback} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, feedback: e.target.value } : x) })}
                className="w-full mini-input" placeholder="Feedback nach Auswahl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
