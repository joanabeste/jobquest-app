'use client';

import { useState } from 'react';
import { ArrowRight, Check, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

export type SortItem = { id: string; text: string; correctIndex?: number };

export default function SortBlock({ question, items: rawItems, showFeedback, feedbackText, shuffleItems, primary, br, nodeId, answers, onAnswer, onNext }: {
  question: string;
  items: SortItem[];
  showFeedback: boolean;
  feedbackText: string;
  shuffleItems: boolean;
  primary: string;
  br: string;
  nodeId: string;
  answers: Record<string, unknown>;
  onAnswer: (id: string, val: unknown) => void;
  onNext: () => void;
}) {
  // On first render: shuffle if needed, then keep stable via answers state
  const [order, setOrder] = useState<SortItem[]>(() => {
    const saved = answers[nodeId] as string[] | undefined;
    if (saved) {
      return saved.map((id) => rawItems.find((it) => it.id === id)!).filter(Boolean);
    }
    const list = [...rawItems];
    if (shuffleItems) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  });
  const [confirmed, setConfirmed] = useState(answers[`${nodeId}_confirmed`] === true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(
    (answers[`${nodeId}_feedback`] as 'correct' | 'wrong' | null) ?? null,
  );

  function move(idx: number, dir: 'up' | 'down') {
    if (confirmed) return;
    const next = [...order];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setOrder(next);
  }

  function confirm() {
    const ids = order.map((it) => it.id);
    onAnswer(nodeId, ids);

    let fb: 'correct' | 'wrong' | null = null;
    if (showFeedback) {
      const itemsWithCorrect = rawItems.filter((it) => it.correctIndex !== undefined);
      if (itemsWithCorrect.length > 0) {
        const allCorrect = itemsWithCorrect.every((it) => order[it.correctIndex!]?.id === it.id);
        fb = allCorrect ? 'correct' : 'wrong';
      }
    }
    setFeedback(fb);
    onAnswer(`${nodeId}_feedback`, fb);
    setConfirmed(true);
    onAnswer(`${nodeId}_confirmed`, true);
  }

  return (
    <div className="mx-4 my-3 space-y-3">
      <p className="fp-heading font-semibold text-base text-center px-1" dangerouslySetInnerHTML={{ __html: question }} />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
        {order.map((item, i) => {
          const isCorrect = feedback === 'correct' || (feedback === 'wrong' && showFeedback && item.correctIndex !== undefined && order[item.correctIndex]?.id === item.id);
          const isWrong = feedback === 'wrong' && showFeedback && item.correctIndex !== undefined && order[item.correctIndex]?.id !== item.id;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 transition-colors ${
                isCorrect ? 'bg-emerald-50' : isWrong ? 'bg-red-50' : 'bg-white'
              }`}
            >
              <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: `${primary}20`, color: primary }}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-slate-700">{item.text}</span>
              {!confirmed && (
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, 'up')} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => move(i, 'down')} disabled={i === order.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-20 p-0.5">
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
              {confirmed && isCorrect && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
              {confirmed && isWrong && <X size={14} className="text-red-400 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Feedback banner */}
      {confirmed && feedback === 'correct' && feedbackText && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-2">
          <Check size={15} className="text-emerald-600 flex-shrink-0" />
          {feedbackText}
        </div>
      )}
      {confirmed && feedback === 'wrong' && (
        <div className="px-4 py-3 rounded-xl text-sm text-slate-600 bg-slate-50 border border-slate-200">
          Nicht ganz — schau dir die markierten Felder an.
        </div>
      )}

      {!confirmed ? (
        <button
          onClick={confirm}
          className="w-full fp-btn py-3 font-semibold text-sm"
          style={{ borderRadius: br, background: primary, color: '#fff' }}
        >
          Reihenfolge bestätigen
        </button>
      ) : (
        <button
          onClick={onNext}
          className="w-full fp-btn py-3 font-semibold text-sm flex items-center justify-center gap-2"
          style={{ borderRadius: br, background: primary, color: '#fff' }}
        >
          Weiter <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
