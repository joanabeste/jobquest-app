'use client';

/**
 * FunnelPlayer – step-by-step public renderer for FunnelDoc content.
 * Each page in the FunnelDoc is one "step". Users navigate forward/back.
 * Interactive blocks (choices, sliders, quizzes, lead forms) are fully functional.
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { FunnelDoc, BlockNode, FunnelNode, LayoutNode, FunnelPage } from '@/lib/funnel-types';
import { Company, Dimension } from '@/lib/types';
import { leadStorage, careerCheckStorage } from '@/lib/storage';
import { useCorporateDesign } from '@/lib/use-corporate-design';
import { ChevronLeft, ArrowRight, ChevronRight, Trophy, FileDown, Check, X, MapPin } from 'lucide-react';

// ─── Safe prop helpers ────────────────────────────────────────────────────────
const s = (v: unknown, fallback = ''): string => (v != null ? String(v) : fallback);
const n = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
const b = (v: unknown): boolean => Boolean(v);

// ─── Types ────────────────────────────────────────────────────────────────────
interface LeadForm { firstName: string; lastName: string; email: string; phone: string; gdpr: boolean; }
const emptyLead: LeadForm = { firstName: '', lastName: '', email: '', phone: '', gdpr: false };
type LeadFieldDef = { id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[]; };

interface Props { doc: FunnelDoc; company: Company; contentDbId?: string; }

// ─── Module-level helpers ─────────────────────────────────────────────────────
function flatBlocks(nodes: FunnelNode[]): BlockNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'layout'
      ? node.columns.flatMap((c) => c.nodes.filter((cn) => cn.kind === 'block') as BlockNode[])
      : [node as BlockNode]
  );
}

function isSubmitPage(nodes: FunnelNode[]): boolean {
  return flatBlocks(nodes).some((bl) =>
    bl.type === 'check_lead' || bl.type === 'quest_lead' || bl.type === 'form_config'
  );
}

function computeScores(pages: FunnelPage[], answers: Record<string, unknown>): Record<string, number> {
  const scores: Record<string, number> = {};
  pages.flatMap((p) => p.nodes).forEach((node) => {
    if (node.kind !== 'block') return;
    const p    = node.props;
    const answer = answers[node.id];
    if (answer === undefined) return;

    if (node.type === 'check_frage' && p.frageType === 'single_choice') {
      const opt = (p.options as { id: string; scores?: Record<string, number> }[]).find((o) => o.id === answer);
      if (opt?.scores) Object.entries(opt.scores).forEach(([d, v]) => { scores[d] = (scores[d] ?? 0) + v; });
    } else if (node.type === 'check_frage' && p.frageType === 'slider' && p.sliderDimensionId) {
      const d = s(p.sliderDimensionId);
      scores[d] = (scores[d] ?? 0) + n(answer, 0);
    } else if (node.type === 'check_selbst' && p.sliderDimensionId) {
      const d = s(p.sliderDimensionId);
      scores[d] = (scores[d] ?? 0) + n(answer, 0);
    } else if (node.type === 'check_ergebnisfrage') {
      const opt = (p.options as { id: string; scores?: Record<string, number> }[]).find((o) => o.id === answer);
      if (opt?.scores) Object.entries(opt.scores).forEach(([d, v]) => { scores[d] = (scores[d] ?? 0) + v; });
    }
  });
  return scores;
}

// ─── Main player ──────────────────────────────────────────────────────────────
export default function FunnelPlayer({ doc, company, contentDbId }: Props) {
  const [pageIndex, setPageIndex]   = useState(0);
  const [answers, setAnswers]       = useState<Record<string, unknown>>({});
  const [firstName, setFirstName]   = useState('');
  const [leadForm, setLeadForm]     = useState<LeadForm>(emptyLead);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [completed, setCompleted]   = useState(false);
  const [completionMsg, setCompletionMsg] = useState<{ headline: string; text: string } | null>(null);
  const [dialogVisible, setDialogVisible] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // Reset dialog when page changes (must be before any conditional returns)
  useEffect(() => { setDialogVisible(0); }, [pageIndex]);

  const [careerCheck, setCareerCheck] = useState<import('@/lib/types').CareerCheck | null>(null);
  useEffect(() => {
    if (doc.contentType === 'check' && contentDbId) {
      careerCheckStorage.getById(contentDbId).then((c) => setCareerCheck(c ?? null));
    }
  }, [doc.contentType, contentDbId]);
  const dimensions: Dimension[] = careerCheck?.dimensions ?? [];

  const { primary, accent, br, css } = useCorporateDesign(company);

  // ── Scores (memoized – only recompute when answers or pages change) ─────────
  const scores = useMemo(
    () => computeScores(doc.pages, answers),
    [doc.pages, answers],
  );

  // ── Navigation ───────────────────────────────────────────────────────────────
  function scrollTop() {
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function goNext(targetPageId?: string) {
    if (targetPageId) {
      const idx = doc.pages.findIndex((p) => p.id === targetPageId);
      if (idx >= 0) { setPageIndex(idx); scrollTop(); return; }
    }
    if (pageIndex < doc.pages.length - 1) { setPageIndex((i) => i + 1); scrollTop(); }
    else { setCompleted(true); scrollTop(); }
  }
  function goBack() {
    if (pageIndex > 0) { setPageIndex((i) => i - 1); scrollTop(); }
  }
  function setAnswer(nodeId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [nodeId]: value }));
  }

  // ── Lead saving (shared between quest_lead, check_lead, form_config) ─────────
  function saveLead(form: LeadForm, customFields?: Record<string, string>) {
    leadStorage.save({
      id: crypto.randomUUID(),
      jobQuestId: contentDbId ?? doc.contentId,
      companyId: company.id,
      firstName: form.firstName || firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      gdprConsent: true,
      submittedAt: new Date().toISOString(),
      ...(customFields ? { customFields } : {}),
    });
  }
  function handleLeadSubmit(form: LeadForm, customFields?: Record<string, string>) {
    saveLead(form, customFields);
    setLeadSubmitted(true);
    goNext();
  }
  function handleFormSubmit(thankYouHeadline: string, thankYouText: string, form: LeadForm) {
    saveLead(form);
    setCompletionMsg({ headline: thankYouHeadline || 'Vielen Dank!', text: thankYouText || 'Wir melden uns bei dir.' });
    setCompleted(true);
    scrollTop();
  }

  // ── Page state ───────────────────────────────────────────────────────────────
  const currentPage = doc.pages[pageIndex];
  if (!currentPage) return null;

  const blocks        = flatBlocks(currentPage.nodes);
  const submitPage    = isSubmitPage(currentPage.nodes);
  const spinnerBlock  = blocks.find((bl) => bl.type === 'quest_spinner');
  // avatar block removed

  // Which decision option is selected on this page?
  const decisionBlock = blocks.find((bl) => bl.type === 'quest_decision');
  const quizBlock     = blocks.find((bl) => bl.type === 'quest_quiz');
  const ratingBlock   = blocks.find((bl) => bl.type === 'quest_rating');
  const vornameBlock  = blocks.find((bl) => bl.type === 'quest_vorname');
  const dialogBlock   = blocks.find((bl) => bl.type === 'quest_dialog');
  const dialogLines   = dialogBlock ? ((dialogBlock.props.lines as DialogLine[]) || []) : [];
  const dialogComplete = !dialogBlock || dialogVisible >= dialogLines.length;
  const dialogChoices = dialogBlock ? ((dialogBlock.props.choices as { id: string }[]) || []) : [];
  const hasDialogChoices = dialogChoices.length > 0;
  const dialogInput = dialogBlock ? (dialogBlock.props.input as { placeholder?: string } | undefined) : undefined;
  const hasDialogInput = !!dialogInput;
  const dialogInteractionAnswered = (!hasDialogChoices && !hasDialogInput) ||
    (dialogBlock ? answers[dialogBlock.id] !== undefined : true);

  const decisionSelected = decisionBlock ? (answers[decisionBlock.id] as string | undefined) : undefined;
  const decisionOpts  = decisionBlock
    ? (decisionBlock.props.options as { id: string; text: string; reaction?: string; targetPageId?: string }[]) || []
    : [];
  const decisionTargetPageId = decisionSelected
    ? decisionOpts.find((o) => o.id === decisionSelected)?.targetPageId
    : undefined;

  // Weiter target: decision option > page setting > linear next
  const weiterTarget  = decisionTargetPageId ?? currentPage.nextPageId;
  // Weiter is blocked until required interactions are done
  const weiterEnabled = (!decisionBlock || decisionSelected !== undefined)
                     && (!quizBlock     || answers[quizBlock.id] !== undefined)
                     && (!ratingBlock   || answers[ratingBlock.id] !== undefined)
                     && (!vornameBlock  || firstName.trim().length > 0)
                     && dialogComplete
                     && dialogInteractionAnswered;

  const isLastPage    = pageIndex === doc.pages.length - 1;
  const progress      = (pageIndex + 1) / doc.pages.length;

  const sharedBlockProps = {
    company, primary, accent, br,
    answers, firstName,
    onSetFirstName: setFirstName,
    onAnswer: setAnswer,
    onNext: goNext,
    leadForm, setLeadForm, leadSubmitted,
    onLeadSubmit: handleLeadSubmit,
    onFormSubmit: handleFormSubmit,
    scores,
    dimensions,
    dialogVisible,
    onDialogAdvance: (count: number) => setDialogVisible(count),
    // avatar removed
  };

  return (
    <div className="fp-root min-h-screen bg-slate-50">
      <style>{css}{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div ref={topRef} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        {doc.contentType === 'quest' ? (
          /* Quest-style header: Start | Logo | Ende */
          <div className="px-4 pt-2.5 pb-2 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex-shrink-0 leading-tight text-center">
              🏁<br/><span className="hidden sm:inline">Start</span>
            </span>
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt={company.name} className="h-8 max-w-[160px] object-contain flex-shrink-0" />
              ) : (
                <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
              )}
            </div>
            <span className="flex-shrink-0 w-8 flex items-center justify-center">
              <span className="text-[11px] text-slate-400 leading-tight text-center">🎉<br/><span className="hidden sm:inline">Ende</span></span>
            </span>
          </div>
        ) : (
          /* Default header */
          <div className="px-4 pt-3 pb-2 flex items-center gap-3">
            {company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo} alt={company.name} className="h-7 w-7 rounded-lg object-contain border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm fp-btn flex-shrink-0">
                {company.name.charAt(0)}
              </div>
            )}
            <p className="text-sm font-semibold text-slate-900 truncate flex-1">{company.name}</p>
            {!completed && (
              <span className="text-xs text-slate-400 flex-shrink-0">{pageIndex + 1} / {doc.pages.length}</span>
            )}
          </div>
        )}
        {!completed && (
          <div className="h-1 bg-slate-100">
            <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress * 100}%`, background: primary }} />
          </div>
        )}
      </header>

      {/* ── Location badge (Quest only) ─────────────────────────────────────── */}
      {!completed && doc.contentType === 'quest' && currentPage.name && (
        <div className="flex justify-center py-1.5 bg-white border-b border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <MapPin size={10} className="flex-shrink-0" />
            {currentPage.name}
          </span>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main className="max-w-lg mx-auto w-full pb-28">
        {completed ? (
          <CompletionScreen
            company={company}
            headline={completionMsg?.headline ?? 'Vielen Dank!'}
            text={completionMsg?.text ?? 'Wir haben deine Anfrage erhalten.'}
            primary={primary}
          />
        ) : (
          currentPage.nodes.map((node) => {
            if (node.kind === 'layout') {
              return (
                <div key={node.id} className="grid gap-3 px-4 py-3"
                  style={{ gridTemplateColumns: `repeat(${(node as LayoutNode).columns.length}, 1fr)` }}>
                  {(node as LayoutNode).columns.map((col) => (
                    <div key={col.id} className="space-y-3">
                      {col.nodes.map((cn) => (
                        <StyledBlock key={cn.id} node={cn as BlockNode} sharedProps={sharedBlockProps} />
                      ))}
                    </div>
                  ))}
                </div>
              );
            }
            return <StyledBlock key={node.id} node={node as BlockNode} sharedProps={sharedBlockProps} />;
          })
        )}
      </main>

      {/* ── Footer navigation ──────────────────────────────────────────────── */}
      {!completed && !submitPage && !spinnerBlock && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {/* Back button – icon only, fixed width so Weiter is always at same position */}
            <button
              onClick={goBack}
              disabled={pageIndex === 0}
              className={`flex items-center justify-center w-11 flex-shrink-0 py-3.5 border border-slate-200 transition-colors ${pageIndex === 0 ? 'invisible' : 'text-slate-600 hover:bg-slate-50'}`}
              style={{ borderRadius: br }}
              aria-label="Zurück"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goNext(weiterTarget)}
              disabled={!weiterEnabled}
              className="fp-btn flex-1 py-3.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ borderRadius: br }}
            >
              {isLastPage ? 'Fertig' : 'Weiter'} {!isLastPage && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* ── Footer links ───────────────────────────────────────────────────── */}
      {completed && (company.privacyUrl || company.imprintUrl) && (
        <footer className="flex justify-center gap-5 py-4 text-xs text-slate-400">
          {!!company.privacyUrl && <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Datenschutz</a>}
          {!!company.imprintUrl && <a href={company.imprintUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Impressum</a>}
        </footer>
      )}
    </div>
  );
}

// avatar type removed

// ─── Dialog line type ─────────────────────────────────────────────────────────
interface DialogLine { id: string; speaker: string; text: string; imageUrl?: string; position?: 'left' | 'right'; }
interface DialogChoice { id: string; text: string; reaction?: string; }
interface DialogInput { placeholder?: string; captures?: 'firstName'; followUpText?: string; }

// ─── Typing indicator (three bouncing dots) ───────────────────────────────────
function TypingIndicator({ primary }: { primary: string }) {
  return (
    <div className="flex gap-3 px-5">
      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: `${primary}30` }} />
      <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Dialog block – reveals bubbles one by one with typing animation ──────────
function DialogBlock({ lines, primary, visibleCount, onAdvance, firstName, choices, input, nodeId, onAnswer, onSetFirstName, answers, br }: {
  lines: DialogLine[];
  primary: string;
  visibleCount: number;
  onAdvance: (count: number) => void;
  firstName: string;
  choices?: DialogChoice[];
  input?: DialogInput;
  nodeId?: string;
  onAnswer?: (id: string, val: unknown) => void;
  onSetFirstName?: (v: string) => void;
  answers?: Record<string, unknown>;
  br?: string;
}) {
  const [typing, setTyping] = useState(false);

  const hasChoices = !!choices && choices.length > 0;
  const selectedChoiceId = hasChoices && nodeId && answers ? answers[nodeId] as string | undefined : undefined;
  const selectedChoice = selectedChoiceId ? choices?.find((c) => c.id === selectedChoiceId) : undefined;
  // Start as true if already answered (back-navigation), false if fresh
  const [choiceReactionVisible, setChoiceReactionVisible] = useState(!!selectedChoiceId);

  // Input field state
  const hasInput = !!input;
  const existingInputAnswer = hasInput && nodeId && answers ? (answers[nodeId] as string | undefined) : undefined;
  const [inputValue, setInputValue] = useState(existingInputAnswer ?? '');
  const [inputSubmitted, setInputSubmitted] = useState(!!existingInputAnswer);
  const [inputFollowUpVisible, setInputFollowUpVisible] = useState(!!existingInputAnswer && !!input?.followUpText);

  function handleInputSubmit() {
    const val = inputValue.trim();
    if (!val) return;
    if (input?.captures === 'firstName' && onSetFirstName) onSetFirstName(val);
    if (nodeId && onAnswer) onAnswer(nodeId, val);
    setInputSubmitted(true);
    if (input?.followUpText) {
      setTimeout(() => setInputFollowUpVisible(true), 1000);
    }
  }

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    // Show typing indicator, then reveal next bubble
    setTyping(true);
    const delay = lines[visibleCount]?.text?.length > 60 ? 1200 : 850;
    const t = setTimeout(() => {
      setTyping(false);
      onAdvance(visibleCount + 1);
    }, delay);
    return () => clearTimeout(t);
  // onAdvance is stable (defined inline in parent, but we only want this to run on visibleCount changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, lines.length]);

  // Show reaction bubble after a choice is picked
  useEffect(() => {
    if (!selectedChoiceId || !selectedChoice?.reaction || choiceReactionVisible) return;
    const t = setTimeout(() => setChoiceReactionVisible(true), 1200);
    return () => clearTimeout(t);
  }, [selectedChoiceId, selectedChoice?.reaction, choiceReactionVisible]);

  if (lines.length === 0 && !hasChoices && !hasInput) return null;

  const visible = lines.slice(0, visibleCount);
  const allLinesShown = visibleCount >= lines.length;
  const showChoiceButtons = allLinesShown && hasChoices && !selectedChoiceId;
  const showChoiceTyping = !!selectedChoiceId && !!selectedChoice?.reaction && !choiceReactionVisible;

  return (
    <div className="py-4 space-y-3">
      {visible.map((line, idx) => {
        const isRight = line.position === 'right';
        return (
          <div
            key={line.id}
            className={`flex gap-3 px-5 ${isRight ? 'flex-row-reverse' : ''}`}
            style={{ animation: idx === visibleCount - 1 ? 'fadeSlideIn 0.3s ease-out' : undefined }}
          >
            <div className="w-8 h-8 rounded-full flex-shrink-0 mt-auto overflow-hidden flex items-center justify-center font-bold text-white text-sm"
              style={{ background: primary }}>
              <span>{line.speaker?.charAt(0) || '?'}</span>
            </div>
            <div className={`max-w-[78%] ${isRight ? 'items-end' : ''} flex flex-col`}>
              <p className="text-[11px] text-slate-400 mb-1">{isRight && firstName ? firstName : line.speaker}</p>
              {!!line.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.imageUrl} alt="" className="w-full rounded-2xl mb-1.5 max-h-44 object-cover shadow-sm" />
              )}
              {!!line.text && (
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${isRight ? 'text-white' : 'bg-slate-100 text-slate-700'}`}
                  style={isRight ? { background: primary } : {}}>
                  {line.text}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicator for auto-advancing main lines */}
      {!allLinesShown && typing && <TypingIndicator primary={primary} />}

      {/* User's selected choice shown as right bubble */}
      {selectedChoice && (
        <div className="flex gap-3 px-5 flex-row-reverse" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-auto text-white"
            style={{ background: primary }}>
            {firstName?.charAt(0) || 'I'}
          </div>
          <div className="max-w-[78%] items-end flex flex-col">
            <p className="text-[11px] text-slate-400 mb-1">{firstName || 'Ich'}</p>
            <div className="px-3 py-2.5 rounded-2xl text-sm leading-relaxed text-white" style={{ background: primary }}>
              {selectedChoice.text}
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator while waiting for reaction */}
      {showChoiceTyping && <TypingIndicator primary={primary} />}

      {/* Reaction bubble after choice */}
      {choiceReactionVisible && selectedChoice?.reaction && (
        <div className="flex gap-3 px-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 mt-auto" style={{ background: `${primary}30` }} />
          <div className="max-w-[78%] flex flex-col">
            <div className="bg-slate-100 px-3 py-2.5 rounded-2xl text-sm leading-relaxed text-slate-700">
              {selectedChoice.reaction}
            </div>
          </div>
        </div>
      )}

      {/* Choice buttons – appear after all lines are revealed */}
      {showChoiceButtons && (
        <div className="px-5 pt-2 space-y-2">
          <p className="text-[11px] text-slate-400 text-center mb-1">Deine Antwort:</p>
          {choices!.map((c) => (
            <button
              key={c.id}
              onClick={() => { if (nodeId && onAnswer) onAnswer(nodeId, c.id); }}
              className="w-full text-left px-4 py-3 text-sm rounded-2xl border-2 transition-all hover:shadow-sm active:scale-[0.98] font-medium"
              style={{ borderColor: primary, color: primary, background: `${primary}08`, borderRadius: br ?? '12px' }}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {/* Input field – appears after all lines are revealed */}
      {allLinesShown && hasInput && !inputSubmitted && (
        <div className="px-5 pt-2">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
              placeholder={input?.placeholder ?? 'Deine Antwort…'}
              className="flex-1 px-4 py-2.5 text-sm rounded-2xl border-2 bg-white outline-none transition-colors focus:border-violet-400"
              style={{ borderColor: `${primary}40` }}
              autoFocus
            />
            <button
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
              style={{ background: primary }}
            >
              <ArrowRight size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* User's typed input shown as right bubble */}
      {inputSubmitted && (
        <div className="flex gap-3 px-5 flex-row-reverse" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-auto text-white"
            style={{ background: primary }}>
            {(firstName || inputValue)?.charAt(0).toUpperCase() || 'I'}
          </div>
          <div className="max-w-[78%] items-end flex flex-col">
            <p className="text-[11px] text-slate-400 mb-1">{firstName || 'Ich'}</p>
            <div className="px-3 py-2.5 rounded-2xl text-sm leading-relaxed text-white" style={{ background: primary }}>
              {existingInputAnswer ?? inputValue}
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator while waiting for follow-up after input */}
      {inputSubmitted && !!input?.followUpText && !inputFollowUpVisible && (
        <TypingIndicator primary={primary} />
      )}

      {/* Follow-up bubble after input submission */}
      {inputFollowUpVisible && input?.followUpText && (
        <div className="flex gap-3 px-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-auto text-white"
            style={{ background: primary }}>
            {lines[0]?.speaker?.charAt(0) || '?'}
          </div>
          <div className="max-w-[78%] flex flex-col">
            <p className="text-[11px] text-slate-400 mb-1">{lines[0]?.speaker || 'Sprecher'}</p>
            <div className="bg-slate-100 px-3 py-2.5 rounded-2xl text-sm leading-relaxed text-slate-700">
              {input.followUpText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Spinner block (auto-advances after 2 s) ──────────────────────────────────
function SpinnerBlock({ text, doneText, primary, onNext }: {
  text: string; doneText: string; primary: string; onNext: () => void;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setDone(true), 1800);
    const t2 = setTimeout(() => onNext(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 gap-5 text-center">
      {done ? (
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={32} className="text-emerald-600" />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full border-[5px] border-slate-200 border-t-transparent animate-spin"
          style={{ borderTopColor: primary }} />
      )}
      <p className="text-base font-medium text-slate-700">{done ? doneText : text}</p>
    </div>
  );
}

// ─── Rating block ─────────────────────────────────────────────────────────────
function RatingBlock({ question, emoji, count, nodeId, answers, onAnswer }: {
  question: string; emoji: string; count: number;
  nodeId: string; answers: Record<string, unknown>; onAnswer: (id: string, val: unknown) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = answers[nodeId] as number | undefined;
  const highlight = hovered ?? selected ?? 0;
  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
      <p className="fp-heading font-semibold text-base mb-4">{question}</p>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => i + 1).map((val) => (
          <button
            key={val}
            onClick={() => !selected && onAnswer(nodeId, val)}
            onMouseEnter={() => !selected && setHovered(val)}
            onMouseLeave={() => setHovered(null)}
            disabled={!!selected}
            className="text-3xl transition-transform hover:scale-125 disabled:cursor-default"
            style={{ opacity: val <= highlight ? 1 : 0.25 }}
          >
            {emoji}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-center text-sm text-slate-500 mt-3">{selected} von {count}</p>
      )}
    </div>
  );
}

// ─── Style wrapper – applies FunnelStyle from block to a wrapper div ──────────
function StyledBlock({ node, sharedProps }: {
  node: BlockNode;
  sharedProps: Omit<Parameters<typeof BlockRenderer>[0], 'node'>;
}) {
  const style = node.style;
  const hasStyle = style && Object.values(style).some((v) => v !== undefined && v !== 0 && v !== '');
  const block = <BlockRenderer {...sharedProps} node={node} />;
  if (!hasStyle) return block;
  return (
    <div style={{
      paddingTop:      style.paddingTop    ? `${style.paddingTop}px`    : undefined,
      paddingRight:    style.paddingRight  ? `${style.paddingRight}px`  : undefined,
      paddingBottom:   style.paddingBottom ? `${style.paddingBottom}px` : undefined,
      paddingLeft:     style.paddingLeft   ? `${style.paddingLeft}px`   : undefined,
      backgroundColor: style.backgroundColor || undefined,
      borderRadius:    style.borderRadius  ? `${style.borderRadius}px`  : undefined,
      textAlign:       style.textAlign     || undefined,
    }}>
      {block}
    </div>
  );
}

// ─── Shared slider UI (used by check_frage slider + check_selbst) ─────────────
function SliderBlock({ nodeId, p, answers, onAnswer, primary }: {
  nodeId: string;
  p: Record<string, unknown>;
  answers: Record<string, unknown>;
  onAnswer: (id: string, val: unknown) => void;
  primary: string;
}) {
  const min = n(p.sliderMin, 0);
  const max = n(p.sliderMax, 10);
  const val = answers[nodeId] !== undefined
    ? n(answers[nodeId], Math.floor((min + max) / 2))
    : Math.floor((min + max) / 2);
  return (
    <div className="px-2">
      <input type="range" min={min} max={max} step={n(p.sliderStep, 1)} value={val}
        onChange={(e) => onAnswer(nodeId, Number(e.target.value))}
        className="w-full" style={{ accentColor: primary }} />
      <div className="flex justify-between mt-2">
        <span className="text-xs text-slate-400">{s(p.sliderLabelMin, String(min))}</span>
        <span className="text-sm font-bold" style={{ color: primary }}>{val}</span>
        <span className="text-xs text-slate-400">{s(p.sliderLabelMax, String(max))}</span>
      </div>
    </div>
  );
}

// ─── Block renderer ───────────────────────────────────────────────────────────
function BlockRenderer({
  node, company, primary, accent, br,
  answers, firstName, onSetFirstName, onAnswer, onNext,
  leadForm, setLeadForm, leadSubmitted, onLeadSubmit, onFormSubmit,
  scores, dimensions,
  dialogVisible, onDialogAdvance,
}: {
  node: BlockNode; company: Company; primary: string; accent: string; br: string;
  answers: Record<string, unknown>; firstName: string;
  onSetFirstName: (v: string) => void;
  onAnswer: (id: string, val: unknown) => void;
  onNext: (targetPageId?: string) => void;
  leadForm: LeadForm; setLeadForm: (f: LeadForm) => void; leadSubmitted: boolean;
  onLeadSubmit: (f: LeadForm, customFields?: Record<string, string>) => void;
  onFormSubmit: (headline: string, text: string, form: LeadForm) => void;
  scores: Record<string, number>;
  dimensions: Dimension[];
  dialogVisible: number;
  onDialogAdvance: (count: number) => void;
}) {
  const p = node.props;
  // Interpolation helper: replaces {{name}} with the user's firstName
  const si = (v: unknown, fallback = '') => s(v, fallback).replace(/\{\{name\}\}|\{name\}/gi, firstName || '');

  switch (node.type) {

    // ── Generic ──────────────────────────────────────────────────────────────
    case 'heading': {
      const lvl  = n(p.level, 2);
      const text = si(p.text);
      return (
        <div className="px-5 py-4">
          {lvl === 1 ? <h1 className="fp-heading text-3xl font-bold leading-tight">{text}</h1>
            : lvl === 2 ? <h2 className="fp-heading text-2xl font-bold">{text}</h2>
            : <h3 className="fp-heading text-xl font-semibold">{text}</h3>}
        </div>
      );
    }

    case 'paragraph':
      return (
        <div
          className="px-5 py-3 text-slate-600 leading-relaxed rte"
          dangerouslySetInnerHTML={{ __html: s(p.text) }}
        />
      );

    case 'button': {
      const url  = s(p.url);
      const text = s(p.text);
      const cls  = s(p.variant, 'primary') === 'secondary' ? 'fp-btn-sec' : 'fp-btn';
      return (
        <div className="px-5 py-3">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all ${cls}`}
              style={{ borderRadius: br }}>
              {text} <ArrowRight size={15} />
            </a>
          ) : (
            <button onClick={() => onNext()}
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold ${cls}`}
              style={{ borderRadius: br }}>
              {text}
            </button>
          )}
        </div>
      );
    }

    case 'image': {
      const src = s(p.src);
      if (!src) return null;
      const imgSize = s(p.size, 'full');
      const fit = s(p.objectFit, 'cover');
      const sizeClass: Record<string, string> = { full: 'w-full', l: 'max-w-lg mx-auto', m: 'max-w-sm mx-auto', s: 'max-w-xs mx-auto', xs: 'max-w-[128px] mx-auto' };
      const wrapCls = sizeClass[imgSize] ?? 'w-full';
      const imgStyle: React.CSSProperties = fit !== 'cover' ? { objectFit: fit as 'contain' | 'none' } : {};
      const imgCls = fit === 'cover' ? 'w-full object-cover' : 'w-full object-contain';
      return (
        <div>
          <div className={wrapCls}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={s(p.alt)} className={imgCls} style={imgStyle} />
          </div>
          {b(p.caption) && <p className="text-xs text-slate-400 text-center px-4 pt-1">{s(p.caption)}</p>}
        </div>
      );
    }

    case 'spacer':
      return <div style={{ height: Math.max(16, n(p.height, 32)) }} />;

    case 'video': {
      const url        = s(p.url);
      const ytMatch    = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      const embedUrl   = ytMatch    ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
        : vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : url;
      return url ? (
        <div className="px-5 py-3">
          <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-md">
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
          </div>
          {b(p.caption) && <p className="text-xs text-slate-400 text-center mt-1">{s(p.caption)}</p>}
        </div>
      ) : null;
    }

    // ── Quest blocks ──────────────────────────────────────────────────────────
    case 'quest_scene': {
      const imageUrl    = s(p.imageUrl);
      const subtext     = s(p.subtext);
      const accentText  = s(p.accentText);
      const bulletPoints = (p.bulletPoints as string[]) || [];
      return (
        <div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full max-h-72 object-cover" />
          ) : (
            <div className="h-3" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
          )}
          <div className="px-6 pt-8 pb-6 bg-white text-center">
            <h1 className="fp-heading text-2xl font-bold uppercase leading-tight mb-4">{si(p.title)}</h1>
            {!!subtext && <p className="text-sm text-slate-600 mb-3 leading-relaxed">{si(subtext)}</p>}
            {!!accentText && (
              <p className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: primary }}>{accentText}</p>
            )}
            {!!s(p.description) && (
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{si(p.description)}</p>
            )}
            {bulletPoints.length > 0 && (
              <ul className="text-sm text-slate-600 text-left space-y-2 mb-6 mt-2">
                {bulletPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold flex-shrink-0 mt-px" style={{ color: primary }}>»</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }

    case 'quest_dialog': {
      const rawLines = (p.lines as DialogLine[]) || [];
      const lines = rawLines.map((l) => ({ ...l, text: si(l.text), speaker: si(l.speaker) }));
      const rawChoices = (p.choices as DialogChoice[]) || [];
      const choices = rawChoices.map((c) => ({ ...c, text: si(c.text), reaction: c.reaction ? si(c.reaction) : undefined }));
      const rawInput = p.input as DialogInput | undefined;
      const inputDef = rawInput ? { ...rawInput, followUpText: rawInput.followUpText ? si(rawInput.followUpText) : undefined } : undefined;
      return (
        <DialogBlock
          lines={lines}
          primary={primary}
          visibleCount={dialogVisible}
          onAdvance={onDialogAdvance}
          firstName={firstName}
          choices={choices}
          input={inputDef}
          nodeId={node.id}
          onAnswer={onAnswer}
          onSetFirstName={onSetFirstName}
          answers={answers}
          br={br}
        />
      );
    }

    case 'quest_decision': {
      const opts        = (p.options as { id: string; text: string; reaction?: string; targetPageId?: string; emoji?: string }[]) || [];
      const selected    = answers[node.id] as string | undefined;
      const selectedOpt = opts.find((o) => o.id === selected);
      const hasEmojis   = opts.some((o) => o.emoji);

      return (
        <div className="mx-4 my-3">
          <p className="fp-heading font-semibold text-base mb-4 px-1 text-center">{si(p.question)}</p>

          {hasEmojis ? (
            /* ── Card grid layout with emojis ─────────────────────────────── */
            <div className={`grid gap-3 ${opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {opts.map((o) => {
                const isSelected = selected === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => { if (!selected) onAnswer(node.id, o.id); }}
                    disabled={!!selected}
                    className="fp-card bg-white shadow-sm p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-200 hover:shadow-md active:scale-95"
                    style={isSelected ? { borderColor: primary, background: `${primary}10`, transform: 'scale(0.97)' } : {}}>
                    <span className="text-4xl leading-none">{o.emoji}</span>
                    <span className="text-xs font-medium text-slate-700 leading-tight">{o.text}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: primary }}>
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Standard list layout ──────────────────────────────────────── */
            <div className="fp-card bg-white shadow-sm p-2 space-y-1.5">
              {opts.map((o) => {
                const isSelected = selected === o.id;
                return (
                  <button key={o.id} onClick={() => { if (!selected) onAnswer(node.id, o.id); }}
                    disabled={!!selected}
                    className="w-full text-left fp-opt flex items-center gap-2 px-4 py-3 text-sm"
                    style={isSelected ? { borderColor: primary, background: `${primary}18` } : {}}>
                    <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                    {o.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Prominent reaction feedback ─────────────────────────────── */}
          {selectedOpt?.reaction && (
            <div className="mt-4 bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderLeft: `4px solid ${primary}` }}>
              <div className="px-4 py-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${primary}20` }}>
                  <Check size={14} style={{ color: primary }} />
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{selectedOpt.reaction}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'quest_quiz': {
      const opts        = (p.options as { id: string; text: string; correct: boolean; feedback?: string }[]) || [];
      const selectedId  = answers[node.id] as string | undefined;
      const selectedOpt = opts.find((o) => o.id === selectedId);
      const isCorrect   = selectedOpt?.correct ?? false;
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
          <p className="fp-heading font-semibold text-base mb-3">{s(p.question)}</p>
          <div className="space-y-2">
            {opts.map((o) => {
              const isSelected = selectedId === o.id;
              const revealed   = selectedId !== undefined;
              return (
                <button key={o.id} onClick={() => !selectedId && onAnswer(node.id, o.id)} disabled={!!selectedId}
                  className="w-full text-left fp-opt flex items-center gap-3 px-4 py-3 text-sm"
                  style={!revealed ? {} : o.correct
                    ? { borderColor: '#10b981', background: '#f0fdf4' }
                    : isSelected ? { borderColor: '#f87171', background: '#fef2f2' } : { opacity: 0.4 }}>
                  <div className="flex-shrink-0 w-4">
                    {!revealed
                      ? <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                      : o.correct ? <Check size={14} className="text-emerald-600" />
                      : isSelected ? <X size={14} className="text-red-500" />
                      : null}
                  </div>
                  <span className="flex-1 text-left">{o.text}</span>
                  {revealed && o.correct && (
                    <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">Richtige Antwort</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result banner */}
          {selectedOpt && (
            <div className={`mt-4 px-4 py-3.5 flex items-start gap-3 ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}
              style={{ borderRadius: br }}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {isCorrect
                  ? <Check size={15} className="text-emerald-600" />
                  : <X size={15} className="text-red-500" />}
              </div>
              <div>
                <p className={`font-semibold text-sm ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                  {isCorrect ? 'Richtig!' : 'Leider falsch.'}
                </p>
                <p className={`text-sm mt-0.5 leading-relaxed ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                  {selectedOpt.feedback || (isCorrect ? 'Gut gemacht!' : 'Die richtige Antwort ist oben markiert.')}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'quest_info':
      return (
        <div className="mx-4 my-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
          <h3 className="font-semibold text-sky-900 mb-1.5">{s(p.title)}</h3>
          {s(p.text).startsWith('<') ? (
            <div className="text-sm text-sky-700 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: s(p.text) }} />
          ) : (
            <p className="text-sm text-sky-700 leading-relaxed whitespace-pre-wrap">{s(p.text)}</p>
          )}
        </div>
      );

    case 'quest_freetext':
      return (
        <div className="px-5 py-4">
          {s(p.text).startsWith('<') ? (
            <div className="text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: s(p.text) }} />
          ) : (
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{s(p.text)}</p>
          )}
        </div>
      );

    case 'quest_file': {
      const fileUrl  = s(p.fileUrl);
      const fileName = s(p.fileName, 'download');
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FileDown size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{s(p.title, 'Datei')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{fileName}</p>
          </div>
          {!!fileUrl && (
            <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
              className="fp-btn px-4 py-2 text-xs font-semibold flex-shrink-0" style={{ borderRadius: br }}>
              {s(p.buttonText, 'Download')}
            </a>
          )}
        </div>
      );
    }

    case 'quest_vorname':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-4">{si(p.question)}</h2>
          <input type="text" value={firstName} onChange={(e) => onSetFirstName(e.target.value)}
            placeholder={s(p.placeholder, 'Dein Vorname…')}
            className="w-full px-4 py-3 border-2 border-slate-200 text-sm focus:outline-none"
            style={{ borderRadius: br }} />
        </div>
      );

    /* avatar block removed */

    case 'quest_spinner':
      return <SpinnerBlock text={s(p.text)} doneText={s(p.doneText)} primary={primary} onNext={() => onNext()} />;

    case 'quest_rating':
      return (
        <RatingBlock
          question={si(p.question)}
          emoji={s(p.emoji, '⭐')}
          count={n(p.count, 5)}
          nodeId={node.id}
          answers={answers}
          onAnswer={onAnswer}
        />
      );

    case 'quest_lead':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.headline, 'Vielen Dank!')} text={s(p.subtext)} primary={primary} />
        : <LeadFormBlock props={p} company={company} br={br} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form, cf) => onLeadSubmit(form, cf)} />;

    // ── BerufsCheck blocks ────────────────────────────────────────────────────
    case 'check_intro': {
      const imageUrl = s(p.imageUrl);
      return (
        <div className="px-6 py-10 text-white text-center min-h-[320px] flex flex-col justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          {!!imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl mb-4 opacity-90" />
          )}
          <h1 className="text-2xl font-bold mb-3 leading-tight">{s(p.headline)}</h1>
          <p className="text-sm text-white/70 mb-8 leading-relaxed">{s(p.subtext)}</p>
          <div>
            <button onClick={() => onNext()} className="fp-btn px-10 py-3.5 font-semibold text-base" style={{ borderRadius: br }}>
              {s(p.buttonText, 'Jetzt starten')}
            </button>
          </div>
        </div>
      );
    }

    case 'check_vorname':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-4">{s(p.question)}</h2>
          <input type="text" value={firstName} onChange={(e) => onSetFirstName(e.target.value)}
            placeholder={s(p.placeholder, 'Dein Vorname')}
            className="w-full px-4 py-3 border-2 border-slate-200 text-sm focus:outline-none"
            style={{ borderRadius: br }} />
        </div>
      );

    case 'check_frage':
    case 'check_ergebnisfrage': {
      const isSlider = node.type === 'check_frage' && p.frageType === 'slider';
      const opts     = (p.options as { id: string; text: string }[]) || [];
      const selected = answers[node.id] as string | undefined;

      if (isSlider) {
        return (
          <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
            <h2 className="fp-heading text-xl font-bold mb-6">{s(p.question)}</h2>
            <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} primary={primary} />
          </div>
        );
      }

      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-4">{s(p.question)}</h2>
          <div className="space-y-2">
            {opts.map((o) => {
              const isSelected = selected === o.id;
              return (
                <button key={o.id}
                  onClick={() => { if (!selected) { onAnswer(node.id, o.id); setTimeout(onNext, 450); } }}
                  disabled={!!selected}
                  className="w-full text-left fp-opt px-4 py-3 text-sm block"
                  style={isSelected ? { borderColor: primary, background: `${primary}18`, fontWeight: 600 } : {}}>
                  {o.text}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'check_selbst':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-2">{s(p.question)}</h2>
          {b(p.description) && <p className="text-sm text-slate-500 mb-5">{s(p.description)}</p>}
          <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} primary={primary} />
        </div>
      );

    case 'check_lead':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.headline, 'Vielen Dank!')} text="" primary={primary} />
        : <LeadFormBlock props={p} company={company} br={br} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form) => onLeadSubmit(form)} />;

    case 'check_ergebnis': {
      const scoreVals = Object.values(scores);
      const maxScore  = Math.max(...scoreVals, 1);
      const headline  = s(p.headline, 'Dein Ergebnis!').replace('{{name}}', firstName || 'dir');
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
            <Trophy size={28} style={{ color: primary }} />
          </div>
          <h2 className="fp-heading text-2xl font-bold mb-2 text-center">{headline}</h2>
          {b(p.subtext) && <p className="text-slate-500 text-sm mb-5 text-center">{s(p.subtext)}</p>}
          {b(p.showDimensionBars) && dimensions.length > 0 && (
            <div className="space-y-4 mt-4">
              {dimensions.map((dim) => {
                const score    = scores[dim.id] ?? 0;
                const pct      = Math.min(100, Math.round((score / maxScore) * 100));
                const barColor = dim.color || primary;
                return (
                  <div key={dim.id}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{dim.name}</span>
                      <span className="text-sm font-bold" style={{ color: barColor }}>{score} Punkte</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    {dim.description && <p className="text-xs text-slate-400 mt-1">{dim.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
          {b(p.showDimensionBars) && dimensions.length === 0 && scoreVals.length > 0 && (
            <p className="text-sm text-slate-500 text-center mt-3">
              Du hast {scoreVals.reduce((a, v) => a + v, 0)} Punkte erreicht.
            </p>
          )}
        </div>
      );
    }

    // ── Formular blocks ───────────────────────────────────────────────────────
    case 'form_hero': {
      const imageUrl = s(p.imageUrl);
      return (
        <div className="relative min-h-[320px] flex items-center justify-center text-center overflow-hidden" style={{ background: primary }}>
          {!!imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 px-8 py-12">
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">{s(p.headline)}</h1>
            {b(p.subtext) && <p className="text-white/80 text-base mb-6 leading-relaxed">{s(p.subtext)}</p>}
            {b(p.ctaText) && (
              <button onClick={() => onNext()}
                className="inline-flex items-center gap-2 px-8 py-3 bg-white font-semibold text-sm shadow-lg"
                style={{ borderRadius: br, color: primary }}>
                {s(p.ctaText)} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      );
    }

    case 'form_text':
      return (
        <div className="px-6 py-8">
          {b(p.headline) && <h2 className="fp-heading text-2xl font-bold mb-4">{s(p.headline)}</h2>}
          <div className="text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: s(p.content) }} />
        </div>
      );

    case 'form_image': {
      const imageUrl = s(p.imageUrl);
      return imageUrl ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="w-full" />
          {b(p.caption) && <p className="text-xs text-slate-400 text-center px-4 pt-1">{s(p.caption)}</p>}
        </div>
      ) : null;
    }

    case 'form_step': {
      const fields   = (p.fields as { id: string; label: string; type?: string; required?: boolean }[]) || [];
      const stepData = (answers[node.id] as Record<string, string>) ?? {};
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          {b(p.title) && <h3 className="fp-heading font-bold text-lg mb-1">{s(p.title)}</h3>}
          {b(p.description) && <p className="text-sm text-slate-500 mb-4">{s(p.description)}</p>}
          <div className="space-y-3 mt-3">
            {fields.map((f) => (
              <div key={f.id}>
                <label className="text-xs font-medium text-slate-500 block mb-1">{f.label}{f.required ? ' *' : ''}</label>
                <input
                  type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
                  value={stepData[f.id] ?? ''}
                  onChange={(e) => {
                    const newData = { ...stepData, [f.id]: e.target.value };
                    onAnswer(node.id, newData);
                    // Mirror email/name/phone into leadForm for final submission
                    if (f.type === 'email') setLeadForm({ ...leadForm, email: e.target.value });
                    else if (f.label.toLowerCase().includes('vorname') || f.label.toLowerCase().includes('name')) {
                      setLeadForm({ ...leadForm, firstName: e.target.value });
                    } else if (f.type === 'tel') setLeadForm({ ...leadForm, phone: e.target.value });
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 text-sm focus:outline-none"
                  style={{ borderRadius: br }}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'form_config':
      // reuse the generic lead form block so styling matches quest/check
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.thankYouHeadline, 'Vielen Dank!')} text={s(p.thankYouText)} primary={primary} />
        : <LeadFormBlock
            props={p}
            company={company}
            br={br}
            leadForm={leadForm}
            setLeadForm={setLeadForm}
            onSubmit={(form) => onFormSubmit(s(p.thankYouHeadline, 'Vielen Dank!'), s(p.thankYouText), form)}
          />;

    default:
      return null;
  }
}

// ─── Lead form block (check_lead / quest_lead) ────────────────────────────────
function LeadFormBlock({ props: p, company, br, leadForm, setLeadForm, onSubmit }: {
  props: Record<string, unknown>; company: Company; br: string;
  leadForm: LeadForm; setLeadForm: (f: LeadForm) => void;
  onSubmit: (form: LeadForm, customFields?: Record<string, string>) => void;
}) {
  const u = (partial: Partial<LeadForm>) => setLeadForm({ ...leadForm, ...partial });
  const fieldDefs = (p.fields as LeadFieldDef[]) ?? [];
  const useFields = fieldDefs.length > 0;
  const [vals, setVals] = useState<Record<string, string>>({});
  const setVal = (id: string, val: string) => setVals((prev) => ({ ...prev, [id]: val }));

  const emailField = fieldDefs.find((f) => f.type === 'email');
  const emailValue = useFields ? (emailField ? (vals[emailField.id] ?? '') : '') : leadForm.email;
  const canSubmit = emailValue.includes('@') && leadForm.gdpr;
  const privacyText = s(p.privacyText, 'Ich stimme zu, dass {{company}} meine Daten verarbeitet.').replace('{{company}}', company.name);

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
                  <span className="text-xs text-slate-500">{f.label}{f.required ? ' *' : ''}</span>
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
              <input type="tel" placeholder="Telefonnummer (optional)" value={leadForm.phone} onChange={(e) => u({ phone: e.target.value })}
                className={inputCls} style={{ borderRadius: br }} />
            )}
          </>
        )}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={leadForm.gdpr} onChange={(e) => u({ gdpr: e.target.checked })} className="fp-check mt-0.5 flex-shrink-0" />
          <span className="text-xs text-slate-500 leading-relaxed">
            {privacyText}
            {company.privacyUrl && (
              <> <a href={company.privacyUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">Datenschutzerklärung</a></>
            )}
            {' '}*
          </span>
        </label>
      </div>
      <button onClick={handleSubmit} disabled={!canSubmit}
        className="fp-btn w-full mt-4 py-3.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderRadius: br }}>
        {s(p.buttonText, 'Abschicken')}
      </button>
    </div>
  );
}

// ─── Completion / Thank you screen ────────────────────────────────────────────
function CompletionScreen({ company, headline, text, primary }: {
  company: Company; headline: string; text: string; primary: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: `${primary}20` }}>
        <Check size={36} style={{ color: primary }} />
      </div>
      <h2 className="fp-heading text-2xl font-bold mb-3">{headline}</h2>
      {text && <p className="text-slate-500 text-base leading-relaxed max-w-xs">{text}</p>}
      <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs">
        {company.logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={company.logo} alt="" className="h-5 w-5 rounded object-contain" />
          : <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: primary }}>{company.name.charAt(0)}</div>}
        <span>{company.name}</span>
      </div>
    </div>
  );
}
