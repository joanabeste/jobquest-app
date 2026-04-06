'use client';

import { useState, useEffect, useRef } from 'react';
import { JobQuest, QuestModule, Company, DecisionModule, DialogModule, DEFAULT_CORPORATE_DESIGN, DEFAULT_LEAD_CONFIG } from '@/lib/types';
import { leadStorage, analyticsStorage } from '@/lib/storage';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ModuleRenderer from './QuestModules';
import { LeadForm, ThankYou, LeadFormData } from './QuestLeadForm';

interface Props {
  quest: JobQuest;
  company: Company;
}

export default function QuestPlayer({ quest, company }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [dialogStep, setDialogStep] = useState<Record<string, number>>({});
  const [leadForm, setLeadForm] = useState<LeadFormData>({
    firstName: '', lastName: '', email: '', phone: '', gdprConsent: false,
  });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [startTime] = useState(Date.now());
  const sessionId = useRef(crypto.randomUUID()).current;
  const [sequence, setSequence] = useState<QuestModule[]>([...quest.modules]);

  const design = company.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;
  const primary = design.primaryColor || DEFAULT_CORPORATE_DESIGN.primaryColor;
  const textColor = design.textColor || DEFAULT_CORPORATE_DESIGN.textColor;
  const headingColor = design.headingColor || DEFAULT_CORPORATE_DESIGN.headingColor;
  const br = `${design.borderRadius}px`;
  const headingFontName = design.headingFontName ?? 'system';
  const bodyFontName = design.bodyFontName ?? 'system';
  const headingFontFamily = design.headingFontData
    ? `'${headingFontName}', system-ui, sans-serif`
    : headingFontName === 'system' ? 'inherit' : `'${headingFontName}', system-ui, sans-serif`;
  const bodyFontFamily = design.bodyFontData
    ? `'${bodyFontName}', system-ui, sans-serif`
    : bodyFontName === 'system' ? 'inherit' : `'${bodyFontName}', system-ui, sans-serif`;
  const questCss = [
    design.headingFontData ? `@font-face{font-family:'${headingFontName}';src:url('${design.headingFontData}')}` : '',
    design.bodyFontData ? `@font-face{font-family:'${bodyFontName}';src:url('${design.bodyFontData}')}` : '',
    `.quest-cd{font-family:${bodyFontFamily};color:${textColor}}`,
    `.quest-cd .quest-heading{font-family:${headingFontFamily};color:${headingColor}}`,
    `.quest-cd .quest-logo-bg{background-color:${primary}}`,
    `.quest-cd .quest-progress{background-color:${primary}}`,
    `.quest-cd .quest-btn-next{background-color:${primary};border-radius:${br}}`,
    `.quest-cd .quest-btn-next:hover{filter:brightness(0.85)}`,
    `.quest-cd .btn-primary{background-color:${primary};border-radius:${br}}`,
    `.quest-cd .btn-primary:hover{filter:brightness(0.85)}`,
    `.quest-cd .quest-badge{color:${primary}}`,
    `.quest-cd .quest-dialog-avatar{background-color:${primary}22;color:${primary}}`,
    `.quest-cd .quest-dialog-more:hover{border-color:${primary}66;background-color:${primary}0f;color:${primary}}`,
    `.quest-cd .quest-option-default:hover{border-color:${primary}99;background-color:${primary}12}`,
    `.quest-cd .quest-option-default,.quest-cd .quest-option-selected{border-radius:${br}}`,
    `.quest-cd .quest-option-selected{border-color:${primary};background-color:${primary}18;color:${primary}}`,
    `.quest-cd .quest-decision-feedback{background-color:${primary}12;border-color:${primary}44;color:${primary};border-radius:${br}}`,
    `.quest-cd .chat-bubble-right{background-color:${primary};color:white}`,
    `.quest-cd .quest-thankyou-box{background-color:${primary}15;color:${primary}}`,
    `.quest-cd .quest-checkbox{accent-color:${primary}}`,
    `.quest-cd .quest-icon-tint{background-color:${primary}18}`,
    `.quest-cd .card{border-radius:${br}}`,
  ].filter(Boolean).join('\n');

  const totalSteps = sequence.length + 1;

  useEffect(() => {
    analyticsStorage.save({
      id: crypto.randomUUID(), jobQuestId: quest.id, type: 'view', sessionId, timestamp: new Date().toISOString(),
    });
  }, [quest.id, sessionId]);

  useEffect(() => {
    if (step === 1) {
      analyticsStorage.save({
        id: crypto.randomUUID(), jobQuestId: quest.id, type: 'start', sessionId, timestamp: new Date().toISOString(),
      });
    }
  }, [step, quest.id, sessionId]);

  useEffect(() => {
    const toLoad = [
      !design.headingFontData && headingFontName !== 'system' ? headingFontName : null,
      !design.bodyFontData && bodyFontName !== 'system' && bodyFontName !== headingFontName ? bodyFontName : null,
    ].filter(Boolean) as string[];
    const links = toLoad.map((name) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700&display=swap`;
      document.head.appendChild(link);
      return link;
    });
    return () => { links.forEach((l) => document.head.removeChild(l)); };
  }, [headingFontName, bodyFontName, design.headingFontData, design.bodyFontData]);

  function handleDecisionSelect(decisionModule: DecisionModule, optionId: string) {
    setAnswers((p) => ({ ...p, [decisionModule.id]: optionId }));
    setShowFeedback((p) => ({ ...p, [decisionModule.id]: true }));
    const option = decisionModule.options.find((o) => o.id === optionId);
    if (option?.branchModules?.length) {
      setSequence((prev) => {
        const idx = prev.findIndex((m) => m.id === decisionModule.id);
        if (idx < 0) return prev;
        return [...prev.slice(0, idx + 1), ...option.branchModules!, ...prev.slice(idx + 1)];
      });
    }
  }

  function canProceed(): boolean {
    if (step >= sequence.length) return true;
    const currentModule = sequence[step];
    if (currentModule.type === 'decision' || currentModule.type === 'quiz') {
      return answers[currentModule.id] !== undefined;
    }
    if (currentModule.type === 'dialog') {
      const dm = currentModule as DialogModule;
      const cur = dialogStep[dm.id] ?? 0;
      return cur >= dm.lines.length - 1;
    }
    return true;
  }

  function handleNext() {
    if (!canProceed()) return;
    if (step < totalSteps - 1) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function handlePrev() {
    if (step > 0) { setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLeadError('');
    if (!leadForm.gdprConsent) { setLeadError('Bitte stimme der Datenschutzerklärung zu.'); return; }
    leadStorage.save({
      id: crypto.randomUUID(), jobQuestId: quest.id, companyId: quest.companyId,
      firstName: leadForm.firstName, lastName: leadForm.lastName, email: leadForm.email,
      phone: leadForm.phone || undefined, gdprConsent: true, submittedAt: new Date().toISOString(),
    });
    analyticsStorage.save({
      id: crypto.randomUUID(), jobQuestId: quest.id, type: 'complete', sessionId,
      duration: Math.round((Date.now() - startTime) / 1000), timestamp: new Date().toISOString(),
    });
    setLeadSubmitted(true);
  }

  const progress = (step / totalSteps) * 100;
  const isLastContentStep = step === sequence.length - 1;
  const isLeadStep = step === sequence.length;

  return (
    <div className="quest-cd min-h-screen bg-slate-50 flex flex-col">
      <style>{questCss}</style>

      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {company.logo ? (
          <img src={company.logo} alt={company.name} className="h-8 w-8 rounded-lg object-contain border border-slate-200" />
        ) : (
          <div className="quest-logo-bg w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {company.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{quest.title}</p>
          <p className="text-xs text-slate-500">{company.name}</p>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">{step + 1} / {totalSteps}</span>
      </header>

      <div className="h-1 bg-slate-200">
        <div className="quest-progress h-1 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <main className={`flex-1 max-w-lg mx-auto w-full px-4 py-6 ${!leadSubmitted ? 'pb-24' : ''}`}>
        <div className="slide-in">
          {isLeadStep ? (
            leadSubmitted ? (
              <ThankYou company={company} config={quest.leadConfig ?? DEFAULT_LEAD_CONFIG} />
            ) : (
              <LeadForm
                form={leadForm}
                setForm={setLeadForm}
                onSubmit={handleLeadSubmit}
                error={leadError}
                company={company}
                config={quest.leadConfig ?? DEFAULT_LEAD_CONFIG}
              />
            )
          ) : (
            <ModuleRenderer
              module={sequence[step]}
              answers={answers}
              setAnswers={setAnswers}
              showFeedback={showFeedback}
              setShowFeedback={setShowFeedback}
              dialogStep={dialogStep}
              setDialogStep={setDialogStep}
              onDecisionSelect={handleDecisionSelect}
            />
          )}
        </div>
      </main>

      {!leadSubmitted && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-3 z-10">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft size={16} /> Zurück
            </button>
            {!isLeadStep && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  canProceed() ? 'quest-btn-next text-white shadow-md' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {isLastContentStep ? 'Weiter zur Bewerbung' : 'Weiter'}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </footer>
      )}

      {(company.privacyUrl || company.imprintUrl) && (
        <div className="flex justify-center gap-5 py-2 text-xs text-slate-400 bg-white border-t border-slate-100">
          {company.privacyUrl && (
            <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Datenschutz</a>
          )}
          {company.imprintUrl && (
            <a href={company.imprintUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Impressum</a>
          )}
        </div>
      )}
    </div>
  );
}
