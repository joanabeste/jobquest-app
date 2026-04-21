'use client';

import { forwardRef, useRef, useState } from 'react';
import { SKIP_ANSWER } from '@/lib/funnel-utils';

export interface ThisOrThatOption {
  id: string;
  imageUrl?: string;
  label: string;
  scores?: Record<string, number>;
}

interface Props {
  nodeId: string;
  question: string;
  description?: string;
  allowSkip: boolean;
  optionA: ThisOrThatOption;
  optionB: ThisOrThatOption;
  answer: unknown;
  onAnswer: (id: string, value: unknown) => void;
  onNext: () => void;
  primary: string;
  br: string;
}

type Side = 'A' | 'B';

export default function ThisOrThatBlock({
  nodeId, question, description, allowSkip, optionA, optionB, answer,
  onAnswer, onNext, primary, br,
}: Props) {
  const [picking, setPicking] = useState<Side | null>(null);
  const previous = answer === 'A' || answer === 'B' ? (answer as Side) : null;
  const refA = useRef<HTMLButtonElement>(null);
  const refB = useRef<HTMLButtonElement>(null);

  function choose(side: Side) {
    if (picking) return;
    setPicking(side);
    onAnswer(nodeId, side);
    window.setTimeout(() => onNext(), 280);
  }

  function onKeyOnCard(e: React.KeyboardEvent, side: Side) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      (side === 'A' ? refB : refA).current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      (side === 'A' ? refB : refA).current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(side);
    }
  }

  return (
    <div className="fp-card bg-white shadow-sm mx-4 my-3 p-3 sm:p-5 md:p-6">
      <h2 className="fp-heading text-base md:text-xl font-bold text-center mb-1 leading-snug">{question}</h2>
      {description && (
        <p className="text-xs md:text-sm text-slate-500 text-center mb-2 md:mb-4">{description}</p>
      )}

      {/* Mobile: stacked with a slim OR divider, cards kept short so the whole
          block fits a single 667 px viewport. Desktop: side-by-side tall cards. */}
      <div className="flex flex-col md:flex-row md:gap-4 gap-1.5 items-stretch">
        <OptionCard
          ref={refA}
          side="A"
          option={optionA}
          selected={previous === 'A' || picking === 'A'}
          faded={!!picking && picking !== 'A'}
          eager
          primary={primary}
          br={br}
          aspectMobile="aspect-[16/10]"
          aspectDesktop="md:aspect-[3/4]"
          onClick={() => choose('A')}
          onKeyDown={(e) => onKeyOnCard(e, 'A')}
        />

        <div className="flex md:flex-col items-center justify-center gap-1.5 md:py-0 py-0">
          <div className="flex-1 md:flex-initial md:w-px md:h-6 h-px bg-slate-200" />
          <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase" style={{ color: primary }}>
            oder
          </span>
          <div className="flex-1 md:flex-initial md:w-px md:h-6 h-px bg-slate-200" />
        </div>

        <OptionCard
          ref={refB}
          side="B"
          option={optionB}
          selected={previous === 'B' || picking === 'B'}
          faded={!!picking && picking !== 'B'}
          eager={false}
          primary={primary}
          br={br}
          aspectMobile="aspect-[16/10]"
          aspectDesktop="md:aspect-[3/4]"
          onClick={() => choose('B')}
          onKeyDown={(e) => onKeyOnCard(e, 'B')}
        />
      </div>

      {allowSkip && (
        <div className="text-center mt-3 md:mt-4">
          <button
            type="button"
            onClick={() => { onAnswer(nodeId, SKIP_ANSWER); onNext(); }}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Überspringen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Internal card component ─────────────────────────────────────────────────

interface CardProps {
  side: Side;
  option: ThisOrThatOption;
  selected: boolean;
  faded: boolean;
  eager: boolean;
  primary: string;
  br: string;
  aspectMobile: string;
  aspectDesktop: string;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const OptionCard = forwardRef<HTMLButtonElement, CardProps>(function OptionCard(
  { side, option, selected, faded, eager, primary, br, aspectMobile, aspectDesktop, onClick, onKeyDown },
  ref,
) {
  const initial = (option.label || side).charAt(0).toUpperCase();
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={option.label || `Option ${side}`}
      className={`relative flex-1 overflow-hidden text-left transition-all duration-200 focus:outline-none ${aspectMobile} ${aspectDesktop} ${
        selected ? 'scale-[0.98]' : 'hover:-translate-y-0.5 hover:shadow-lg'
      } ${faded ? 'opacity-60' : 'opacity-100'}`}
      style={{
        borderRadius: br,
        boxShadow: selected ? `0 0 0 3px ${primary}, 0 8px 24px -6px ${primary}40` : undefined,
        border: selected ? 'none' : '2px solid #e2e8f0',
      }}
    >
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          alt={option.label}
          loading={eager ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl md:text-6xl font-black"
          style={{ background: primary + '12', color: primary }}
        >
          {initial}
        </div>
      )}
      {/* Gradient overlay for label readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-4">
        <p className="text-white font-semibold text-xs md:text-base leading-tight drop-shadow line-clamp-2">
          {option.label}
        </p>
      </div>
    </button>
  );
});
