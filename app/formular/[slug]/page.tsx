'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { formPageStorage, formSubmissionStorage, companyStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';
import { FunnelDoc } from '@/lib/funnel-types';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';
import {
  FormPage, Company, FormContentBlock, FormStep, FormField,
  DEFAULT_CORPORATE_DESIGN,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { fontFamilyFor } from '@/lib/fonts';
import { useSlugRedirect } from '@/lib/use-slug-redirect';

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyDesign(company: Company) {
  const cd = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const bfName = cd.bodyFontName ?? 'system';
  const bodyFont = cd.bodyFontData
    ? `'${bfName}', system-ui, sans-serif`
    : bfName === 'system' ? undefined : `'${bfName}', system-ui, sans-serif`;
  return {
    '--cd-primary': cd.primaryColor,
    '--cd-accent': cd.accentColor,
    '--cd-text': cd.textColor,
    '--cd-heading': cd.headingColor,
    '--cd-radius': `${cd.borderRadius}px`,
    color: cd.textColor,
    ...(bodyFont ? { fontFamily: bodyFont } : {}),
  } as React.CSSProperties;
}

// ── Content block renderers ───────────────────────────────────────────────────

function HeroSection({
  block,
  onCtaClick,
}: {
  block: Extract<FormContentBlock, { type: 'hero' }>;
  onCtaClick: () => void;
}) {
  return (
    <div className="relative min-h-[420px] flex items-center justify-center text-center overflow-hidden bg-[var(--cd-primary)]">
      {block.imageUrl && (
        <img
          src={block.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <h1
          className="text-4xl font-bold text-white mb-4 leading-tight"
          style={{ fontFamily: 'inherit' }}
        >
          {block.headline}
        </h1>
        {block.subtext && (
          <p className="text-white/80 text-lg mb-8 leading-relaxed">{block.subtext}</p>
        )}
        {block.ctaText && (
          <button
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-[var(--cd-radius)] text-[var(--cd-primary)] bg-white font-semibold text-base shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            {block.ctaText}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function TextSection({ block }: { block: Extract<FormContentBlock, { type: 'text_section' }> }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {block.headline && (
        <h2
          className="text-2xl font-bold mb-4"
          style={{ color: 'var(--cd-heading)' }}
        >
          {block.headline}
        </h2>
      )}
      <p
        className="text-base leading-relaxed whitespace-pre-wrap"
        style={{ color: 'var(--cd-text)' }}
      >
        {block.content}
      </p>
    </div>
  );
}

function ImageSection({ block }: { block: Extract<FormContentBlock, { type: 'image_section' }> }) {
  if (!block.imageUrl) return null;
  return (
    <div className="py-6">
      <img
        src={block.imageUrl}
        alt={block.caption ?? ''}
        className="w-full max-h-[480px] object-cover"
      />
      {block.caption && (
        <p className="text-center text-sm text-slate-500 mt-2 px-6">{block.caption}</p>
      )}
    </div>
  );
}

// ── Field renderer ────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const baseClass =
    'w-full px-4 py-3 rounded-[var(--cd-radius)] border bg-white text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--cd-primary)]/30 focus:border-[var(--cd-primary)]';
  const errClass = error ? 'border-red-400' : 'border-slate-200';

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cd-text)' }}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          rows={4}
          className={`${baseClass} ${errClass} resize-none`}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cd-text)' }}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          className={`${baseClass} ${errClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.placeholder || 'Bitte wählen…'}</option>
          {(field.options ?? []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--cd-text)' }}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          {(field.options ?? []).map((opt, i) => (
            <label
              key={i}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-[var(--cd-radius)] border border-slate-200 hover:border-[var(--cd-primary)]/50 transition-colors"
              style={{ backgroundColor: value === opt ? 'var(--cd-primary)08' : undefined }}
            >
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="accent-[var(--cd-primary)]"
              />
              <span className="text-sm" style={{ color: 'var(--cd-text)' }}>{opt}</span>
            </label>
          ))}
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  // text, email, phone
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--cd-text)' }}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
        className={`${baseClass} ${errClass}`}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── Multi-step form ───────────────────────────────────────────────────────────

function MultiStepForm({
  form,
  formSteps,
  companyName,
  onSubmit,
}: {
  form: FormPage;
  formSteps: FormStep[];
  companyName: string;
  onSubmit: (answers: Record<string, string>, gdprConsent: boolean) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [gdpr, setGdpr] = useState(false);
  const [gdprError, setGdprError] = useState(false);

  const config = form.formConfig;
  const currentStep = formSteps[stepIndex];
  const isLast = stepIndex === formSteps.length - 1;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    currentStep.fields.forEach((f) => {
      if (f.required && !answers[f.id]?.trim()) {
        newErrors[f.id] = 'Dieses Feld ist erforderlich.';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (isLast) {
      if (!gdpr) { setGdprError(true); return; }
      onSubmit(answers, gdpr);
    } else {
      setStepIndex((i) => i + 1);
      setErrors({});
    }
  };

  const privacyText = config.privacyText.replace(/\{\{company\}\}|@companyName/g, companyName);

  return (
    <div id="formular-section" className="max-w-xl mx-auto px-6 py-12">
      {/* Headline */}
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--cd-heading)' }}>
        {config.headline}
      </h2>

      {/* Step indicator */}
      {formSteps.length > 1 && (
        <div className="flex items-center gap-2 mb-8">
          {formSteps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={{
                  backgroundColor: i <= stepIndex ? 'var(--cd-primary)' : undefined,
                  color: i <= stepIndex ? '#fff' : undefined,
                  border: i <= stepIndex ? 'none' : '2px solid #cbd5e1',
                }}
              >
                {i < stepIndex ? <Check size={12} /> : i + 1}
              </div>
              {i < formSteps.length - 1 && (
                <div
                  className="h-0.5 w-8 rounded-full transition-colors"
                  style={{ backgroundColor: i < stepIndex ? 'var(--cd-primary)' : '#e2e8f0' }}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-slate-500">
            Schritt {stepIndex + 1} von {formSteps.length}
          </span>
        </div>
      )}

      {/* Step title & description */}
      {currentStep.title && (
        <p className="font-semibold text-slate-800 mb-1">{currentStep.title}</p>
      )}
      {currentStep.description && (
        <p className="text-sm text-slate-500 mb-5">{currentStep.description}</p>
      )}

      {/* Fields */}
      <div className="space-y-5">
        {currentStep.fields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={answers[field.id] ?? ''}
            onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
            error={errors[field.id]}
          />
        ))}
      </div>

      {/* GDPR on last step */}
      {isLast && (
        <label className="flex items-start gap-3 cursor-pointer mt-6">
          <input
            type="checkbox"
            checked={gdpr}
            onChange={(e) => { setGdpr(e.target.checked); setGdprError(false); }}
            className="mt-0.5 accent-[var(--cd-primary)]"
          />
          <span className="text-xs text-slate-500 leading-relaxed">{privacyText}</span>
        </label>
      )}
      {gdprError && (
        <p className="text-red-500 text-xs mt-1">Bitte stimme der Datenschutzerklärung zu.</p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        {stepIndex > 0 && (
          <button
            onClick={() => { setStepIndex((i) => i - 1); setErrors({}); }}
            className="flex items-center gap-1.5 px-5 py-3 rounded-[var(--cd-radius)] border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} />
            Zurück
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--cd-radius)] text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--cd-primary)' }}
        >
          {isLast ? config.submitButtonText : 'Weiter'}
          {!isLast && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Thank-you screen ──────────────────────────────────────────────────────────

function ThankYou({ headline, text }: { headline: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--cd-primary)' }}
      >
        <Check size={30} className="text-white" />
      </div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--cd-heading)' }}>
        {headline}
      </h2>
      <p className="text-slate-500 max-w-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FormularPage() {
  const { slug } = useParams<{ slug: string }>();
  const [formPage, setFormPage] = useState<FormPage | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [funnelDoc, setFunnelDoc] = useState<FunnelDoc | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const redirecting = useSlugRedirect(slug, 'form_page', '/formular', notFound);
  const [submitted, setSubmitted] = useState(false);

  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const fp = await formPageStorage.getBySlug(slug);
      if (!fp) { setNotFound(true); return; }
      const co = await companyStorage.getById(fp.companyId);
      if (!co) { setNotFound(true); return; }
      setFormPage(fp);
      setCompany(co);
      const fd = await funnelStorage.getByContentId(fp.id);
      setFunnelDoc(fd ?? null);
    }
    load();
  }, [slug]);

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-300 mb-3">404</p>
          <p className="text-slate-500">Dieses Formular wurde nicht gefunden.</p>
        </div>
      </div>
    );
  }

  if (!formPage || !company || funnelDoc === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
      </div>
    );
  }

  // If a FunnelDoc exists, render with FunnelPlayer
  if (funnelDoc) {
    return <FunnelPlayer doc={funnelDoc} company={company} contentDbId={formPage.id} />;
  }

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (answers: Record<string, string>, gdprConsent: boolean) => {
    formSubmissionStorage.save({
      id: uuidv4(),
      formPageId: formPage.id,
      companyId: formPage.companyId,
      answers,
      gdprConsent,
      submittedAt: new Date().toISOString(),
    });

    // Extract name/email from answers for email vars
    const allFields = (formPage.formSteps ?? []).flatMap((s) => s.fields);
    let firstName = '', lastName = '', email = '', phone = '';
    allFields.forEach((f) => {
      const v = answers[f.id] ?? '';
      const lbl = f.label.toLowerCase();
      if (!email && f.type === 'email' && v) email = v;
      if (!phone && f.type === 'phone' && v) phone = v;
      if (!firstName && (lbl.includes('vorname') || lbl === 'name') && v) firstName = v;
      if (!lastName && lbl.includes('nachname') && v) lastName = v;
    });

    // Send emails via API (email config lives in FunnelDoc linked to this FormPage)
    try {
      await fetch('/api/public/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
            id: uuidv4(),
            jobQuestId: formPage.id,
            companyId: formPage.companyId,
            firstName,
            lastName,
            email,
            phone: phone || undefined,
            gdprConsent,
            submittedAt: new Date().toISOString(),
          },
          contentId: formPage.id,
          companyName: company.name,
          karriereseiteUrl: company.careerPageUrl ?? '',
        }),
      });
    } catch {
      // Email failure is non-blocking — submission already saved locally
    }

    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cd = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const hfName = cd.headingFontName ?? 'system';
  const bfName = cd.bodyFontName ?? 'system';
  const headingFont = cd.headingFontData
    ? `'${hfName}', system-ui, sans-serif`
    : hfName === 'system' ? 'system-ui, sans-serif' : fontFamilyFor(hfName);

  const formCss = [
    cd.headingFontData ? `@font-face{font-family:'${hfName}';src:url('${cd.headingFontData}')}` : '',
    cd.bodyFontData && bfName !== hfName ? `@font-face{font-family:'${bfName}';src:url('${cd.bodyFontData}')}` : '',
    `h1,h2,h3,h4{font-family:${headingFont};color:${cd.headingColor ?? '#0f172a'};letter-spacing:${(cd.headingLetterSpacing ?? 0) / 1000}em}`,
    `body{letter-spacing:${(cd.bodyLetterSpacing ?? 0) / 1000}em}`,
    `input:focus,textarea:focus,select:focus{border-color:${cd.primaryColor}!important;outline:none}`,
  ].filter(Boolean).join('\n');

  return (
    <div className="min-h-screen bg-white" style={applyDesign(company)}>
      <style>{formCss}</style>

      {submitted ? (
        <ThankYou
          headline={formPage.formConfig.thankYouHeadline}
          text={formPage.formConfig.thankYouText}
        />
      ) : (
        <>
          {/* Content blocks */}
          {formPage.contentBlocks.map((block) => {
            if (block.type === 'hero') {
              return (
                <HeroSection
                  key={block.id}
                  block={block}
                  onCtaClick={scrollToForm}
                />
              );
            }
            if (block.type === 'text_section') {
              return <TextSection key={block.id} block={block} />;
            }
            if (block.type === 'image_section') {
              return <ImageSection key={block.id} block={block} />;
            }
            return null;
          })}

          {/* Divider before form */}
          {formPage.contentBlocks.length > 0 && (
            <div className="border-t border-slate-100" />
          )}

          {/* Multi-step form */}
          <div ref={formSectionRef}>
            {formPage.formSteps.length > 0 ? (
              <MultiStepForm
                form={formPage}
                formSteps={formPage.formSteps}
                companyName={company.name}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="max-w-xl mx-auto px-6 py-16 text-center text-slate-400 text-sm">
                Noch keine Formular-Schritte konfiguriert.
              </div>
            )}
          </div>
        </>
      )}

      {/* Legal footer */}
      {(company.privacyUrl || company.imprintUrl) && (
        <div className="flex justify-center gap-5 py-3 text-xs text-slate-400 border-t border-slate-100 bg-white">
          {company.privacyUrl && (
            <a
              href={company.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Datenschutz
            </a>
          )}
          {company.imprintUrl && (
            <a
              href={company.imprintUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              Impressum
            </a>
          )}
        </div>
      )}
    </div>
  );
}
