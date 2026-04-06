'use client';

import { ChevronLeft } from 'lucide-react';
import { LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';
import { slugifyVar, deriveFieldVarMap } from '@/lib/funnel-variables';
import { LEAD_FIELD_META, LEAD_FIELD_TYPES } from '@/lib/lead-field-meta';
import RichTextEditor from '../RichTextEditor';
import { Field } from './shared';

export function LeadFieldEditor({ field, allFields, onChange, onBack }: {
  field: LeadFieldDef;
  allFields: LeadFieldDef[];
  onChange: (patch: Partial<LeadFieldDef>) => void;
  onBack: () => void;
}) {
  const meta = LEAD_FIELD_META[field.type];
  const Icon = meta.icon;
  const varMap = deriveFieldVarMap(allFields);
  const varName = varMap.get(field.id) ?? slugifyVar(field.label.replace(/<[^>]*>/g, ''));

  return (
    <div className="space-y-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={12} /> Zurück zum Formular
      </button>

      <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50">
        <Icon size={13} className={meta.color} />
        <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
      </div>

      <Field label="Feldtyp">
        <select
          value={field.type}
          onChange={(e) => onChange({
            type: e.target.value as LeadFieldType,
            options: e.target.value === 'select' ? (field.options ?? ['Option 1', 'Option 2']) : field.options,
          })}
          className="input-field text-sm"
        >
          {LEAD_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
          ))}
        </select>
      </Field>

      {field.type === 'checkbox' ? (
        <Field label="Beschriftung">
          <RichTextEditor
            value={field.label}
            onChange={(html) => onChange({ label: html })}
            variables={[
              { key: 'companyName',    label: 'Firmenname'      },
              { key: 'datenschutzUrl', label: 'Datenschutz-URL' },
              { key: 'impressumUrl',   label: 'Impressum-URL'   },
            ]}
            minHeight={60}
          />
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            Verwende @datenschutzUrl und @impressumUrl für automatische Links aus dem Firmenprofil.
          </p>
        </Field>
      ) : (
        <Field label="Feldname">
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="input-field text-sm"
            placeholder="z.B. Vorname"
          />
        </Field>
      )}

      {field.type !== 'checkbox' && (
        <Field label="Variable">
          <div className="px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
            @{varName}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            In E-Mail-Vorlagen mit <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">@{varName}</code> verwenden.
          </p>
        </Field>
      )}

      <Field label="Verhalten">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="accent-violet-600"
          />
          <span className="text-xs text-slate-700">Pflichtfeld</span>
        </label>
      </Field>

      {field.type !== 'checkbox' && (
        <Field label="Platzhalter">
          <input
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="input-field text-sm"
            placeholder="optional"
          />
        </Field>
      )}

      {field.type === 'select' && (
        <Field label="Optionen">
          <textarea
            value={(field.options ?? []).join('\n')}
            onChange={(e) => onChange({ options: e.target.value.split('\n') })}
            rows={4}
            className="input-field text-sm resize-none"
            placeholder={'Option 1\nOption 2\nOption 3'}
          />
          <p className="text-[10px] text-slate-400 mt-1">Eine Option pro Zeile</p>
        </Field>
      )}
    </div>
  );
}
