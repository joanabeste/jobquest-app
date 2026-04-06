'use client';

import { useState } from 'react';
import { applyVars } from '@/lib/funnel-variables';
import { LeadFieldDef } from '@/lib/funnel-types';
import { Company } from '@/lib/types';
import { s, b, sh } from './helpers';

export interface LeadForm { firstName: string; lastName: string; email: string; phone: string; gdpr: boolean; }
export const emptyLead: LeadForm = { firstName: '', lastName: '', email: '', phone: '', gdpr: false };

export default function LeadFormBlock({ props: p, company, br, primary, leadForm, setLeadForm, onSubmit }: {
  props: Record<string, unknown>; company: Company; br: string; primary: string;
  leadForm: LeadForm; setLeadForm: (f: LeadForm) => void;
  onSubmit: (form: LeadForm, customFields?: Record<string, string>) => void;
}) {
  const u = (partial: Partial<LeadForm>) => setLeadForm({ ...leadForm, ...partial });
  const fieldDefs = (p.fields as LeadFieldDef[]) ?? [];
  const useFields = fieldDefs.length > 0;
  const [vals, setVals] = useState<Record<string, string>>({});
  const varsMap = {
    companyName:    company.name,
    datenschutzUrl: company.privacyUrl ?? '',
    impressumUrl:   company.imprintUrl ?? '',
  };
  const setVal = (id: string, val: string) => setVals((prev) => ({ ...prev, [id]: val }));

  const emailField = fieldDefs.find((f) => f.type === 'email');
  const emailValue = useFields ? (emailField ? (vals[emailField.id] ?? '') : '') : leadForm.email;
  const requiredCheckboxesMet = useFields
    ? fieldDefs.filter((f) => f.type === 'checkbox' && f.required).every((f) => vals[f.id] === 'true')
    : leadForm.gdpr;
  const canSubmit = emailValue.includes('@') && requiredCheckboxesMet;

  const inputCls = 'w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none';

  function handleSubmit() {
    const finalForm: LeadForm = { ...leadForm };
    if (useFields) {
      if (emailField) finalForm.email = vals[emailField.id] ?? '';
      const textFields = fieldDefs.filter((f) => f.type === 'text');
      if (textFields[0]) finalForm.firstName = vals[textFields[0].id] ?? '';
      if (textFields[1]) finalForm.lastName = vals[textFields[1].id] ?? '';
      const telField = fieldDefs.find((f) => f.type === 'tel');
      if (telField) finalForm.phone = vals[telField.id] ?? '';
      finalForm.gdpr = true; // required checkboxes already verified by canSubmit
      onSubmit(finalForm, vals);
    } else {
      onSubmit(leadForm);
    }
  }

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
      <h2 className="fp-heading text-xl font-bold mb-1">{s(p.headline)}</h2>
      {b(p.subtext) && <p className="text-slate-500 text-sm mb-4">{s(p.subtext)}</p>}
      <div className="space-y-3 mt-3">
        {useFields ? (
          fieldDefs.map((f) => {
            if (f.type === 'checkbox') {
              return (
                <label key={f.id} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!(vals[f.id])}
                    onChange={(e) => setVal(f.id, e.target.checked ? 'true' : '')}
                    className="fp-check mt-0.5 flex-shrink-0" />
                  <span
                    className="text-xs text-slate-500 leading-relaxed [&_a]:underline [&_a]:hover:text-slate-700"
                    dangerouslySetInnerHTML={{ __html: sh(applyVars(f.label, varsMap)) + (f.required ? ' *' : '') }}
                  />
                </label>
              );
            }
            if (f.type === 'textarea') {
              return (
                <textarea key={f.id} placeholder={f.placeholder ?? f.label}
                  value={vals[f.id] ?? ''} onChange={(e) => setVal(f.id, e.target.value)}
                  rows={3} className={`${inputCls} resize-none`} style={{ borderRadius: br }} />
              );
            }
            if (f.type === 'select') {
              const opts = (f.options ?? []).filter(Boolean);
              return (
                <select key={f.id} value={vals[f.id] ?? ''}
                  onChange={(e) => setVal(f.id, e.target.value)}
                  className={inputCls} style={{ borderRadius: br }}>
                  <option value="">{f.placeholder ?? f.label}{f.required ? ' *' : ''}</option>
                  {opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
                </select>
              );
            }
            return (
              <input key={f.id} type={f.type} placeholder={(f.placeholder ?? f.label) + (f.required ? ' *' : '')}
                value={vals[f.id] ?? ''} onChange={(e) => setVal(f.id, e.target.value)}
                className={inputCls} style={{ borderRadius: br }} />
            );
          })
        ) : (
          <>
            {b(p.showName) && (
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Vorname" value={leadForm.firstName} onChange={(e) => u({ firstName: e.target.value })}
                  className={inputCls} style={{ borderRadius: br }} />
                <input type="text" placeholder="Nachname" value={leadForm.lastName} onChange={(e) => u({ lastName: e.target.value })}
                  className={inputCls} style={{ borderRadius: br }} />
              </div>
            )}
            <input type="email" placeholder="E-Mail-Adresse *" value={leadForm.email} onChange={(e) => u({ email: e.target.value })}
              className={inputCls} style={{ borderRadius: br }} />
            {b(p.showPhone) && (
              <input type="tel" placeholder="Telefonnummer" value={leadForm.phone} onChange={(e) => u({ phone: e.target.value })}
                className={inputCls} style={{ borderRadius: br }} />
            )}
          </>
        )}
        {/* Legacy: hardcoded GDPR checkbox for forms without a fields array */}
        {!useFields && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={leadForm.gdpr} onChange={(e) => u({ gdpr: e.target.checked })} className="fp-check mt-0.5 flex-shrink-0" />
            <span className="text-xs text-slate-500 leading-relaxed">
              {applyVars(s(p.privacyText, 'Ich stimme zu, dass @companyName meine Daten verarbeitet.'), { companyName: company.name })}
              {company.privacyUrl && (
                <> <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">Datenschutzerklärung</a></>
              )}
              {' '}*
            </span>
          </label>
        )}
      </div>
      <button onClick={handleSubmit} disabled={!canSubmit}
        className="fp-btn w-full mt-4 py-3.5 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: br, background: primary, color: '#fff' }}>
        {s(p.buttonText, 'Abschicken')}
      </button>
    </div>
  );
}
