'use client';

import { useState, useEffect, useRef } from 'react';
import { JobQuest, QuestModule, Company, SceneModule, DialogModule, DecisionModule, QuizModule, InfoModule, FreetextModule, ImageModule, VideoModule, AudioModule, FileModule, DialogLine, DEFAULT_CORPORATE_DESIGN, DEFAULT_LEAD_CONFIG, LeadFormConfig } from '@/lib/types';
import { leadStorage, analyticsStorage } from '@/lib/storage';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  quest: JobQuest;
  company: Company;
}

interface LeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gdprConsent: boolean;
}

export default function QuestPlayer({ quest, company }: Props) {
  const [step, setStep] = useState(0); // 0..modules.length = lead form
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
    design.headingFontData
      ? `@font-face{font-family:'${headingFontName}';src:url('${design.headingFontData}')}`
      : '',
    design.bodyFontData
      ? `@font-face{font-family:'${bodyFontName}';src:url('${design.bodyFontData}')}`
      : '',
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

  const totalSteps = sequence.length + 1; // +1 for lead form

  // Track view on mount
  useEffect(() => {
    analyticsStorage.save({
      id: crypto.randomUUID(),
      jobQuestId: quest.id,
      type: 'view',
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }, [quest.id, sessionId]);

  // Track start when moving past first module
  useEffect(() => {
    if (step === 1) {
      analyticsStorage.save({
        id: crypto.randomUUID(),
        jobQuestId: quest.id,
        type: 'start',
        sessionId,
        timestamp: new Date().toISOString(),
      });
    }
  }, [step, quest.id, sessionId]);

  // Load Google Fonts dynamically (skip system fonts and custom uploaded fonts)
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
        return [
          ...prev.slice(0, idx + 1),
          ...option.branchModules!,
          ...prev.slice(idx + 1),
        ];
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
    if (step < totalSteps - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handlePrev() {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLeadError('');
    if (!leadForm.gdprConsent) {
      setLeadError('Bitte stimme der Datenschutzerklärung zu.');
      return;
    }
    leadStorage.save({
      id: crypto.randomUUID(),
      jobQuestId: quest.id,
      companyId: quest.companyId,
      firstName: leadForm.firstName,
      lastName: leadForm.lastName,
      email: leadForm.email,
      phone: leadForm.phone || undefined,
      gdprConsent: true,
      submittedAt: new Date().toISOString(),
    });
    analyticsStorage.save({
      id: crypto.randomUUID(),
      jobQuestId: quest.id,
      type: 'complete',
      sessionId,
      duration: Math.round((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    });
    setLeadSubmitted(true);
  }

  const progress = ((step) / totalSteps) * 100;
  const isLastContentStep = step === sequence.length - 1;
  const isLeadStep = step === sequence.length;

  return (
    <div className="quest-cd min-h-screen bg-slate-50 flex flex-col">
      <style>{questCss}</style>
      {/* Header */}
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
        <span className="text-xs text-slate-400 flex-shrink-0">
          {step + 1} / {totalSteps}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="quest-progress h-1 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
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

      {/* Navigation */}
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
                  canProceed()
                    ? 'quest-btn-next text-white shadow-md'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
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

// ── Module Renderer ─────────────────────────────────────────────────────────
function ModuleRenderer({
  module, answers, setAnswers, showFeedback, setShowFeedback, dialogStep, setDialogStep, onDecisionSelect,
}: {
  module: QuestModule;
  answers: Record<string, string | null>;
  setAnswers: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void;
  showFeedback: Record<string, boolean>;
  setShowFeedback: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  dialogStep: Record<string, number>;
  setDialogStep: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  onDecisionSelect: (m: DecisionModule, optionId: string) => void;
}) {
  switch (module.type) {
    case 'scene': return <SceneRenderer module={module as SceneModule} />;
    case 'dialog': return (
      <DialogRenderer
        module={module as DialogModule}
        step={dialogStep[module.id] ?? 0}
        setStep={(s) => setDialogStep((p) => ({ ...p, [module.id]: s }))}
        answers={answers}
        setAnswers={setAnswers}
      />
    );
    case 'decision': return (
      <DecisionRenderer
        module={module as DecisionModule}
        selected={answers[module.id] ?? null}
        onSelect={(id) => onDecisionSelect(module as DecisionModule, id)}
        showFeedback={showFeedback[module.id]}
      />
    );
    case 'quiz': return (
      <QuizRenderer
        module={module as QuizModule}
        selected={answers[module.id] ?? null}
        onSelect={(id) => { setAnswers((p) => ({ ...p, [module.id]: id })); setShowFeedback((p) => ({ ...p, [module.id]: true })); }}
        showFeedback={showFeedback[module.id]}
      />
    );
    case 'info': return <InfoRenderer module={module as InfoModule} />;
    case 'freetext': return <FreetextRenderer module={module as FreetextModule} />;
    case 'image': return <ImageRenderer module={module as ImageModule} />;
    case 'video': return <VideoRenderer module={module as VideoModule} />;
    case 'audio': return <AudioRenderer module={module as AudioModule} />;
    case 'file': return <FileRenderer module={module as FileModule} />;
    default: return null;
  }
}

// ── Module Components ────────────────────────────────────────────────────────

function SceneRenderer({ module: m }: { module: SceneModule }) {
  return (
    <div className="space-y-4">
      {m.imageUrl && (
        <img src={m.imageUrl} alt={m.title} className="w-full h-48 object-cover rounded-2xl shadow-md" />
      )}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🌄</span>
          <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Szene</span>
        </div>
        <h2 className="quest-heading text-xl font-bold mb-3">{m.title}</h2>
        <p className="text-slate-600 leading-relaxed">{m.description}</p>
      </div>
    </div>
  );
}

function DialogRenderer({ module: m, step, setStep, answers, setAnswers }: {
  module: DialogModule;
  step: number;
  setStep: (s: number) => void;
  answers: Record<string, string | null>;
  setAnswers: (fn: (prev: Record<string, string | null>) => Record<string, string | null>) => void;
}) {
  const lines = m.lines;
  const visibleLines = lines.slice(0, step + 1);

  return (
    <div className="space-y-3">
      {m.title && (
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <h2 className="quest-heading text-lg font-bold">{m.title}</h2>
        </div>
      )}
      <div className="space-y-3 min-h-[200px]">
        {visibleLines.map((line: DialogLine, i) => {
          const isRight = i % 2 === 1;
          const displayName = line.speaker;
          const displayIcon = line.speaker?.charAt(0) || '?';
          return (
            <div key={line.id} className={`flex gap-3 ${isRight ? 'flex-row-reverse' : ''}`}>
              <div className="quest-dialog-avatar flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-auto">
                {displayIcon}
              </div>
              <div className={`max-w-[78%]`}>
                <p className={`text-xs font-medium mb-1 ${isRight ? 'text-right' : ''} text-slate-400`}>{displayName}</p>
                <div className={isRight ? 'chat-bubble-right' : 'chat-bubble-left'}>
                  <p className="text-sm leading-relaxed">{line.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Freitext-Eingabe für den Dialog */}
      <div className="mt-4">
        <label className="label">Deine Antwort</label>
        <textarea
          className="input-field w-full min-h-[80px]"
          placeholder="Schreibe hier deine Antwort..."
          value={answers[m.id] ?? ''}
          onChange={(e) => setAnswers((p) => ({ ...p, [m.id]: e.target.value }))}
        />
      </div>

      {step < lines.length - 1 && (
        <button
          onClick={() => setStep(step + 1)}
          className="quest-dialog-more w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium transition-all"
        >
          Weiter lesen →
        </button>
      )}
    </div>
  );
}

function DecisionRenderer({ module: m, selected, onSelect, showFeedback }: {
  module: DecisionModule; selected: string | null; onSelect: (id: string) => void; showFeedback?: boolean;
}) {
  const selectedOption = m.options.find((o) => o.id === selected);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔀</span>
        <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Entscheidung</span>
      </div>
      <div className="card p-5">
        <p className="quest-heading text-lg font-semibold mb-4">{m.question}</p>
        <div className="space-y-2.5">
          {m.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => !selected && onSelect(opt.id)}
              className={`w-full text-left p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                selected === opt.id
                  ? 'quest-option-selected'
                  : selected
                  ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-default'
                  : 'quest-option-default border-slate-200 text-slate-700 cursor-pointer'
              }`}
            >
              {opt.text}
            </button>
          ))}
        </div>
        {showFeedback && selectedOption && (
          <div className="quest-decision-feedback mt-4 border rounded-xl p-4 text-sm">
            {selectedOption.reaction}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizRenderer({ module: m, selected, onSelect, showFeedback }: {
  module: QuizModule; selected: string | null; onSelect: (id: string) => void; showFeedback?: boolean;
}) {
  const selectedOption = m.options.find((o) => o.id === selected);
  const correctOption = m.options.find((o) => o.correct);
  const isCorrect = selectedOption?.correct === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">❓</span>
        <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Quiz</span>
      </div>
      <div className="card p-5">
        <p className="quest-heading text-lg font-semibold mb-4">{m.question}</p>
        <div className="space-y-2.5">
          {m.options.map((opt) => {
            let style = 'quest-option-default border-slate-200 text-slate-700 cursor-pointer';
            if (selected) {
              if (opt.id === selected) {
                style = opt.correct
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-red-400 bg-red-50 text-red-800';
              } else if (opt.correct) {
                style = 'border-green-300 bg-green-50 text-green-700';
              } else {
                style = 'border-slate-100 bg-slate-50 text-slate-400 cursor-default';
              }
            }
            return (
              <button
                key={opt.id}
                onClick={() => !selected && onSelect(opt.id)}
                className={`w-full text-left p-4 rounded-xl border-2 text-sm font-medium transition-all ${style}`}
              >
                <div className="flex items-center gap-2">
                  {selected && opt.correct && <CheckCircle size={16} className="text-green-600 flex-shrink-0" />}
                  {selected && opt.id === selected && !opt.correct && <AlertCircle size={16} className="text-red-500 flex-shrink-0" />}
                  {opt.text}
                </div>
              </button>
            );
          })}
        </div>

        {/* Auflösung */}
        {showFeedback && selectedOption && (
          <div className={`mt-5 rounded-2xl overflow-hidden border-2 ${isCorrect ? 'border-green-300' : 'border-red-300'}`}>
            {/* Banner */}
            <div className={`flex items-center gap-3 px-4 py-3 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
              <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
              <div>
                <p className="text-white font-bold text-base leading-tight">
                  {isCorrect ? 'Richtig!' : 'Leider falsch!'}
                </p>
                {!isCorrect && correctOption && (
                  <p className="text-white/80 text-xs mt-0.5">
                    Richtig wäre: <span className="font-semibold text-white">{correctOption.text}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Erklärung */}
            {(isCorrect ? selectedOption.feedback : correctOption?.feedback) && (
              <div className={`px-4 py-3 ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  Warum?
                </p>
                <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isCorrect ? selectedOption.feedback : correctOption?.feedback}
                </p>
              </div>
            )}

            {/* Eigenes Feedback wenn falsch geantwortet */}
            {!isCorrect && selectedOption.feedback && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Deine Antwort
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">{selectedOption.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRenderer({ module: m }: { module: InfoModule }) {
  return (
    <div className="space-y-4">
      {m.imageUrl && <img src={m.imageUrl} alt={m.title} className="w-full h-40 object-cover rounded-2xl shadow-md" />}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">ℹ️</span>
          <span className="quest-badge text-xs font-semibold uppercase tracking-wide">Info</span>
        </div>
        <h2 className="quest-heading text-xl font-bold mb-3">{m.title}</h2>
        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{m.text}</p>
        {m.videoUrl && (
          <div className="mt-4">
            <a href={m.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
              ▶ Video ansehen
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function FreetextRenderer({ module: m }: { module: FreetextModule }) {
  return (
    <div className="card p-6">
      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{m.text}</p>
    </div>
  );
}

function ImageRenderer({ module: m }: { module: ImageModule }) {
  return (
    <div className="space-y-2">
      <img src={m.imageUrl} alt={m.caption || ''} className="w-full rounded-2xl shadow-md" />
      {m.caption && <p className="text-sm text-slate-500 text-center">{m.caption}</p>}
    </div>
  );
}

function VideoRenderer({ module: m }: { module: VideoModule }) {
  function getEmbedUrl(url: string): string {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  }
  const embedUrl = getEmbedUrl(m.videoUrl);

  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-2xl overflow-hidden shadow-md bg-black">
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
      </div>
      {m.caption && <p className="text-sm text-slate-500 text-center">{m.caption}</p>}
    </div>
  );
}

function AudioRenderer({ module: m }: { module: AudioModule }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎧</span>
        <p className="font-semibold text-slate-900">{m.title || 'Audio'}</p>
      </div>
      <audio controls className="w-full" src={m.audioUrl} />
    </div>
  );
}

function FileRenderer({ module: m }: { module: FileModule }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className="quest-icon-tint w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📄</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{m.filename}</p>
          {m.description && <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>}
        </div>
        <a
          href={m.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm flex-shrink-0"
          download={m.filename}
        >
          Download
        </a>
      </div>
    </div>
  );
}

// ── Lead Form ─────────────────────────────────────────────────────────────────
function LeadForm({ form, setForm, onSubmit, error, company, config }: {
  form: LeadFormData;
  setForm: React.Dispatch<React.SetStateAction<LeadFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  company: Company;
  config: LeadFormConfig;
}) {
  const privacyText = config.privacyText.replace('{{company}}', company.name);

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
              <label className="label">Telefonnummer (optional)</label>
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

function ThankYou({ company, config }: { company: Company; config: LeadFormConfig }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="quest-heading text-2xl font-bold mb-3">{config.thankYouHeadline}</h2>
      <p className="text-slate-600 mb-2">
        {config.thankYouText}
      </p>
      <p className="text-slate-600">
        {company.contactName} von {company.name} wird sich in Kürze bei dir melden.
      </p>
      <div className="quest-thankyou-box mt-6 rounded-xl p-4">
        <p className="text-sm font-medium">
          Wir freuen uns auf dich! 🎊
        </p>
      </div>
    </div>
  );
}
