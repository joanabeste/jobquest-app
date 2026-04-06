'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, LockOpen, Plus, X } from 'lucide-react';
import { LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';
import { LEAD_FIELD_META, LEAD_FIELD_TYPES } from '@/lib/lead-field-meta';

interface LeadFieldBuilderProps {
  fields: LeadFieldDef[];
  onChange: (fields: LeadFieldDef[]) => void;
}

export default function LeadFieldBuilder({ fields, onChange }: LeadFieldBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addField() {
    const newField: LeadFieldDef = { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false };
    onChange([...fields, newField]);
    setExpandedId(newField.id);
  }

  function updateField(id: string, patch: Partial<LeadFieldDef>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
    if (expandedId === id) setExpandedId(null);
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
      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Formularfelder</p>

      {fields.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-2">
          Noch keine Felder
        </p>
      ) : (
        <div className="space-y-1 mb-2">
          {fields.map((f, idx) => {
            const meta = LEAD_FIELD_META[f.type];
            const Icon = meta.icon;
            const isExpanded = expandedId === f.id;

            return (
              <div key={f.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                >
                  {/* Up/down */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(f.id, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp size={9} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(f.id, 1); }}
                      disabled={idx === fields.length - 1}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown size={9} />
                    </button>
                  </div>

                  {/* Type icon */}
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon size={10} className={meta.color} />
                  </div>

                  {/* Type selector */}
                  <select
                    value={f.type}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const t = e.target.value as LeadFieldType;
                      updateField(f.id, {
                        type: t,
                        options: t === 'select' ? (f.options ?? ['Option 1', 'Option 2']) : f.options,
                      });
                    }}
                    className="text-[10px] font-medium text-slate-600 bg-transparent border-none outline-none cursor-pointer flex-shrink-0 pr-1"
                  >
                    {LEAD_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
                    ))}
                  </select>

                  {/* Label — plain text for most types, HTML preview for checkbox */}
                  {f.type === 'checkbox' ? (
                    <span
                      className="flex-1 min-w-0 text-xs text-slate-400 truncate italic"
                      title="Beschriftung im Detailbereich bearbeiten"
                      dangerouslySetInnerHTML={{ __html: f.label }}
                    />
                  ) : (
                    <input
                      value={f.label}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                      className="flex-1 min-w-0 text-xs text-slate-700 bg-transparent outline-none placeholder:text-slate-300 truncate"
                      placeholder="Beschriftung"
                    />
                  )}

                  {/* Required toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); updateField(f.id, { required: !f.required }); }}
                    title={f.required ? 'Pflichtfeld' : 'Optional'}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    {f.required
                      ? <Lock size={11} className="text-violet-600" />
                      : <LockOpen size={11} className="text-slate-300" />
                    }
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 border-t border-slate-100 space-y-1.5 bg-slate-50">
                    {/* Placeholder */}
                    {f.type !== 'checkbox' && f.type !== 'select' && (
                      <input
                        value={f.placeholder ?? ''}
                        onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-violet-300 placeholder:text-slate-300"
                        placeholder="Platzhalter (optional)"
                      />
                    )}
                    {/* Dropdown options */}
                    {f.type === 'select' && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Optionen (eine pro Zeile)</p>
                        <textarea
                          value={(f.options ?? []).join('\n')}
                          onChange={(e) => updateField(f.id, { options: e.target.value.split('\n') })}
                          rows={3}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-violet-300 resize-none placeholder:text-slate-300"
                          placeholder={'Option 1\nOption 2\nOption 3'}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add field */}
      <button
        onClick={addField}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400 font-medium hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
      >
        <Plus size={11} /> Feld hinzufügen
      </button>
    </div>
  );
}
