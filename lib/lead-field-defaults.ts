import type { LeadFieldDef } from './funnel-types';

/**
 * Default lead-form fields injected when an AI-generated check_lead / quest_lead
 * block leaves `fields: []`. The renderer (LeadFormBlock) also falls back to
 * a similar shape, but the AI route persists fields to the saved doc so the
 * user can edit them in the inspector right away.
 */
export function defaultLeadFields(): LeadFieldDef[] {
  return [
    { id: crypto.randomUUID(), type: 'text',     label: 'Vorname',   placeholder: 'Vorname',         required: true,  variable: 'vorname'    },
    { id: crypto.randomUUID(), type: 'text',     label: 'Nachname',  placeholder: 'Nachname',        required: false, variable: 'nachname'   },
    { id: crypto.randomUUID(), type: 'email',    label: 'E-Mail',    placeholder: 'E-Mail-Adresse',  required: true,  variable: 'email'      },
    { id: crypto.randomUUID(), type: 'tel',      label: 'Telefon',   placeholder: 'Telefonnummer',   required: false, variable: 'telefon'    },
    { id: crypto.randomUUID(), type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank" rel="noopener noreferrer">@companyName</a> meine Daten gemäß <a href="@datenschutzUrl" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> verarbeitet. <a href="@impressumUrl" target="_blank" rel="noopener noreferrer">Impressum</a>', required: true, variable: 'datenschutz' },
  ];
}
