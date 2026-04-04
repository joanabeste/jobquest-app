'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { careerCheckStorage, companyStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';
import { FunnelDoc } from '@/lib/funnel-types';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';
import {
  CareerCheck, Company, BerufsCheckBlock, Dimension,
  IntroBlock, VornameBlock, SelbsteinschaetzungBlock, FrageBlock, ErgebnisfrageBlock,
  TextBlock, LeadBlock, ErgebnisBlock, ButtonBlock,
  DEFAULT_CORPORATE_DESIGN,
} from '@/lib/types';

// ── Score computation ─────────────────────────────────────────────────────────
function computeScores(
  blocks: BerufsCheckBlock[],
  answers: Record<string, string | number>,
): Record<string, number> {
  const scores: Record<string, number> = {};

  blocks.forEach((block) => {
    const answer = answers[block.id];
    if (answer === undefined || answer === '') return;

    if (block.type === 'frage') {
      if (block.frageType === 'single_choice') {
        const opt = (block.options ?? []).find((o) => o.id === answer);
        if (opt) {
          Object.entries(opt.scores).forEach(([dimId, score]) => {
            scores[dimId] = (scores[dimId] ?? 0) + score;
          });
        }
      } else if (block.frageType === 'slider' && block.sliderDimensionId) {
        scores[block.sliderDimensionId] = (scores[block.sliderDimensionId] ?? 0) + Number(answer);
      }
    } else if (block.type === 'selbsteinschaetzung' && block.sliderDimensionId) {
      scores[block.sliderDimensionId] = (scores[block.sliderDimensionId] ?? 0) + Number(answer);
    } else if (block.type === 'ergebnisfrage') {
      const opt = (block.options ?? []).find((o) => o.id === answer);
      if (opt) {
        Object.entries(opt.scores).forEach(([dimId, score]) => {
          scores[dimId] = (scores[dimId] ?? 0) + score;
        });
      }
    }
  });

  return scores;
}

