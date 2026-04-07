'use client';

/**
 * FunnelPlayer – step-by-step public renderer for FunnelDoc content.
 * Each page in the FunnelDoc is one "step". Users navigate forward/back.
 * Interactive blocks (choices, sliders, quizzes, lead forms) are fully functional.
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { FunnelDoc, LayoutNode, BlockNode } from '@/lib/funnel-types';
import { Company, Dimension } from '@/lib/types';
import { flatBlocks, isSubmitPage, computeScores } from '@/lib/funnel-utils';
import { careerCheckStorage, analyticsStorage } from '@/lib/storage';
import { useCorporateDesign } from '@/lib/use-corporate-design';
import { useFavicon } from '@/lib/use-favicon';
import { ChevronLeft, ChevronRight, MapPin, CheckCircle, Send } from 'lucide-react';
import { StyledBlock, DialogLine, LeadForm, emptyLead } from './BlockRenderer';
import SuccessPage from '@/components/quest/SuccessPage';

interface Props { doc: FunnelDoc; company: Company; contentDbId?: string; }

// ─── Main player ──────────────────────────────────────────────────────────────
export default function FunnelPlayer({ doc, company, contentDbId }: Props) {
  const [pageIndex, setPageIndex]   = useState(0);
  const [history, setHistory]       = useState<number[]>([]);
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  if (!sessionIdRef.current && typeof crypto !== 'undefined') {
    sessionIdRef.current = crypto.randomUUID();
  }
  const [answers, setAnswers]       = useState<Record<string, unknown>>({});
  const [firstName, setFirstName]   = useState('');
  const [capturedVars, setCapturedVars] = useState<Record<string, string>>({});
  const [leadForm, setLeadForm]     = useState<LeadForm>(emptyLead);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSaveError, setLeadSaveError] = useState(false);
  const [completed, setCompleted]   = useState(false);
  const [_completionMsg, setCompletionMsg] = useState<{ headline: string; text: string } | null>(null);
  const [dialogVisible, setDialogVisible] = useState(0);
  const [footerInputValue, setFooterInputValue] = useState('');
  const topRef = useRef<HTMLDivElement>(null);

  // Reset dialog + footer input when page changes (must be before any conditional returns)
  useEffect(() => { setDialogVisible(0); setFooterInputValue(''); }, [pageIndex]);

  // If the currently shown page becomes invisible (because answers changed retroactively
  // via "back"), or if the very first page has a visibleIf that requires an answer we
  // don't have yet, we leave the index untouched — the gate is enforced via goNext only.

  // ── Analytics tracking (quest + career check + form page) ───────────────────
  const isQuest = doc.contentType === 'quest';
  const isCheck = doc.contentType === 'check';
  const isForm  = doc.contentType === 'form';
  const trackable = (isQuest || isCheck || isForm) && !!contentDbId;
  const targetIds = (): { jobQuestId?: string; careerCheckId?: string; formPageId?: string } => {
    if (isQuest) return { jobQuestId: contentDbId };
    if (isCheck) return { careerCheckId: contentDbId };
    return { formPageId: contentDbId };
  };
  useEffect(() => {
    if (!trackable) return;
    analyticsStorage.save({
      id: crypto.randomUUID(), ...targetIds(), type: 'view',
      sessionId: sessionIdRef.current, timestamp: new Date().toISOString(),
    }).catch((err) => console.error('[FunnelPlayer] track view failed', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackable, contentDbId]);
  useEffect(() => {
    if (!trackable) return;
    if (pageIndex > 0 && !startedRef.current) {
      startedRef.current = true;
      analyticsStorage.save({
        id: crypto.randomUUID(), ...targetIds(), type: 'start',
        sessionId: sessionIdRef.current,
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error('[FunnelPlayer] track start failed', err));
    }
    // Heartbeat: save a duration-bearing 'view' event on each page navigation
    // so Verweildauer is measurable even when users don't complete the funnel.
    if (pageIndex > 0) {
      analyticsStorage.save({
        id: crypto.randomUUID(), ...targetIds(), type: 'view',
        sessionId: sessionIdRef.current,
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error('[FunnelPlayer] track heartbeat failed', err));
    }
    // Per-page tracking: one page_view per visited funnel page so we can
    // compute view counts and exit rates per page on the stats screen.
    const visitedPageId = doc.pages[pageIndex]?.id;
    if (visitedPageId) {
      analyticsStorage.save({
        id: crypto.randomUUID(), ...targetIds(), type: 'page_view',
        sessionId: sessionIdRef.current,
        moduleId: visitedPageId,
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error('[FunnelPlayer] track page_view failed', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, trackable, contentDbId]);
  useEffect(() => {
    if (!trackable || !completed || completedRef.current) return;
    completedRef.current = true;
    analyticsStorage.save({
      id: crypto.randomUUID(), ...targetIds(), type: 'complete',
      sessionId: sessionIdRef.current,
      duration: Math.round((Date.now() - startTimeRef.current) / 1000),
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error('[FunnelPlayer] track complete failed', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, trackable, contentDbId]);

  const [careerCheck, setCareerCheck] = useState<import('@/lib/types').CareerCheck | null>(null);
  useEffect(() => {
    if (doc.contentType === 'check' && contentDbId) {
      careerCheckStorage.getById(contentDbId).then((c) => setCareerCheck(c ?? null));
    }
  }, [doc.contentType, contentDbId]);
  const dimensions: Dimension[] = careerCheck?.dimensions ?? [];

  const { primary, br, css } = useCorporateDesign(company);
  useFavicon(company.corporateDesign?.faviconUrl);

  // ── Scores (memoized – only recompute when answers or pages change) ─────────
  const scores = useMemo(
    () => computeScores(doc.pages, answers),
    [doc.pages, answers],
  );

  // ── Navigation ───────────────────────────────────────────────────────────────
  function scrollTop() {
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  /**
   * Returns true when the page's visibleIf condition is satisfied (or absent).
   * Used to auto-skip pages whose gating filter doesn't match the current answers.
   */
  function isPageVisible(idx: number): boolean {
    const page = doc.pages[idx];
    if (!page?.visibleIf) return true;
    const { sourceBlockId, equals } = page.visibleIf;
    const ans = answers[sourceBlockId];
    if (ans === undefined || ans === null) return false;
    const list = Array.isArray(equals) ? equals : [equals];
    return list.includes(String(ans));
  }
  function findNextVisible(fromIdx: number): number {
    for (let i = fromIdx; i < doc.pages.length; i++) {
      if (isPageVisible(i)) return i;
    }
    return -1;
  }
  function goNext(targetPageId?: string) {
    if (targetPageId) {
      const idx = doc.pages.findIndex((p) => p.id === targetPageId);
      if (idx >= 0) {
        const visible = findNextVisible(idx);
        if (visible >= 0) { setHistory((h) => [...h, pageIndex]); setPageIndex(visible); scrollTop(); return; }
      }
    }
    const next = findNextVisible(pageIndex + 1);
    if (next >= 0) { setHistory((h) => [...h, pageIndex]); setPageIndex(next); scrollTop(); }
    else { setCompleted(true); scrollTop(); }
  }
  function goBack() {
    const prevIdx = history[history.length - 1] ?? (pageIndex > 0 ? pageIndex - 1 : -1);
    if (prevIdx < 0) return;
    // Reset answer of the first interactive block on the target page
    const targetPage = doc.pages[prevIdx];
    const targetBlocks = flatBlocks(targetPage.nodes);
    const interactiveTypes = ['quest_decision', 'quest_quiz', 'quest_rating', 'quest_zuordnung', 'quest_dialog'];
    const interactiveBlock = targetBlocks.find((b) => interactiveTypes.includes(b.type));
    if (interactiveBlock) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[interactiveBlock.id];
        delete next[`${interactiveBlock.id}_checked`]; // Quiz reveal
        delete next[`${interactiveBlock.id}_confirmed`]; // Zuordnung
        return next;
      });
      if (interactiveBlock.type === 'quest_dialog') {
        setDialogVisible(0);
      }
    }
    setHistory((h) => h.slice(0, -1));
    setPageIndex(prevIdx);
    scrollTop();
  }
  function setAnswer(nodeId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [nodeId]: value }));
  }
  function handleCapture(varName: string, value: string) {
    if (varName === 'firstName' || varName === 'vorname') setFirstName(value);
    setCapturedVars((prev) => ({ ...prev, [varName]: value }));
  }

  // ── Lead saving (shared between quest_lead, check_lead, form_config) ─────────
  async function saveLead(form: LeadForm, customFields?: Record<string, string>) {
    try {
      const res = await fetch('/api/public/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: {
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
          },
          contentId: contentDbId ?? doc.contentId,
          companyName: company.name,
          karriereseiteUrl: company.careerPageUrl ?? '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`HTTP ${res.status}: ${(body as { error?: string }).error ?? 'unknown'}`);
      }
      const result = await res.json().catch(() => ({}));
      if ((result as { emailStatus?: string }).emailStatus === 'error') {
        console.warn('[FunnelPlayer] Lead gespeichert, aber E-Mail fehlgeschlagen:', (result as { emailError?: string }).emailError);
      }
    } catch (err) {
      console.error('[FunnelPlayer] submit-lead fehlgeschlagen:', err);
      setLeadSaveError(true);
    }
  }
  function handleLeadSubmit(form: LeadForm, customFields?: Record<string, string>) {
    saveLead(form, customFields);   // fire-and-forget — user navigates immediately
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
  const sortBlock     = blocks.find((bl) => bl.type === 'quest_zuordnung');
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

  // Quiz check state: answer selected but not yet checked → button becomes "Überprüfen"
  const quizAnswered  = quizBlock ? answers[quizBlock.id] !== undefined : true;
  const quizChecked   = quizBlock ? answers[`${quizBlock.id}_checked`] === true : true;
  const quizNeedsCheck = quizAnswered && !quizChecked;
  // For multi-select: require at least 1 selection
  const quizHasSelection = quizBlock
    ? (Array.isArray(answers[quizBlock.id]) ? (answers[quizBlock.id] as string[]).length > 0 : answers[quizBlock.id] !== undefined)
    : true;

  // Weiter is blocked until required interactions are done
  const weiterEnabled = (!decisionBlock || decisionSelected !== undefined)
                     && (!quizBlock     || quizHasSelection)
                     && (!ratingBlock   || answers[ratingBlock.id] !== undefined)
                     && (!sortBlock     || answers[`${sortBlock.id}_confirmed`] === true)
                     && dialogComplete
                     && dialogInteractionAnswered;

  const isLastPage    = pageIndex === doc.pages.length - 1;
  const progress      = (pageIndex + 1) / doc.pages.length;

  // Dialog input in footer: show when dialog has input, lines are done, and not yet submitted
  const showDialogInput = dialogBlock && hasDialogInput && dialogComplete && !dialogInteractionAnswered;
  const dialogInputMeta = dialogBlock
    ? (dialogBlock.props.input as { placeholder?: string; captures?: string; followUpText?: string } | undefined)
    : undefined;

  const sharedBlockProps = {
    company, primary, br,
    answers, firstName,
    onSetFirstName: setFirstName,
    onAnswer: setAnswer,
    onNext: goNext,
    onCapture: handleCapture,
    capturedVars,
    leadForm, setLeadForm, leadSubmitted,
    onLeadSubmit: handleLeadSubmit,
    onFormSubmit: handleFormSubmit,
    scores,
    dimensions,
    dialogVisible,
    onDialogAdvance: (count: number) => setDialogVisible(count),
    dialogInputInFooter: hasDialogInput,
  };

  return (
    <div className="fp-root min-h-[100dvh] bg-slate-50">
      <style>{css}{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div ref={topRef} />

      {/* ── Lead save error banner ─────────────────────────────────────────── */}
      {leadSaveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
          <span className="flex-1">
            Deine Daten konnten leider nicht gespeichert werden. Bitte kontaktiere uns direkt.
          </span>
          <button onClick={() => setLeadSaveError(false)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5">✕</button>
        </div>
      )}

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
               
              <img src={company.logo} alt={company.name} className="h-7 w-auto max-w-[120px] rounded-lg object-contain flex-shrink-0" />
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
      <main className="max-w-lg mx-auto w-full pb-24">
        {completed ? (
          <SuccessPage company={company} primary={primary} br={br} />
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
            {showDialogInput ? (
              /* ── Messenger-style input bar ─────────────────────────── */
              <>
                <input
                  type="text"
                  value={footerInputValue}
                  onChange={(e) => setFooterInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && footerInputValue.trim() && dialogBlock) {
                      const val = footerInputValue.trim();
                      if (dialogInputMeta?.captures) {
                        if ((dialogInputMeta.captures === 'firstName' || dialogInputMeta.captures === 'vorname')) setFirstName(val);
                        handleCapture(dialogInputMeta.captures, val);
                      }
                      setAnswer(dialogBlock.id, val);
                      setFooterInputValue('');
                    }
                  }}
                  placeholder={dialogInputMeta?.placeholder ?? 'Deine Antwort…'}
                  className="flex-1 px-4 py-3 text-sm rounded-2xl border-2 bg-white outline-none transition-colors focus:border-violet-400"
                  style={{ borderColor: `${primary}40`, fontSize: '16px' }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (!footerInputValue.trim() || !dialogBlock) return;
                    const val = footerInputValue.trim();
                    if (dialogInputMeta?.captures) {
                      if ((dialogInputMeta.captures === 'firstName' || dialogInputMeta.captures === 'vorname')) setFirstName(val);
                      handleCapture(dialogInputMeta.captures, val);
                    }
                    setAnswer(dialogBlock.id, val);
                    setFooterInputValue('');
                  }}
                  disabled={!footerInputValue.trim()}
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: primary }}
                >
                  <Send size={18} className="text-white" />
                </button>
              </>
            ) : (
              /* ── Standard navigation buttons ──────────────────────── */
              <>
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
                  onClick={() => {
                    if (quizNeedsCheck && quizBlock) {
                      setAnswers((prev) => ({ ...prev, [`${quizBlock.id}_checked`]: true }));
                      return;
                    }
                    goNext(weiterTarget);
                  }}
                  disabled={!weiterEnabled}
                  className="fp-btn flex-1 py-3.5 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ borderRadius: br, background: primary, color: '#fff' }}
                >
                  {quizNeedsCheck
                    ? <><CheckCircle size={15} /> Überprüfen</>
                    : <>{isLastPage ? 'Fertig' : 'Weiter'} {!isLastPage && <ChevronRight size={15} />}</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
