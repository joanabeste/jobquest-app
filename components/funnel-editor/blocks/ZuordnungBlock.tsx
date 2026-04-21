'use client';

import { useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';

export type ZuordnungPair = { id: string; left: string; right: string };

// 6 distinct colors for matched pairs
const PAIR_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', dot: '#7c3aed' },
  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   dot: '#2563eb' },
  { bg: 'bg-emerald-100',text: 'text-emerald-700', border: 'border-emerald-300',dot: '#059669' },
  { bg: 'bg-amber-100',  text: 'text-amber-700',   border: 'border-amber-300',  dot: '#d97706' },
  { bg: 'bg-rose-100',   text: 'text-rose-700',    border: 'border-rose-300',   dot: '#e11d48' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-700',    border: 'border-cyan-300',   dot: '#0891b2' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ZuordnungBlock({
  question, pairs: rawPairs, shuffleRight, showFeedback, feedbackText,
  primary, br, nodeId, answers, onAnswer, onNext,
}: {
  question: string;
  pairs: ZuordnungPair[];
  shuffleRight: boolean;
  showFeedback: boolean;
  feedbackText: string;
  primary: string;
  br: string;
  nodeId: string;
  answers: Record<string, unknown>;
  onAnswer: (id: string, val: unknown) => void;
  onNext: () => void;
}) {
  // rightOrder: shuffled right-side items, keyed by their pair id
  const [rightOrder] = useState<ZuordnungPair[]>(() => {
    const saved = answers[`${nodeId}_rightOrder`] as string[] | undefined;
    if (saved) return saved.map((id) => rawPairs.find((p) => p.id === id)!).filter(Boolean);
    return shuffleRight ? shuffle(rawPairs) : [...rawPairs];
  });

  // userMatches: leftPairId → rightPairId
  const [userMatches, setUserMatches] = useState<Record<string, string>>(
    (answers[`${nodeId}_matches`] as Record<string, string>) ?? {},
  );

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(answers[`${nodeId}_confirmed`] === true);
  const [allCorrect, setAllCorrect] = useState<boolean | null>(
    answers[`${nodeId}_allCorrect`] as boolean | null ?? null,
  );

  function saveRightOrder(order: ZuordnungPair[]) {
    onAnswer(`${nodeId}_rightOrder`, order.map((p) => p.id));
  }

  // Returns the pair-index (0-5) that a leftId is matched to (for color)
  function matchColorIdx(leftId: string): number {
    const rightId = userMatches[leftId];
    if (!rightId) return -1;
    return rawPairs.findIndex((p) => p.id === rightId) % PAIR_COLORS.length;
  }

  function handleLeftClick(pairId: string) {
    if (confirmed) return;
    if (selectedLeftId === pairId) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(pairId);
    }
  }

  function handleRightClick(rightPairId: string) {
    if (confirmed) return;
    if (!selectedLeftId) {
      // If right item already matched, unlink it
      const existingLeft = Object.keys(userMatches).find((k) => userMatches[k] === rightPairId);
      if (existingLeft) {
        const next = { ...userMatches };
        delete next[existingLeft];
        setUserMatches(next);
        onAnswer(`${nodeId}_matches`, next);
      }
      return;
    }

    const next = { ...userMatches };

    // Remove any existing match for this left item
    delete next[selectedLeftId];

    // Remove any existing match for this right item
    const prevLeft = Object.keys(next).find((k) => next[k] === rightPairId);
    if (prevLeft) delete next[prevLeft];

    next[selectedLeftId] = rightPairId;
    setUserMatches(next);
    onAnswer(`${nodeId}_matches`, next);
    setSelectedLeftId(null);
  }

  function handleConfirm() {
    const correct = rawPairs.every((p) => userMatches[p.id] === p.id);
    setAllCorrect(correct);
    onAnswer(`${nodeId}_allCorrect`, correct);
    setConfirmed(true);
    onAnswer(`${nodeId}_confirmed`, true);
  }

  const allMatched = rawPairs.every((p) => userMatches[p.id]);

  // Save right order on first render
  useState(() => { saveRightOrder(rightOrder); });

  return (
    <div className="mx-4 my-3 space-y-3">
      <p className="fp-heading font-semibold text-base text-center px-1" dangerouslySetInnerHTML={{ __html: question }} />

      {!confirmed && selectedLeftId && (
        <p className="text-[11px] text-center text-slate-400">Jetzt rechts die passende Erklärung auswählen</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Begriffe</p>
          {rawPairs.map((pair) => {
            const colorIdx = matchColorIdx(pair.id);
            const color = colorIdx >= 0 ? PAIR_COLORS[colorIdx] : null;
            const isSelected = selectedLeftId === pair.id;
            const isMatchedRight = !!userMatches[pair.id];

            let itemClass = 'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ';
            if (confirmed) {
              const correct = userMatches[pair.id] === pair.id;
              itemClass += correct ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800';
            } else if (isSelected) {
              itemClass += 'border-2 shadow-sm ';
              itemClass += color ? `${color.bg} ${color.border} ${color.text}` : 'bg-violet-50 border-violet-400 text-violet-800';
            } else if (isMatchedRight && color) {
              itemClass += `${color.bg} ${color.border} ${color.text}`;
            } else {
              itemClass += 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
            }

            return (
              <div key={pair.id} className={itemClass} onClick={() => handleLeftClick(pair.id)}>
                {confirmed && (
                  userMatches[pair.id] === pair.id
                    ? <Check size={13} className="text-emerald-500 flex-shrink-0" />
                    : <X size={13} className="text-red-400 flex-shrink-0" />
                )}
                {!confirmed && color && <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ background: color.dot }} />}
                <span className="leading-tight">{pair.left}</span>
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center">Erklärungen</p>
          {rightOrder.map((pair) => {
            // Find which left item matched to this right
            const matchedLeftId = Object.keys(userMatches).find((k) => userMatches[k] === pair.id);
            const colorIdx = matchedLeftId ? rawPairs.findIndex((p) => p.id === matchedLeftId) % PAIR_COLORS.length : -1;
            const color = colorIdx >= 0 ? PAIR_COLORS[colorIdx] : null;
            const isTarget = selectedLeftId !== null;

            let itemClass = 'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all select-none ';
            if (confirmed) {
              const correct = matchedLeftId === pair.id;
              itemClass += correct ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-300 text-red-700';
              itemClass += ' cursor-default';
            } else if (color) {
              itemClass += `${color.bg} ${color.border} ${color.text} cursor-pointer`;
            } else if (isTarget) {
              itemClass += 'bg-white border-slate-300 text-slate-700 hover:border-violet-300 hover:bg-violet-50 cursor-pointer';
            } else {
              itemClass += 'bg-white border-slate-200 text-slate-600 cursor-pointer hover:border-slate-300';
            }

            return (
              <div key={pair.id} className={itemClass} onClick={() => handleRightClick(pair.id)}>
                {!confirmed && color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color.dot }} />}
                {confirmed && (
                  matchedLeftId === pair.id
                    ? <Check size={13} className="text-emerald-500 flex-shrink-0" />
                    : <X size={13} className="text-red-400 flex-shrink-0" />
                )}
                <span className="leading-tight">{pair.right}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback banner */}
      {confirmed && showFeedback && allCorrect && feedbackText && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
          <Check size={15} className="text-emerald-600 flex-shrink-0" />
          {feedbackText}
        </div>
      )}
      {confirmed && showFeedback && !allCorrect && (
        <div className="px-4 py-3 rounded-xl text-sm text-slate-600 bg-slate-50 border border-slate-200">
          Nicht ganz — schau dir die rot markierten Paare an.
        </div>
      )}

      {!confirmed ? (
        <button
          onClick={handleConfirm}
          disabled={!allMatched}
          className="w-full fp-btn py-3 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderRadius: br }}
        >
          Zuordnung bestätigen
        </button>
      ) : (
        <button
          onClick={onNext}
          className="w-full fp-btn py-3 font-semibold text-sm flex items-center justify-center gap-2"
          style={{ borderRadius: br }}
        >
          Weiter <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