// ── Main player ───────────────────────────────────────────────────────────────
export default function BerufsCheckPlayer() {
  const { slug } = useParams<{ slug: string }>();
  const [check, setCheck] = useState<CareerCheck | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [funnelDoc, setFunnelDoc] = useState<FunnelDoc | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);

  // Player state
  const [step, setStep] = useState(0); // index into check.blocks
  const [firstName, setFirstName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [leadData, setLeadData] = useState({ lastName: '', email: '', phone: '', gdpr: false });
  const [submitted, setSubmitted] = useState(false);
  const [leadSaveError, setLeadSaveError] = useState(false);
  const toast = useToast();
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const c = await careerCheckStorage.getBySlug(slug);
      if (!c) { setNotFound(true); return; }
      setCheck(c);
      const co = await companyStorage.getById(c.companyId);
      setCompany(co ?? null);
      const fd = await funnelStorage.getByContentId(c.id);
      setFunnelDoc(fd ?? null);
    }
    load();
  }, [slug]);

  if (notFound) return <NotFound />;
  if (!check || !company || funnelDoc === undefined) return <Loading />;

  // If a FunnelDoc exists, render with FunnelPlayer
  if (funnelDoc) {
    return <FunnelPlayer doc={funnelDoc} company={company} contentDbId={check.id} />;
  }

  const design = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const primary = design.primaryColor;
  const br = `${design.borderRadius ?? 12}px`;

  const hfName = design.headingFontName ?? 'system';
  const bfName = design.bodyFontName ?? 'system';
  const headingFont = design.headingFontData
    ? `'${hfName}', system-ui, sans-serif`
    : hfName === 'system' ? 'system-ui, sans-serif' : `'${hfName}', system-ui, sans-serif`;
  const bodyFont = design.bodyFontData
    ? `'${bfName}', system-ui, sans-serif`
    : bfName === 'system' ? 'system-ui, sans-serif' : `'${bfName}', system-ui, sans-serif`;

  const blocks = check.blocks;
  const currentBlock = blocks[step] ?? null;

  function nextStep() { setStep((s) => Math.min(s + 1, blocks.length - 1)); }
  function prevStep() { setStep((s) => Math.max(s - 1, 0)); }

  function handleAnswer(blockId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
  }

  function handleLeadSubmit() {
    if (!check || !company) return;
    const finalScores = computeScores(blocks, answers);
    setScores(finalScores);
    const lead = {
      id: crypto.randomUUID(),
      careerCheckId: check.id,
      companyId: company.id,
      firstName,
      lastName: leadData.lastName,
      email: leadData.email,
      phone: leadData.phone || undefined,
      gdprConsent: leadData.gdpr,
      scores: finalScores,
      submittedAt: new Date().toISOString(),
    };
    fetch('/api/public/submit-career-check-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, contentId: check.id, companyName: company.name }),
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }).catch((err) => {
      console.error('[BerufsCheck] submit-career-check-lead fehlgeschlagen:', err);
      setLeadSaveError(true);
      toast.error('Deine Daten konnten leider nicht gespeichert werden.');
    });
    setSubmitted(true);
    nextStep();
  }

  // CSS injection for corporate design (including fonts)
  const css = [
    design.headingFontData
      ? `@font-face{font-family:'${hfName}';src:url('${design.headingFontData}')}`
      : (!design.headingFontData && hfName !== 'system'
        ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(hfName)}:wght@400;600;700&display=swap')`
        : ''),
    design.bodyFontData && bfName !== hfName
      ? `@font-face{font-family:'${bfName}';src:url('${design.bodyFontData}')}`
      : (!design.bodyFontData && bfName !== 'system' && bfName !== hfName
        ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(bfName)}:wght@400;600;700&display=swap')`
        : ''),
    `.bc-player{font-family:${bodyFont};color:${design.textColor ?? '#1e293b'}}`,
    `.bc-btn-primary{background:${primary};color:#fff;border-radius:${br}}`,
    `.bc-btn-primary:hover{opacity:0.9}`,
    `.bc-btn-secondary{background:transparent;color:${primary};border:2px solid ${primary};border-radius:${br}}`,
    `.bc-card{border-radius:${br}}`,
    `.bc-option{border-radius:${br};border:2px solid #e2e8f0}`,
    `.bc-option:hover{border-color:${primary}}`,
    `.bc-option.selected{border-color:${primary};background:${primary}15}`,
    `.bc-heading{color:${design.headingColor ?? '#0f172a'};font-family:${headingFont}}`,
    `.bc-progress{background:${primary}}`,
  ].filter(Boolean).join('\n');

  // Progress: count all interactive question blocks
  const questionBlocks = blocks.filter((b) => b.type === 'frage' || b.type === 'selbsteinschaetzung' || b.type === 'ergebnisfrage');
  const answeredFrageCount = questionBlocks.filter((b) => answers[b.id] !== undefined).length;
  const frageProgress = questionBlocks.length > 0 ? (answeredFrageCount / questionBlocks.length) * 100 : 0;

  return (
    <div className="bc-player min-h-screen bg-slate-50 flex flex-col">
      <style>{css}</style>

      {/* Lead save error banner */}
      {leadSaveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
          <span className="flex-1">Deine Daten konnten leider nicht gespeichert werden. Bitte kontaktiere uns direkt.</span>
          <button onClick={() => setLeadSaveError(false)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Progress bar */}
      {questionBlocks.length > 0 && (
        <div className="h-1 bg-slate-200 w-full">
          <div className="h-1 bc-progress transition-all duration-500" style={{ width: `${frageProgress}%` }} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          {currentBlock ? (
            <BlockRenderer
              block={currentBlock}
              firstName={firstName}
              answers={answers}
              leadData={leadData}
              submitted={submitted}
              scores={scores}
              dimensions={check.dimensions}
              company={company}
              primaryColor={primary}
              onAnswer={handleAnswer}
              onNext={nextStep}
              onPrev={prevStep}
              onFirstName={setFirstName}
              onLeadData={setLeadData}
              onLeadSubmit={handleLeadSubmit}
              isFirst={step === 0}
              isLast={step === blocks.length - 1}
            />
          ) : (
            <div className="text-center text-slate-400">Keine Blöcke vorhanden.</div>
          )}
        </div>
      </div>

      {(company.privacyUrl || company.imprintUrl) && (
        <div className="flex justify-center gap-5 py-3 text-xs text-slate-400">
          {company.privacyUrl && (
            <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              Datenschutz
            </a>
          )}
          {company.imprintUrl && (
            <a href={company.imprintUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">
              Impressum
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Block renderer ────────────────────────────────────────────────────────────
function BlockRenderer(props: {
  block: BerufsCheckBlock;
  firstName: string;
  answers: Record<string, string | number>;
  leadData: { lastName: string; email: string; phone: string; gdpr: boolean };
  submitted: boolean;
  scores: Record<string, number>;
  dimensions: Dimension[];
  company: Company;
  primaryColor: string;
  onAnswer: (id: string, value: string | number) => void;
  onNext: () => void;
  onPrev: () => void;
  onFirstName: (v: string) => void;
  onLeadData: (d: { lastName: string; email: string; phone: string; gdpr: boolean }) => void;
  onLeadSubmit: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { block } = props;
  switch (block.type) {
    case 'intro': return <IntroRenderer block={block} onNext={props.onNext} />;
    case 'vorname': return <VornameRenderer block={block} value={props.firstName} onChange={props.onFirstName} onNext={props.onNext} />;
    case 'selbsteinschaetzung': return <SelbsteinschaetzungRenderer block={block} answer={props.answers[block.id]} onAnswer={(v) => props.onAnswer(block.id, v)} onNext={props.onNext} onPrev={props.onPrev} isFirst={props.isFirst} />;
    case 'frage': return <FrageRenderer block={block} answer={props.answers[block.id]} onAnswer={(v) => props.onAnswer(block.id, v)} onNext={props.onNext} onPrev={props.onPrev} isFirst={props.isFirst} />;
    case 'ergebnisfrage': return <ErgebnisfrageRenderer block={block} answer={props.answers[block.id]} onAnswer={(v) => props.onAnswer(block.id, v)} onNext={props.onNext} onPrev={props.onPrev} isFirst={props.isFirst} />;
    case 'text': return <TextRenderer block={block} onNext={props.onNext} onPrev={props.onPrev} isFirst={props.isFirst} />;
    case 'lead': return <LeadRenderer block={block} leadData={props.leadData} company={props.company} onLeadData={props.onLeadData} onSubmit={props.onLeadSubmit} onPrev={props.onPrev} />;
    case 'ergebnis': return <ErgebnisRenderer block={block} firstName={props.firstName} scores={props.scores} dimensions={props.dimensions} primaryColor={props.primaryColor} />;
    case 'button': return <ButtonRenderer block={block} />;
  }
}

// ── Intro ─────────────────────────────────────────────────────────────────────
function IntroRenderer({ block, onNext }: { block: IntroBlock; onNext: () => void }) {
  return (
    <div className="bc-card bg-white shadow-sm p-8 text-center space-y-5">
      {block.imageUrl && (
         
        <img src={block.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl mb-2" />
      )}
      <h1 className="bc-heading text-2xl font-bold">{block.headline}</h1>
      <p className="text-slate-600 leading-relaxed">{block.subtext}</p>
      <button onClick={onNext} className="bc-btn-primary px-8 py-3 font-semibold text-sm transition-opacity">
        {block.buttonText}
      </button>
    </div>
  );
}

// ── Vorname ───────────────────────────────────────────────────────────────────
function VornameRenderer({ block, value, onChange, onNext }: {
  block: VornameBlock; value: string; onChange: (v: string) => void; onNext: () => void;
}) {
  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-5">
      <h2 className="bc-heading text-xl font-bold">{block.question}</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={block.placeholder ?? 'Dein Vorname'}
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-colors"
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onNext()}
        autoFocus
      />
      <button
        onClick={onNext}
        disabled={!value.trim()}
        className="bc-btn-primary w-full py-3 font-semibold text-sm transition-opacity disabled:opacity-50"
      >
        {block.buttonText}
      </button>
    </div>
  );
}

// ── Frage ─────────────────────────────────────────────────────────────────────
function FrageRenderer({ block, answer, onAnswer, onNext, onPrev, isFirst }: {
  block: FrageBlock;
  answer: string | number | undefined;
  onAnswer: (v: string | number) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
}) {
  const sliderMin = block.sliderMin ?? 0;
  const sliderMax = block.sliderMax ?? 10;
  const sliderStep = block.sliderStep ?? 1;
  const sliderValue = typeof answer === 'number' ? answer : Math.floor((sliderMin + sliderMax) / 2);

  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-6">
      <h2 className="bc-heading text-xl font-bold">{block.question}</h2>

      {block.frageType === 'single_choice' && (
        <div className="space-y-2">
          {(block.options ?? []).map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onAnswer(opt.id); }}
              className={`bc-option w-full text-left px-4 py-3 text-sm transition-all ${answer === opt.id ? 'selected' : ''}`}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {block.frageType === 'slider' && (
        <div className="space-y-4">
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={sliderValue}
            onChange={(e) => onAnswer(parseInt(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{block.sliderLabelMin || sliderMin}</span>
            <span className="font-semibold text-slate-800 text-sm">{sliderValue}</span>
            <span>{block.sliderLabelMax || sliderMax}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {!isFirst && (
          <button onClick={onPrev} className="bc-btn-secondary px-6 py-2.5 text-sm font-medium transition-colors">
            Zurück
          </button>
        )}
        <button
          onClick={onNext}
          disabled={block.frageType === 'single_choice' && answer === undefined}
          className="bc-btn-primary flex-1 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

// ── Selbsteinschätzung ────────────────────────────────────────────────────────
function SelbsteinschaetzungRenderer({ block, answer, onAnswer, onNext, onPrev, isFirst }: {
  block: SelbsteinschaetzungBlock;
  answer: string | number | undefined;
  onAnswer: (v: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
}) {
  const min = block.sliderMin ?? 0;
  const max = block.sliderMax ?? 10;
  const step = block.sliderStep ?? 1;
  const value = typeof answer === 'number' ? answer : Math.floor((min + max) / 2);

  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-6">
      <div className="space-y-1">
        <h2 className="bc-heading text-xl font-bold">{block.question}</h2>
        {block.description && <p className="text-slate-500 text-sm leading-relaxed">{block.description}</p>}
      </div>

      <div className="space-y-4 pt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onAnswer(parseInt(e.target.value))}
          className="w-full accent-violet-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{block.sliderLabelMin || min}</span>
          <span className="font-semibold text-slate-800 text-sm">{value}</span>
          <span>{block.sliderLabelMax || max}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {!isFirst && (
          <button onClick={onPrev} className="bc-btn-secondary px-6 py-2.5 text-sm font-medium transition-colors">
            Zurück
          </button>
        )}
        <button onClick={() => { onAnswer(value); onNext(); }}
          className="bc-btn-primary flex-1 py-2.5 text-sm font-semibold transition-opacity">
          Weiter
        </button>
      </div>
    </div>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────────
function TextRenderer({ block, onNext, onPrev, isFirst }: {
  block: TextBlock;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
}) {
  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-5">
      {block.headline && <h2 className="bc-heading text-xl font-bold">{block.headline}</h2>}
      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{block.content}</p>
      <div className="flex gap-3 pt-2">
        {!isFirst && (
          <button onClick={onPrev} className="bc-btn-secondary px-6 py-2.5 text-sm font-medium transition-colors">
            Zurück
          </button>
        )}
        <button onClick={onNext} className="bc-btn-primary flex-1 py-2.5 text-sm font-semibold transition-opacity">
          {block.buttonText}
        </button>
      </div>
    </div>
  );
}

// ── Ergebnisfrage ─────────────────────────────────────────────────────────────
function ErgebnisfrageRenderer({ block, answer, onAnswer, onNext, onPrev, isFirst }: {
  block: ErgebnisfrageBlock;
  answer: string | number | undefined;
  onAnswer: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
}) {
  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-6">
      <div className="space-y-1">
        <h2 className="bc-heading text-xl font-bold">{block.question}</h2>
        {block.description && <p className="text-slate-500 text-sm leading-relaxed">{block.description}</p>}
      </div>

      <div className="space-y-2">
        {(block.options ?? []).map((opt) => (
          <button
            key={opt.id}
            onClick={() => onAnswer(opt.id)}
            className={`bc-option w-full text-left px-4 py-3 text-sm transition-all ${answer === opt.id ? 'selected' : ''}`}
          >
            {opt.text}
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        {!isFirst && (
          <button onClick={onPrev} className="bc-btn-secondary px-6 py-2.5 text-sm font-medium transition-colors">
            Zurück
          </button>
        )}
        <button
          onClick={onNext}
          disabled={answer === undefined}
          className="bc-btn-primary flex-1 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

// ── Lead form ─────────────────────────────────────────────────────────────────
function LeadRenderer({ block, leadData, company, onLeadData, onSubmit, onPrev }: {
  block: LeadBlock;
  leadData: { lastName: string; email: string; phone: string; gdpr: boolean };
  company: Company;
  onLeadData: (d: { lastName: string; email: string; phone: string; gdpr: boolean }) => void;
  onSubmit: () => void;
  onPrev: () => void;
}) {
  const privacyText = block.privacyText.replace(/\{\{company\}\}|@companyName/g, company.name);
  const u = (partial: Partial<typeof leadData>) => onLeadData({ ...leadData, ...partial });

  const canSubmit = leadData.email.includes('@') && leadData.gdpr;

  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-5">
      <h2 className="bc-heading text-xl font-bold">{block.headline}</h2>
      <p className="text-slate-600 text-sm">{block.subtext}</p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Vorname" readOnly disabled
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400" />
          <input type="text" placeholder="Nachname" value={leadData.lastName}
            onChange={(e) => u({ lastName: e.target.value })}
            className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-colors" />
        </div>
        <input type="email" placeholder="E-Mail-Adresse *" value={leadData.email}
          onChange={(e) => u({ email: e.target.value })}
          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-colors" />
        {block.showPhone && (
          <input type="tel" placeholder="Telefonnummer" value={leadData.phone}
            onChange={(e) => u({ phone: e.target.value })}
            className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 transition-colors" />
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={leadData.gdpr} onChange={(e) => u({ gdpr: e.target.checked })}
          className="mt-0.5 flex-shrink-0 accent-violet-600" />
        <span className="text-xs text-slate-500 leading-relaxed">{privacyText} *</span>
      </label>

      <div className="flex gap-3">
        <button onClick={onPrev} className="bc-btn-secondary px-5 py-2.5 text-sm font-medium transition-colors">
          Zurück
        </button>
        <button onClick={onSubmit} disabled={!canSubmit}
          className="bc-btn-primary flex-1 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50">
          {block.buttonText}
        </button>
      </div>
    </div>
  );
}

// ── Ergebnis ──────────────────────────────────────────────────────────────────
function ErgebnisRenderer({ block, firstName, scores, dimensions, primaryColor }: {
  block: ErgebnisBlock;
  firstName: string;
  scores: Record<string, number>;
  dimensions: Dimension[];
  primaryColor: string;
}) {
  const headline = block.headline.replace(/\{\{name\}\}|@firstName/g, firstName || 'du');

  // Compute percentages
  const maxScore = Math.max(...Object.values(scores), 1);
  const scoredDimensions = dimensions
    .map((d) => ({ dim: d, score: scores[d.id] ?? 0, pct: Math.round(((scores[d.id] ?? 0) / maxScore) * 100) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="bc-card bg-white shadow-sm p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${primaryColor}20` }}>
          <span className="text-2xl">🎉</span>
        </div>
        <h2 className="bc-heading text-2xl font-bold">{headline}</h2>
        <p className="text-slate-600 text-sm leading-relaxed">{block.subtext}</p>
      </div>

      {block.showDimensionBars && scoredDimensions.length > 0 && (
        <div className="space-y-3">
          {scoredDimensions.map(({ dim, pct }) => (
            <div key={dim.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{dim.name}</span>
                <span className="text-slate-500">{pct}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: dim.color ?? primaryColor }}
                />
              </div>
              {dim.description && <p className="text-xs text-slate-400 mt-0.5">{dim.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
function ButtonRenderer({ block }: { block: ButtonBlock }) {
  return (
    <div className="bc-card bg-white shadow-sm p-8 text-center">
      {block.url ? (
        <a href={block.url} target="_blank" rel="noopener noreferrer"
          className={`inline-block px-8 py-3 text-sm font-semibold transition-opacity ${
            block.style === 'primary' ? 'bc-btn-primary' : 'bc-btn-secondary'
          }`}>
          {block.text}
        </a>
      ) : (
        <span className="inline-block px-8 py-3 text-sm font-semibold bg-slate-100 text-slate-400 rounded-xl">
          {block.text}
        </span>
      )}
    </div>
  );
}

// ── Misc ──────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Nicht gefunden</h1>
        <p className="text-slate-500 text-sm">Dieser Berufscheck existiert nicht oder wurde noch nicht veröffentlicht.</p>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
