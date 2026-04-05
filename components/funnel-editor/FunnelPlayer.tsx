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
import { careerCheckStorage } from '@/lib/storage';
import { useCorporateDesign } from '@/lib/use-corporate-design';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { CompletionScreen, StyledBlock, DialogLine, LeadForm, emptyLead } from './BlockRenderer';

interface Props { doc: FunnelDoc; company: Company; contentDbId?: string; }

// ─── Main player ──────────────────────────────────────────────────────────────
export default function FunnelPlayer({ doc, company, contentDbId }: Props) {
  const [pageIndex, setPageIndex]   = useState(0);
  const [answers, setAnswers]       = useState<Record<string, unknown>>({});
  const [firstName, setFirstName]   = useState('');
  const [capturedVars, setCapturedVars] = useState<Record<string, string>>({});
  const [leadForm, setLeadForm]     = useState<LeadForm>(emptyLead);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSaveError, setLeadSaveError] = useState(false);
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

  const { primary, br, css } = useCorporateDesign(company);

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
  function handleCapture(varName: string, value: string) {
    if (varName === 'firstName') setFirstName(value);
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
              className="fp-btn flex-1 py-3.5 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ borderRadius: br, background: primary, color: '#fff' }}
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
