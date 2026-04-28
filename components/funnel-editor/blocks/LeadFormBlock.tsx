'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { applyVars } from '@/lib/funnel-variables';
import { LeadFieldDef } from '@/lib/funnel-types';
import { Company } from '@/lib/types';
import { s, sh } from './helpers';

export interface LeadForm { firstName: string; lastName: string; email: string; phone: string; gdpr: boolean; }
export const emptyLead: LeadForm = { firstName: '', lastName: '', email: '', phone: '', gdpr: false };

// Gesetzliche (m/w/d)-Anfügung — identisch zur Logik in ErgebnisBlock.
const MWD_PATTERN = /\((?:[mwdxfi](?:[\/\|][mwdxfi])+)\)/i;
function withMwd(title: string): string {
  if (!title) return title;
  if (MWD_PATTERN.test(title)) return title;
  return `${title.trimEnd()} (m/w/d)`;
}

const MARKED_FIELD_ID = '__marked_suggestions__';

export default function LeadFormBlock({ props: p, company, br, primary, leadForm, setLeadForm: _setLeadForm, onSubmit, markedSuggestions, firstName, capturedVars }: {
  props: Record<string, unknown>; company: Company; br: string; primary: string;
  leadForm: LeadForm; setLeadForm?: (f: LeadForm) => void;
  onSubmit: (form: LeadForm, customFields?: Record<string, string>) => void;
  /** Berufe, die der User auf der Ergebnis-Seite gemerkt hat. Werden als
   *  vorausgewähltes checkbox_group-Feld ganz oben im Formular angezeigt. */
  markedSuggestions?: Array<{ id: string; title: string }>;
  firstName?: string;
  capturedVars?: Record<string, string>;
}) {
  const rawFields = (p.fields as LeadFieldDef[]) ?? [];
  // If no custom fields defined, fall back to standard field set with DSGVO checkbox
  const fieldDefs: LeadFieldDef[] = rawFields.length > 0 ? rawFields : [
    { id: 'default_vorname',     type: 'text',     label: 'Vorname',        placeholder: 'Vorname',         required: true,  variable: 'vorname'     },
    { id: 'default_nachname',    type: 'text',     label: 'Nachname',       placeholder: 'Nachname',        required: false, variable: 'nachname'    },
    { id: 'default_email',       type: 'email',    label: 'E-Mail',         placeholder: 'E-Mail-Adresse',  required: true,  variable: 'email'       },
    { id: 'default_telefon',     type: 'tel',      label: 'Telefon',        placeholder: 'Telefonnummer',   required: false, variable: 'telefon'     },
    { id: 'default_praktikum',   type: 'checkbox', label: 'Ich kann mir vorstellen, in diesem Bereich ein Praktikum zu machen.', required: false, variable: 'praktikum' },
    { id: 'default_datenschutz', type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank" rel="noopener noreferrer">@companyName</a> meine Daten gemäß <a href="@datenschutzUrl" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> verarbeitet. Weitere Informationen findest du in unserem <a href="@impressumUrl" target="_blank" rel="noopener noreferrer">Impressum</a>.', required: true, variable: 'datenschutz' },
  ];
  const useFields = true;
  // Synthetisches "Interessierte Berufe"-Feld vor den normalen Feldern einfügen,
  // wenn der User im Ergebnis Berufe markiert hat. Vorauswahl = alle markierten.
  const markedTitles = useMemo(
    () => (markedSuggestions ?? []).map((m) => withMwd(m.title)),
    [markedSuggestions],
  );
  const hasMarked = markedTitles.length > 0;
  const fieldsWithMarked: LeadFieldDef[] = hasMarked
    ? [
        {
          id: MARKED_FIELD_ID,
          type: 'checkbox_group',
          label: 'Zu diesen Berufen möchtest du Infos',
          required: false,
          variable: 'interessierteBerufe',
          options: markedTitles,
        },
        ...fieldDefs,
      ]
    : fieldDefs;
  const [vals, setVals] = useState<Record<string, string>>(
    hasMarked ? { [MARKED_FIELD_ID]: markedTitles.join('|') } : {},
  );
  const varsMap = {
    companyName:    company.name,
    datenschutzUrl: company.privacyUrl ?? '',
    impressumUrl:   company.imprintUrl ?? '',
    ...(firstName ? { firstName, vorname: firstName } : {}),
    ...(capturedVars ?? {}),
  };
  const headlineText = applyVars(s(p.headline), varsMap);
  const subtextText  = applyVars(s(p.subtext),  varsMap);
  const setVal = (id: string, val: string) => setVals((prev) => ({ ...prev, [id]: val }));

  const emailField = fieldsWithMarked.find((f) => f.type === 'email');
  const emailValue = useFields ? (emailField ? (vals[emailField.id] ?? '') : '') : leadForm.email;
  const requiredCheckboxesMet = useFields
    ? fieldsWithMarked.filter((f) => f.type === 'checkbox' && f.required).every((f) => vals[f.id] === 'true')
    : leadForm.gdpr;
  const canSubmit = emailValue.includes('@') && requiredCheckboxesMet;

  const inputCls = 'w-full px-3 py-2.5 border-2 border-slate-200 text-sm focus:outline-none';

  function handleSubmit() {
    const finalForm: LeadForm = { ...leadForm };
    if (emailField) finalForm.email = vals[emailField.id] ?? '';
    const textFields = fieldsWithMarked.filter((f) => f.type === 'text');
    if (textFields[0]) finalForm.firstName = vals[textFields[0].id] ?? '';
    if (textFields[1]) finalForm.lastName = vals[textFields[1].id] ?? '';
    const telField = fieldsWithMarked.find((f) => f.type === 'tel');
    if (telField) finalForm.phone = vals[telField.id] ?? '';
    finalForm.gdpr = true; // required checkboxes already verified by canSubmit
    // customFields: variable → value. Für checkbox_group wandeln wir das
    // interne "|"-Separator-Format in eine lesbare Komma-Liste, damit die
    // Variable z.B. in Mail-Templates direkt als Text nutzbar ist.
    const cf: Record<string, string> = {};
    fieldsWithMarked.forEach((f) => {
      if (!f.variable) return;
      const raw = vals[f.id] ?? '';
      if (f.type === 'checkbox_group') {
        cf[f.variable] = raw.split('|').filter(Boolean).join(', ');
      } else if (f.type === 'checkbox') {
        cf[f.variable] = raw === 'true' ? 'ja' : 'nein';
      } else {
        cf[f.variable] = raw;
      }
    });
    onSubmit(finalForm, cf);
  }

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
      <h2 className="fp-heading text-lg font-bold mb-1 break-words">{headlineText}</h2>
      {!!subtextText && <p className="text-slate-500 text-sm mb-4">{subtextText}</p>}
      <div className="space-y-3 mt-3">
        {fieldsWithMarked.map((f) => {
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
          if (f.type === 'checkbox_group') {
            const opts = (f.options ?? []).filter(Boolean);
            const selectedSet = new Set((vals[f.id] ?? '').split('|').filter(Boolean));
            return (
              <div key={f.id}>
                {f.label && (
                  <p className="text-xs font-semibold text-slate-600 mb-1.5">
                    {f.label.replace(/<[^>]*>/g, '')}{f.required ? ' *' : ''}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-1.5">
                  {opts.map((o, i) => {
                    const checked = selectedSet.has(o);
                    return (
                      <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selectedSet);
                            if (e.target.checked) next.add(o); else next.delete(o);
                            setVal(f.id, Array.from(next).join('|'));
                          }}
                          className="fp-check"
                        />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
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
        })}
      </div>
      <button onClick={handleSubmit} disabled={!canSubmit}
        className="fp-btn w-full mt-4 py-3.5 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: br }}>
        {s(p.buttonText, 'Abschicken')}
      </button>

      {/* Berufe-Liste aus Firmenprofil */}
      {company.successPage?.showJobs && company.successPage.jobs.length > 0 && (() => {
        const jobs = company.successPage.jobs;
        const groups = [...new Set(jobs.map((j) => j.group || '').filter(Boolean))];
        const hasGroups = groups.length > 0;
        const sections = hasGroups
          ? [...groups.map((g) => ({ group: g, items: jobs.filter((j) => j.group === g) })), ...(() => { const ug = jobs.filter((j) => !j.group); return ug.length > 0 ? [{ group: '', items: ug }] : []; })()]
          : [{ group: '', items: jobs }];
        const renderJob = (job: typeof jobs[0]) => job.url ? (
          <a key={job.id} href={job.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
            style={{ borderRadius: br }}>
            {job.title}
            <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-600" />
          </a>
        ) : (
          <div key={job.id} className="bg-white border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800" style={{ borderRadius: br }}>
            {job.title}
          </div>
        );
        return (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{company.successPage.jobsHeadline || 'Unsere Ausbildungsberufe'}</h3>
            {sections.map(({ group, items }) => (
              <div key={group || '__ungrouped'} className="mb-4 last:mb-0">
                {group && <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: primary }}>{group}</p>}
                <div className="flex flex-col gap-1.5">{items.map(renderJob)}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
