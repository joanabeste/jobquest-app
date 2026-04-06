'use client';

import { Company, LeadFormConfig } from '@/lib/types';

export interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gdprConsent: boolean;
}

export function LeadForm({ form, setForm, onSubmit, error, company, config }: {
  form: LeadFormData;
  setForm: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  company: Company;
  config: LeadFormConfig;
}) {
  const privacyText = config.privacyText.replace(/\{\{company\}\}|@companyName/g, company.name);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="quest-heading text-2xl font-bold">{config.headline}</h2>
        <p className="text-slate-600 mt-2">{config.subtext}</p>
      </div>

      <div className="card p-6">
        <h3 className="quest-heading font-semibold mb-4 flex items-center gap-2">
          <span>📋</span> Jetzt bewerben bei {company.name}
        </h3>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vorname *</label>
              <input className="input-field" required value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="Max" />
            </div>
            <div>
              <label className="label">Nachname *</label>
              <input className="input-field" required value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Muster" />
            </div>
          </div>

          <div>
            <label className="label">E-Mail-Adresse *</label>
            <input type="email" className="input-field" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="max@beispiel.de" />
          </div>

          {config.showPhone && (
            <div>
              <label className="label">Telefonnummer</label>
              <input type="tel" className="input-field" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+49 123 456789" />
            </div>
          )}

          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="gdpr"
              className="quest-checkbox mt-0.5 w-4 h-4 rounded border-slate-300 cursor-pointer"
              checked={form.gdprConsent}
              onChange={(e) => setForm((p) => ({ ...p, gdprConsent: e.target.checked }))}
            />
            <label htmlFor="gdpr" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
              {privacyText} *
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center py-3 text-base">
            {config.buttonText}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-3 text-center">
          Ansprechpartner: {company.contactName} · {company.contactEmail}
        </p>
      </div>
    </div>
  );
}

export function ThankYou({ company, config }: { company: Company; config: LeadFormConfig }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="quest-heading text-2xl font-bold mb-3">{config.thankYouHeadline}</h2>
      <p className="text-slate-600 mb-2">{config.thankYouText}</p>
      <p className="text-slate-600">
        {company.contactName} von {company.name} wird sich in Kürze bei dir melden.
      </p>
      <div className="quest-thankyou-box mt-6 rounded-xl p-4">
        <p className="text-sm font-medium">Wir freuen uns auf dich! 🎊</p>
      </div>
    </div>
  );
}
