'use client';

import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, Meh, ThumbsDown, SkipForward } from 'lucide-react';
import { SKIP_ANSWER } from '@/lib/funnel-utils';

export interface SwipeCard {
  id: string;
  text: string;
  imageUrl?: string;
  optionPositive?: { label?: string; emoji?: string; scores?: Record<string, number> };
  optionNeutral?:  { label?: string; emoji?: string; scores?: Record<string, number> };
  optionNegative?: { label?: string; emoji?: string; scores?: Record<string, number> };
}

export type SwipeChoice = 'pos' | 'neu' | 'neg' | 'skip';
export interface SwipeResult { cardId: string; choice: SwipeChoice }

interface Props {
  nodeId: string;
  props: Record<string, unknown>;
  answers: Record<string, unknown>;
  onAnswer: (id: string, value: unknown) => void;
  onNext: () => void;
  primary: string;
  br: string;
}

const THRESHOLD = 80;

export default function SwipeDeckBlock({ nodeId, props, answers, onAnswer, onNext, primary, br }: Props) {
  const cards = (props.cards as SwipeCard[]) || [];
  const allowSkip = props.allowSkip !== false;
  const question = (props.question as string) || '';

  const previous = answers[nodeId] as SwipeResult[] | undefined;
  const [results, setResults] = useState<SwipeResult[]>(previous && previous !== (SKIP_ANSWER as unknown) ? previous : []);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [exiting, setExiting] = useState<{ choice: SwipeChoice; dx: number } | null>(null);

  const idx = results.length;
  const card = cards[idx];

  function commit(choice: SwipeChoice) {
    if (!card || exiting) return;
    const dx = choice === 'pos' ? 600 : choice === 'neg' ? -600 : 0;
    setExiting({ choice, dx });
    setTimeout(() => {
      const next = [...results, { cardId: card.id, choice }];
      setResults(next);
      setExiting(null);
      setDrag(null);
      startRef.current = null;
      if (next.length >= cards.length) {
        onAnswer(nodeId, next);
        setTimeout(onNext, 250);
      }
    }, 220);
  }

  // Keyboard
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!card || exiting) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); commit('pos'); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); commit('neg'); }
      else if (e.key === 'Enter') { e.preventDefault(); commit('neu'); }
      else if (e.key === ' ' && allowSkip) { e.preventDefault(); commit('skip'); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, exiting, results.length]);

  if (!card) {
    // Should auto-advance via onNext above; render placeholder for safety.
    return <div className="text-center text-slate-400 text-sm py-6">Fertig.</div>;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (exiting) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current || exiting) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }
  function onPointerUp() {
    if (!drag || exiting) { startRef.current = null; setDrag(null); return; }
    if (drag.x > THRESHOLD) commit('pos');
    else if (drag.x < -THRESHOLD) commit('neg');
    else { setDrag(null); startRef.current = null; }
  }

  const dx = exiting ? exiting.dx : (drag?.x ?? 0);
  const rot = Math.max(-15, Math.min(15, dx / 12));
  const opacity = Math.max(0.4, 1 - Math.abs(dx) / 400);
  const showPos = dx > 30;
  const showNeg = dx < -30;

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
      {question && (
        <h2 className="fp-heading text-base font-bold mb-1 text-center">{question}</h2>
      )}
      <p className="text-[11px] text-slate-400 text-center mb-4">
        Karte {Math.min(idx + 1, cards.length)} / {cards.length}
      </p>

      {/* Progress */}
      <div className="h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full transition-all duration-300" style={{ width: `${(idx / cards.length) * 100}%`, background: primary }} />
      </div>

      {/* Card stack */}
      <div className="relative h-[280px] select-none mb-4" style={{ touchAction: 'pan-y' }}>
        {/* Background card peek */}
        {cards[idx + 1] && (
          <div
            className="absolute inset-0 bg-slate-50 border border-slate-200"
            style={{ borderRadius: br, transform: 'scale(0.94) translateY(8px)', opacity: 0.6 }}
          />
        )}
        {/* Active card */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 bg-white border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-center p-5 shadow-md"
          style={{
            borderRadius: br,
            borderColor: primary + '40',
            transform: `translateX(${dx}px) rotate(${rot}deg)`,
            transition: exiting ? 'transform 220ms ease-out, opacity 220ms ease-out' : drag ? 'none' : 'transform 250ms cubic-bezier(.2,.7,.3,1)',
            opacity,
          }}
        >
          {showPos && (
            <span className="absolute top-3 left-3 px-2 py-1 text-[11px] font-bold rounded border-2"
              style={{ color: '#16a34a', borderColor: '#16a34a' }}>JA</span>
          )}
          {showNeg && (
            <span className="absolute top-3 right-3 px-2 py-1 text-[11px] font-bold rounded border-2"
              style={{ color: '#dc2626', borderColor: '#dc2626' }}>NEIN</span>
          )}
          {card.imageUrl && (
            <img src={card.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
          )}
          <p className="text-base text-slate-800 font-medium leading-snug">{card.text}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => commit('neg')}
          aria-label={card.optionNegative?.label || 'Eher nicht'}
          className="w-12 h-12 rounded-full border-2 border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
        >
          <ThumbsDown size={18} />
        </button>
        <button
          onClick={() => commit('neu')}
          aria-label={card.optionNeutral?.label || 'Geht so'}
          className="w-11 h-11 rounded-full border-2 border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <Meh size={16} />
        </button>
        <button
          onClick={() => commit('pos')}
          aria-label={card.optionPositive?.label || 'Klingt gut'}
          className="w-12 h-12 rounded-full border-2 border-emerald-200 text-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors"
        >
          <ThumbsUp size={18} />
        </button>
      </div>

      {allowSkip && (
        <button
          onClick={() => commit('skip')}
          className="mt-3 w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors py-1.5 inline-flex items-center justify-center gap-1"
        >
          <SkipForward size={11} /> Weiß nicht / überspringen
        </button>
      )}

      <p className="mt-2 text-[10px] text-slate-300 text-center">Pfeiltasten ← → · Eingabe = neutral{allowSkip ? ' · Leertaste = überspringen' : ''}</p>
    </div>
  );
}
