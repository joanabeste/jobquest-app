'use client';

import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';

const LEAD_FIELD_TYPES: LeadFieldType[] = ['text', 'email', 'tel', 'textarea', 'checkbox', 'select'];
const LEAD_FIELD_LABELS: Record<LeadFieldType, string> = {
  text: 'Text',
  email: 'E-Mail',
  tel: 'Telefon',
  textarea: 'Mehrzeilig',
  checkbox: 'Checkbox',
  select: 'Dropdown',
};

interface LeadFieldBuilderProps {
  fields: LeadFieldDef[];
  onChange: (fields: LeadFieldDef[]) => void;
}

export default function LeadFieldBuilder({ fields, onChange }: LeadFieldBuilderProps) {
  function addField() {
    onChange([...fields, { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false }]);
  }

  function updateField(id: string, patch: Partial<LeadFieldDef>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function moveField(id: string, dir: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    const arr = [...fields];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange(arr);
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Formularfelder</p>
        <button
          onClick={addField}
          className="flex items-center gap-1 text-[10px] text-violet-600 font-medium hover:text-violet-800 transition-colors"
        >
          <Plus size={11} /> Feld hinzufügen
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Noch keine Felder – klicke auf Feld hinzufügen
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((f, idx) => (
            <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
              {/* Row 1: type selector + pflicht + reorder + delete */}
              <div className="flex gap-1 items-center">
                <select
                  value={f.type}
                  onChange={(e) =>
                    updateField(f.id, {
                      type: e.target.value as LeadFieldType,
                      options: e.target.value === 'select' ? (f.options ?? ['Option 1', 'Option 2']) : f.options,
                    })
                  }
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                >
                  {LEAD_FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LEAD_FIELD_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => updateField(f.id, { required: e.target.checked })}
                    className="accent-violet-600"
                  />
                  Pflicht
                </label>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveField(f.id, -1)}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={10} />
                  </button>
                  <button
                    onClick={() => moveField(f.id, 1)}
                    disabled={idx === fields.length - 1}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={10} />
                  </button>
                </div>
                <button
                  onClick={() => removeField(f.id)}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              {/* Row 2: label */}
              <input
                value={f.label}
                onChange={(e) => updateField(f.id, { label: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                placeholder="Beschriftung"
              />
              {/* Row 3: placeholder (not for checkbox/select) */}
              {f.type !== 'checkbox' && f.type !== 'select' && (
                <input
                  value={f.placeholder ?? ''}
                  onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                  placeholder="Platzhalter (optional)"
                />
              )}
              {/* Row 4: dropdown options (one per line) */}
              {f.type === 'select' && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Optionen (eine pro Zeile)</p>
                  <textarea
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) => updateField(f.id, { options: e.target.value.split('\n') })}
                    rows={3}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none resize-none"
                    placeholder={'Option 1\nOption 2\nOption 3'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
