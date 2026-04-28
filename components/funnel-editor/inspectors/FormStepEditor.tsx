'use client';

import { Plus, X } from 'lucide-react';
import { Field } from './shared';
import { VarInput, VarTextarea } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';

type FormFieldDef = { id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[] };

const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'radio'] as const;
const FIELD_LABELS: Record<string, string> = {
  text: 'Textfeld', email: 'E-Mail', phone: 'Telefon',
  textarea: 'Mehrzeilig', select: 'Auswahl', radio: 'Einfachauswahl',
};

export function FormStepEditor({ props, onChange, variables = [] }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void; variables?: VariableDef[] }) {
  const fields = (props.fields as FormFieldDef[]) ?? [];

  function addField() {
    onChange({ fields: [...fields, { id: crypto.randomUUID(), type: 'text', label: 'Feld', required: false }] });
  }
  function updateField(id: string, patch: Partial<FormFieldDef>) {
    onChange({ fields: fields.map((f) => f.id === id ? { ...f, ...patch } : f) });
  }
  function removeField(id: string) {
    onChange({ fields: fields.filter((f) => f.id !== id) });
  }

  return (
    <div className="space-y-3">
      <Field label="Schritt-Titel"><VarInput html value={(props.title as string) ?? ''} onChange={(v) => onChange({ title: v })} variables={variables} /></Field>
      <Field label="Beschreibung"><VarTextarea value={(props.description as string) ?? ''} onChange={(v) => onChange({ description: v })} rows={2} className="input-field text-sm resize-none" variables={variables} /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Felder ({fields.length})</p>
          <button onClick={addField} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Feld</button>
        </div>
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
              <div className="flex gap-1 items-center">
                <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_LABELS[t]}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="accent-violet-600" />
                  Pflicht
                </label>
                <button onClick={() => removeField(f.id)} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"><X size={12} /></button>
              </div>
              <input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder="Beschriftung" />
              {(f.type === 'select' || f.type === 'radio') && (
                <div className="space-y-1">
                  {(f.options ?? []).map((opt, i) => (
                    <div key={i} className="flex gap-1">
                      <input value={opt} onChange={(e) => { const o = [...(f.options ?? [])]; o[i] = e.target.value; updateField(f.id, { options: o }); }}
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder={`Option ${i + 1}`} />
                      <button onClick={() => updateField(f.id, { options: (f.options ?? []).filter((_, j) => j !== i) })}
                        disabled={(f.options ?? []).length <= 1} className="p-0.5 rounded text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={11} /></button>
                    </div>
                  ))}
                  <button onClick={() => updateField(f.id, { options: [...(f.options ?? []), `Option ${(f.options ?? []).length + 1}`] })}
                    className="text-[10px] text-violet-600 font-medium flex items-center gap-1"><Plus size={10} /> Option</button>
                </div>
              )}
            </div>
          ))}
          {fields.length === 0 && <p className="text-[10px] text-slate-300 text-center py-3 italic">Noch keine Felder</p>}
        </div>
      </div>
    </div>
  );
}
