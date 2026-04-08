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

const THRESHOLD = 90;

export default function SwipeDeckBlock({ nodeId, props, answers, onAnswer, onNext, primary, br }: Props) {
  const cards = (props.cards as SwipeCard[]) || [];
  const allowSkip = props.allowSkip !== false;
  const question = (props.question as string) || '';

  const previous = answers[nodeId] as SwipeResult[] | undefined;
  const [results, setResults] = useState<SwipeResult[]>(previous && previous !== (SKIP_ANSWER as unknown) ? previous : []);
  const [exiting, setExiting] = useState<SwipeChoice | null>(null);
  // Drag direction state — only updated when crossing a small threshold so that
  // it doesn't rerender on every pointer move (the actual transform happens
  // imperatively via cardRef.style).
  const [dragDir, setDragDir] = useState<0 | 1 | -1>(0);

  // Imperative refs — kept out of React state for 60fps drag.
  const cardRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const idx = results.length;
  const card = cards[idx];

  function applyTransform(dx: number) {
    const el = cardRef.current;
    if (!el) return;
    const rot = Math.max(-15, Math.min(15, dx / 12));
    const opacity = Math.max(0.5, 1 - Math.abs(dx) / 500);
    el.style.transform = `translate3d(${dx}px, 0, 0) rotate(${rot}deg)`;
    el.style.opacity = String(opacity);
  }

  function resetTransform(animated = true) {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 250ms cubic-bezier(.2,.7,.3,1), opacity 250ms ease-out' : 'none';
    el.style.transform = 'translate3d(0,0,0) rotate(0deg)';
    el.style.opacity = '1';
    if (animated) {
      window.setTimeout(() => { if (cardRef.current) cardRef.current.style.transition = 'none'; }, 260);
    }
  }

  function commit(choice: SwipeChoice) {
    if (!card || exiting) return;
    setExiting(choice);
    const targetDx = choice === 'pos' ? 600 : choice === 'neg' ? -600 : 0;
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform 240ms ease-out, opacity 240ms ease-out';
      el.style.transform = `translate3d(${targetDx}px, 0, 0) rotate(${Math.sign(targetDx) * 18}deg)`;
      el.style.opacity = '0';
    }
    window.setTimeout(() => {
      const next = [...results, { cardId: card.id, choice }];
      setResults(next);
      setExiting(null);
      setDragDir(0);
      dxRef.current = 0;
      startRef.current = null;
      // Reset transform without animation for the new card.
      requestAnimationFrame(() => resetTransform(false));
      if (next.length >= cards.length) {
        onAnswer(nodeId, next);
        window.setTimeout(onNext, 200);
      }
    }, 240);
  }

  // Keyboard support
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

  // Cleanup pending rAF on unmount
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  if (!card) {
    return <div className="text-center text-slate-400 text-sm py-6">Fertig.</div>;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (exiting) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    dxRef.current = 0;
    cardRef.current?.setPointerCapture(e.pointerId);
    if (cardRef.current) cardRef.current.style.transition = 'none';
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current || exiting) return;
    const dx = e.clientX - startRef.current.x;
    dxRef.current = dx;
    // Threshold-based dir state — keeps the JA/NEIN stamp logic without rerendering on every pixel.
    const dir = dx > 30 ? 1 : dx < -30 ? -1 : 0;
    setDragDir((cur) => (cur === dir ? cur : dir));
    // Schedule a single rAF transform update per frame.
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        applyTransform(dxRef.current);
      });
    }
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!startRef.current || exiting) return;
    const dx = dxRef.current;
    cardRef.current?.releasePointerCapture(e.pointerId);
    startRef.current = null;
    if (dx > THRESHOLD) commit('pos');
    else if (dx < -THRESHOLD) commit('neg');
    else {
      // Snap back
      dxRef.current = 0;
      setDragDir(0);
      resetTransform(true);
    }
  }

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
      {question && (
        <h2 className="fp-heading text-base font-bold mb-1 text-center">{question}</h2>
      )}
      <p className="text-[11px] text-slate-400 text-center mb-3">
        Karte {Math.min(idx + 1, cards.length)} / {cards.length}
      </p>

      {/* Progress */}
      <div className="h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full transition-all duration-300" style={{ width: `${(idx / cards.length) * 100}%`, background: primary }} />
      </div>

      {/* Card stack — height bounded but allows the page to still scroll OUTSIDE the card */}
      <div className="relative h-[320px] select-none mb-4">
        {/* Background card peek */}
        {cards[idx + 1] && (
          <div
            className="absolute inset-0 bg-slate-50 border border-slate-200 pointer-events-none"
            style={{ borderRadius: br, transform: 'scale(0.94) translateY(8px)', opacity: 0.6 }}
          />
        )}
        {/* Active card — touchAction:none locks vertical scroll *only* on the card */}
        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 bg-white border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center text-center p-5 shadow-md select-none"
          style={{
            borderRadius: br,
            borderColor: primary + '40',
            transform: 'translate3d(0,0,0) rotate(0deg)',
            opacity: 1,
            touchAction: 'none',
            willChange: 'transform',
          }}
        >
          {dragDir === 1 && (
            <span className="absolute top-3 left-3 px-2 py-1 text-[11px] font-bold rounded border-2 pointer-events-none"
              style={{ color: '#16a34a', borderColor: '#16a34a' }}>JA</span>
          )}
          {dragDir === -1 && (
            <span className="absolute top-3 right-3 px-2 py-1 text-[11px] font-bold rounded border-2 pointer-events-none"
              style={{ color: '#dc2626', borderColor: '#dc2626' }}>NEIN</span>
          )}
          {card.imageUrl && (
            <img src={card.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-3 pointer-events-none" draggable={false} />
          )}
          <p className="text-base text-slate-800 font-medium leading-snug pointer-events-none">{card.text}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => commit('neg')}
          aria-label={card.optionNegative?.label || 'Eher nicht'}
          className="w-12 h-12 rounded-full border-2 border-rose-200 text-rose-500 hover:bg-rose-50 active:scale-95 flex items-center justify-center transition-all"
        >
          <ThumbsDown size={18} />
        </button>
        <button
          onClick={() => commit('neu')}
          aria-label={card.optionNeutral?.label || 'Geht so'}
          className="w-11 h-11 rounded-full border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 flex items-center justify-center transition-all"
        >
          <Meh size={16} />
        </button>
        <button
          onClick={() => commit('pos')}
          aria-label={card.optionPositive?.label || 'Klingt gut'}
          className="w-12 h-12 rounded-full border-2 border-emerald-200 text-emerald-500 hover:bg-emerald-50 active:scale-95 flex items-center justify-center transition-all"
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
    </div>
  );
}
