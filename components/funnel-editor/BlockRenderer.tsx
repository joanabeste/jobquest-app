'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, FileDown, Check, X, ChevronRight } from 'lucide-react';
import { BlockNode } from '@/lib/funnel-types';
import { applyVars, stripNamePlaceholder } from '@/lib/funnel-variables';
import { Company, Dimension } from '@/lib/types';
import { DECISION_ICONS, isIconName, isUnknownIconName } from '@/lib/decision-icons';
import { diversifyDecisionIcons } from '@/lib/decision-icon-picker';
import { SKIP_ANSWER } from '@/lib/funnel-utils';
import { s, n, b, sh, inlineHtml } from './blocks/helpers';
import DialogBlock, { type DialogLine } from './blocks/DialogBlock';
import HotspotBlock from './blocks/HotspotBlock';
import ZuordnungBlock, { type ZuordnungPair } from './blocks/ZuordnungBlock';
import LeadFormBlock, { LeadForm } from './blocks/LeadFormBlock';
import SwipeDeckBlock from './blocks/SwipeDeckBlock';
import ThisOrThatBlock, { type ThisOrThatOption } from './blocks/ThisOrThatBlock';
import ErgebnisBlock, { type ErgebnisGroup } from './blocks/ErgebnisBlock';

export type { DialogLine } from './blocks/DialogBlock';
export type { LeadForm } from './blocks/LeadFormBlock';
export { emptyLead } from './blocks/LeadFormBlock';

// ─── Cropped image ────────────────────────────────────────────────────────────
type CropBox = { left: number; top: number; right: number; bottom: number };

function CroppedImage({ src, alt, cropBox, height }: { src: string; alt: string; cropBox: CropBox; height?: number }) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const cW = cropBox.right - cropBox.left;
  const cH = cropBox.bottom - cropBox.top;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', width: '100%',
      ...(height ? { height } : aspectRatio ? { aspectRatio: String(aspectRatio) } : { minHeight: 120 }),
    }}>
      <img
        src={src} alt={alt}
        onLoad={(e) => {
          const img = e.currentTarget;
          setAspectRatio((img.naturalWidth / img.naturalHeight) * (cW / cH));
        }}
        style={{
          position: 'absolute',
          width: `${10000 / cW}%`, height: `${10000 / cH}%`,
          left: `${-100 * cropBox.left / cW}%`, top: `${-100 * cropBox.top / cH}%`,
          display: 'block', objectFit: 'cover',
        }}
      />
    </div>
  );
}

// ─── Spinner block (auto-advances after configurable duration) ────────────────
function SpinnerBlock({ text, doneText, primary, onNext, duration }: {
  text: string; doneText: string; primary: string; onNext: () => void; duration: number;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setDone(true), duration - 600);
    const t2 = setTimeout(() => onNext(), duration);
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
            onClick={() => onAnswer(nodeId, val)}
            onMouseEnter={() => setHovered(val)}
            onMouseLeave={() => setHovered(null)}
            className="text-3xl transition-transform hover:scale-125"
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

// ─── Reaction-Bubble: shows typing indicator first, then the reaction text as
// a chat bubble from the last known dialog speaker (or a neutral "Tipp"
// figure). Used after a quest_decision has been answered.
function ReactionBubble({ text, isWrong, speaker, primary }: {
  text: string;
  isWrong: boolean;
  speaker: string;
  primary: string;
}) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 700);
    return () => clearTimeout(t);
  }, []);

  const accent  = isWrong ? '#dc2626' : primary;
  const initial = speaker.charAt(0).toUpperCase() || '?';

  return (
    <div className="mt-4 flex gap-3" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm"
        style={{ background: accent }}
      >
        <span>{initial}</span>
      </div>
      {!revealed ? (
        <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
            />
          ))}
        </div>
      ) : (
        <div className="max-w-[78%] flex flex-col" style={{ animation: 'fadeSlideIn 0.25s ease-out' }}>
          <p className="text-[11px] text-slate-400 mb-1">{speaker}</p>
          <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${isWrong ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style wrapper – applies FunnelStyle from block to a wrapper div ──────────
export function StyledBlock({ node, sharedProps }: {
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
function SliderBlock({ nodeId, p, answers, onAnswer, onNext, primary, showNextButton = true }: {
  nodeId: string;
  p: Record<string, unknown>;
  answers: Record<string, unknown>;
  onAnswer: (id: string, val: unknown) => void;
  onNext?: () => void;
  primary: string;
  showNextButton?: boolean;
}) {
  const min = n(p.sliderMin, 0);
  const max = n(p.sliderMax, 10);
  const step = n(p.sliderStep, 1);
  const hasAnswer = answers[nodeId] !== undefined;
  const val = hasAnswer
    ? n(answers[nodeId], Math.floor((min + max) / 2))
    : Math.floor((min + max) / 2);
  // Progress 0..1 along the track, used for both the filled gradient and the
  // value-bubble horizontal position.
  const progress = max === min ? 0 : (val - min) / (max - min);
  const emojiMin = s(p.sliderEmojiMin, '');
  const emojiMax = s(p.sliderEmojiMax, '');
  const labelMin = s(p.sliderLabelMin, String(min));
  const labelMax = s(p.sliderLabelMax, String(max));
  // Heuristic: bipolar scale if both labels are filled AND neither side uses
  // the classic unipolar "Gar nicht / Sehr gerne/viel" pairing. On bipolar
  // scales the numeric bubble is meaningless ("5" on Lieber allein ↔ Team is
  // just noise), so we hide it.
  const UNIPOLAR_WORDS = /\b(gar nicht|sehr gerne|sehr gern|sehr viel|wenig|stark|schwach)\b/i;
  const isBipolar = !!labelMin && !!labelMax
    && labelMin !== String(min) && labelMax !== String(max)
    && !(UNIPOLAR_WORDS.test(labelMin) || UNIPOLAR_WORDS.test(labelMax));
  // Tendency highlight: past the mid-point (±5% tolerance) the leaning pole
  // gets bold; dead-center stays neutral.
  const leaning: 'left' | 'right' | 'center' = progress < 0.45 ? 'left' : progress > 0.55 ? 'right' : 'center';
  return (
    <div className="pt-2 pb-1 select-none">
      {/* Pole columns: emoji stacked above label for clearer anchoring */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end mb-3">
        <div className={`flex flex-col items-start gap-1 text-left transition-colors ${leaning === 'left' ? 'text-slate-900' : 'text-slate-400'}`}>
          {emojiMin && <span className="text-2xl leading-none" aria-hidden>{emojiMin}</span>}
          <span className={`text-[11px] md:text-xs leading-snug ${leaning === 'left' ? 'font-semibold' : 'font-medium'}`}>{labelMin}</span>
        </div>
        <div className="text-[10px] font-bold tracking-widest uppercase text-slate-300 self-end pb-1">oder</div>
        <div className={`flex flex-col items-end gap-1 text-right transition-colors ${leaning === 'right' ? 'text-slate-900' : 'text-slate-400'}`}>
          {emojiMax && <span className="text-2xl leading-none" aria-hidden>{emojiMax}</span>}
          <span className={`text-[11px] md:text-xs leading-snug ${leaning === 'right' ? 'font-semibold' : 'font-medium'}`}>{labelMax}</span>
        </div>
      </div>

      {/* Track + thumb + (optional) value bubble */}
      <div className="relative h-12 flex items-center">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-2.5 rounded-full bg-slate-100" />
        {/* Mid-point tick, pure orientation cue */}
        <div className="absolute w-0.5 h-4 bg-slate-300 rounded-sm pointer-events-none" style={{ left: 'calc(50% - 1px)' }} />
        {/* Filled track (driven by value) */}
        <div
          className="absolute left-0 h-2.5 rounded-full transition-[width]"
          style={{
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${primary}80, ${primary})`,
          }}
        />
        {/* Value bubble — only on unipolar (intensity) scales. On bipolar scales
            a number on a Likert-style preference slider is noise, so we hide it. */}
        {!isBipolar && (
          <div
            className="absolute -top-1 text-[11px] font-bold text-white px-2 py-0.5 rounded-full shadow-sm pointer-events-none"
            style={{
              left: `calc(${progress * 100}% - 16px)`,
              background: primary,
            }}
          >
            {val}
          </div>
        )}
        {/* The actual input — full-width, invisible thumb replaced via CSS below */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => onAnswer(nodeId, Number(e.target.value))}
          className="bc-slider absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
          style={{ touchAction: 'none' }}
        />
      </div>

      <style>{`
        .bc-slider::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid ${primary};
          box-shadow: 0 4px 12px -2px rgba(0,0,0,.18);
          cursor: grab;
          transition: transform .12s ease-out;
        }
        .bc-slider::-webkit-slider-thumb:active { transform: scale(1.12); cursor: grabbing; }
        .bc-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #fff;
          border: 3px solid ${primary};
          box-shadow: 0 4px 12px -2px rgba(0,0,0,.18);
          cursor: grab;
        }
        .bc-slider::-moz-range-thumb:active { transform: scale(1.12); cursor: grabbing; }
        .bc-slider:focus { outline: none; }
        .bc-slider::-webkit-slider-runnable-track { background: transparent; }
        .bc-slider::-moz-range-track { background: transparent; }
      `}</style>

      {showNextButton && onNext && (
        <button
          onClick={() => { if (!hasAnswer) onAnswer(nodeId, val); onNext(); }}
          className="fp-btn w-full mt-6 py-3 font-semibold text-sm"
        >
          Weiter
        </button>
      )}
    </div>
  );
}

// ─── Block renderer ───────────────────────────────────────────────────────────
export function BlockRenderer({
  node, company, primary, br,
  answers, firstName, onSetFirstName, onAnswer, onNext,
  onCapture, capturedVars,
  leadForm, setLeadForm, leadSubmitted, onLeadSubmit, onFormSubmit,
  scores, maxScores, dimensions,
  buttonBg, buttonText,
  markedSuggestions, onToggleMarkedSuggestion,
  dialogVisible, onDialogAdvance,
  dialogInputInFooter,
  lastDialogSpeaker,
}: {
  node: BlockNode; company: Company; primary: string; br: string;
  answers: Record<string, unknown>; firstName: string;
  onSetFirstName: (v: string) => void;
  onAnswer: (id: string, val: unknown) => void;
  onNext: (targetPageId?: string) => void;
  onCapture?: (varName: string, value: string) => void;
  capturedVars?: Record<string, string>;
  leadForm: LeadForm; setLeadForm: (f: LeadForm) => void; leadSubmitted: boolean;
  onLeadSubmit: (f: LeadForm, customFields?: Record<string, string>) => void;
  onFormSubmit: (headline: string, text: string, form: LeadForm) => void;
  scores: Record<string, number>;
  maxScores?: Record<string, number>;
  dimensions: Dimension[];
  buttonBg?: string;
  buttonText?: string;
  markedSuggestions?: Array<{ id: string; title: string }>;
  onToggleMarkedSuggestion?: (id: string, title: string) => void;
  dialogVisible: number;
  onDialogAdvance: (count: number) => void;
  dialogInputInFooter?: boolean;
  lastDialogSpeaker?: string;
}) {
  const p = node.props;
  const varsMap = {
    companyName:    company.name,
    datenschutzUrl: company.privacyUrl ?? '',
    impressumUrl:   company.imprintUrl ?? '',
    ...(firstName ? { firstName, vorname: firstName } : {}),
    ...(capturedVars ?? {}),
  };
  const si = (v: unknown, fallback = '') => applyVars(s(v, fallback), varsMap);

  switch (node.type) {

    // ── Generic ──────────────────────────────────────────────────────────────
    case 'heading': {
      const lvl  = n(p.level, 2);
      const text = inlineHtml(si(p.text));
      return (
        <div className="px-5 py-4">
          {lvl === 1 ? <h1 className="fp-heading text-3xl font-bold leading-tight" dangerouslySetInnerHTML={{ __html: sh(text) }} />
            : lvl === 2 ? <h2 className="fp-heading text-2xl font-bold" dangerouslySetInnerHTML={{ __html: sh(text) }} />
            : <h3 className="fp-heading text-xl font-semibold" dangerouslySetInnerHTML={{ __html: sh(text) }} />}
        </div>
      );
    }

    case 'paragraph':
      return (
        <div
          className="px-5 py-3 text-slate-600 leading-relaxed rte"
          dangerouslySetInnerHTML={{ __html: sh(s(p.text)) }}
        />
      );

    case 'button': {
      const url    = s(p.url);
      const text   = s(p.text);
      const isSec  = s(p.variant, 'primary') === 'secondary';
      const cls    = isSec ? 'fp-btn-sec' : 'fp-btn';
      // Use only the CD class — it already carries background, color, font and border.
      const btnStyle = { borderRadius: br };
      return (
        <div className="px-5 py-3">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all ${cls}`}
              style={btnStyle}>
              {text} <ArrowRight size={15} />
            </a>
          ) : (
            <button onClick={() => onNext()}
              className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold ${cls}`}
              style={btnStyle}>
              {text}
            </button>
          )}
        </div>
      );
    }

    case 'image': {
      const src      = s(p.src);
      if (!src) return null;
      const imgSize  = s(p.size, 'full');
      const fit      = s(p.objectFit, 'cover');
      const imgHeight = p.height as number | undefined;
      const cropBox  = p.cropBox as { left: number; top: number; right: number; bottom: number } | undefined;
      const sizeClass: Record<string, string> = { full: 'w-full', l: 'max-w-lg mx-auto', m: 'max-w-sm mx-auto', s: 'max-w-xs mx-auto', xs: 'max-w-[128px] mx-auto' };
      const wrapCls  = sizeClass[imgSize] ?? 'w-full';
      const hasCrop  = cropBox && (cropBox.left !== 0 || cropBox.top !== 0 || cropBox.right !== 100 || cropBox.bottom !== 100);
      return (
        <div>
          <div className={wrapCls}>
            {hasCrop ? (
              <CroppedImage src={src} alt={s(p.alt)} cropBox={cropBox!} height={imgHeight} />
            ) : (
              <img src={src} alt={s(p.alt)} className={fit === 'none' ? '' : `w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} style={imgHeight ? { height: imgHeight } : {}} />
            )}
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
      const videoBr    = node.style?.borderRadius ? `${node.style.borderRadius}px` : br;
      return url ? (
        <div className="px-5 py-3">
          <div className="aspect-video overflow-hidden bg-black shadow-md" style={{ borderRadius: videoBr }}>
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
          </div>
          {b(p.caption) && <p className="text-xs text-slate-400 text-center mt-1">{s(p.caption)}</p>}
        </div>
      ) : null;
    }

    // ── Quest blocks ──────────────────────────────────────────────────────────
    case 'quest_scene': {
      const imageUrl     = s(p.imageUrl);
      const subtext      = s(p.subtext);
      const accentText   = s(p.accentText);
      const bulletPoints = (p.bulletPoints as string[]) || [];
      const buttonText   = s(p.buttonText);
      return (
        <div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="w-full max-h-72 object-cover" />
          )}
          <div className="px-6 pt-8 pb-6 bg-white text-center">
            <h1 className="fp-heading leading-tight mb-4" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(si(p.title))) }} />
            {!!subtext && <div className="text-sm text-slate-600 mb-3 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(si(subtext)) }} />}
            {!!accentText && (
              <p className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: primary }}>{accentText}</p>
            )}
            {!!s(p.description) && (
              <div className="text-sm text-slate-600 leading-relaxed mb-4 rte" dangerouslySetInnerHTML={{ __html: sh(si(p.description)) }} />
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
            {!!buttonText && (
              <button
                onClick={() => onNext()}
                className="fp-btn w-full mt-2 py-3.5 font-semibold text-sm flex items-center justify-center gap-2"
                style={{ borderRadius: br }}
              >
                {buttonText} <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      );
    }

    case 'quest_dialog': {
      const rawLines  = (p.lines as DialogLine[]) || [];
      const lines     = rawLines.map((l) => ({ ...l, text: si(l.text), speaker: si(l.speaker) }));
      const rawChoices = ((p.choices as { id: string; text: string; reaction?: string }[]) ?? []);
      const choices   = rawChoices.map((c) => ({ ...c, text: si(c.text), reaction: c.reaction ? si(c.reaction) : undefined }));
      const rawInput  = p.input as { placeholder?: string; captures?: string; followUpText?: string } | undefined;
      return (
        <DialogBlock
          lines={lines}
          primary={primary}
          visibleCount={dialogVisible}
          onAdvance={onDialogAdvance}
          firstName={firstName}
          choices={choices}
          input={rawInput}
          nodeId={node.id}
          onAnswer={onAnswer}
          onSetFirstName={onSetFirstName}
          onCapture={onCapture}
          capturedVars={capturedVars}
          answers={answers}
          br={br}
          inputInFooter={dialogInputInFooter}
        />
      );
    }

    case 'quest_decision': {
      const rawOpts     = (p.options as { id: string; text: string; reaction?: string; targetPageId?: string; emoji?: string; isWrong?: boolean }[]) || [];
      // Render-seitiges Auto-Icon-Filling: stellt sicher, dass auch ältere Funnels
      // ohne von der KI gesetzte Icons den einheitlichen Karten-Stil bekommen.
      const opts        = diversifyDecisionIcons(rawOpts);
      const selected    = answers[node.id] as string | undefined;
      const selectedOpt = opts.find((o) => o.id === selected);
      const isWrong     = !!selectedOpt?.isWrong;

      return (
        <div className="mx-4 my-3">
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
            <p className="text-base font-semibold text-slate-800 text-center leading-snug" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(si(p.question))) }} />
          </div>

          <div className="space-y-2">
            {opts.map((o) => {
              const isSelected = selected === o.id;
              const IconComp   = isIconName(o.emoji) ? DECISION_ICONS[o.emoji] : null;
              const optAccent  = isSelected && o.isWrong ? '#dc2626' : primary;
              return (
                <button
                  key={o.id}
                  onClick={() => { if (!selected) onAnswer(node.id, o.id); }}
                  disabled={!!selected}
                  className="fp-card bg-white shadow-sm w-full px-4 py-3.5 flex items-center gap-3 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                  style={isSelected ? { borderColor: optAccent, background: `${optAccent}08` } : {}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${isSelected ? optAccent : primary}15` }}>
                    {IconComp
                      ? <IconComp size={20} style={{ color: isSelected ? optAccent : primary }} />
                      : (o.emoji && !isUnknownIconName(o.emoji))
                        ? <span className="text-xl leading-none">{o.emoji}</span>
                        : null
                    }
                  </div>
                  <span className="text-sm font-medium text-slate-700 leading-snug flex-1">{o.text}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: optAccent }}>
                      {o.isWrong ? <X size={11} className="text-white" /> : <Check size={11} className="text-white" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOpt?.reaction && (
            <ReactionBubble
              text={si(selectedOpt.reaction)}
              isWrong={isWrong}
              speaker={lastDialogSpeaker || 'Tipp'}
              primary={primary}
            />
          )}
        </div>
      );
    }

    case 'quest_quiz': {
      const opts = (p.options as { id: string; text: string; correct: boolean; feedback?: string }[]) || [];
      const correctCount = opts.filter((o) => o.correct).length;
      const isMulti = correctCount > 1;
      const revealed = answers[`${node.id}_checked`] === true;

      // ── Multi-Select ─────────────────────────────────────────────
      if (isMulti) {
        const selectedIds: string[] = Array.isArray(answers[node.id]) ? answers[node.id] as string[] : [];
        const correctIds = new Set(opts.filter((o) => o.correct).map((o) => o.id));
        const selectedSet = new Set(selectedIds);
        const correctSelected = selectedIds.filter((id) => correctIds.has(id)).length;
        const allCorrect = revealed && correctSelected === correctCount && selectedIds.length === correctCount;

        return (
          <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
            <p className="fp-heading font-semibold text-base mb-1" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
            <p className="text-xs text-slate-400 mb-3">Mehrere Antworten möglich ({correctCount} richtig)</p>
            <div className="space-y-2">
              {opts.map((o) => {
                const isSel = selectedSet.has(o.id);
                return (
                  <button key={o.id} disabled={revealed}
                    onClick={() => {
                      if (revealed) return;
                      const next = selectedSet.has(o.id)
                        ? selectedIds.filter((x) => x !== o.id)
                        : [...selectedIds, o.id];
                      onAnswer(node.id, next);
                    }}
                    className="w-full text-left fp-opt flex items-center gap-3 px-4 py-3 text-sm"
                    style={!revealed ? (isSel ? { borderColor: primary, background: `${primary}08` } : {})
                      : o.correct && isSel ? { borderColor: '#10b981', background: '#f0fdf4' }
                      : !o.correct && isSel ? { borderColor: '#f87171', background: '#fef2f2' }
                      : o.correct && !isSel ? { borderColor: '#f59e0b', background: '#fffbeb' }
                      : { opacity: 0.4 }}>
                    <div className="flex-shrink-0 w-4">
                      {!revealed
                        ? <div className={`w-3.5 h-3.5 rounded border-2 ${isSel ? 'border-transparent' : 'border-slate-300'}`}
                            style={isSel ? { background: primary } : {}}>
                            {isSel && <Check size={10} className="text-white" />}
                          </div>
                        : o.correct && isSel ? <Check size={14} className="text-emerald-600" />
                        : !o.correct && isSel ? <X size={14} className="text-red-500" />
                        : o.correct && !isSel ? <span className="text-amber-500 text-xs font-bold">!</span>
                        : null}
                    </div>
                    <div className="flex-1 text-left">
                      <span>{o.text}</span>
                      {revealed && o.feedback && (isSel || o.correct) && (
                        <p className={`text-xs mt-1 leading-relaxed ${o.correct ? 'text-emerald-600' : 'text-red-500'}`}>
                          {o.feedback}
                        </p>
                      )}
                    </div>
                    {revealed && o.correct && isSel && (
                      <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">Richtig</span>
                    )}
                    {revealed && o.correct && !isSel && (
                      <span className="text-xs font-semibold text-amber-600 flex-shrink-0">Nicht gewählt</span>
                    )}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className={`mt-4 px-4 py-3.5 flex items-start gap-3 ${allCorrect ? 'bg-emerald-50' : 'bg-amber-50'}`}
                style={{ borderRadius: br }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${allCorrect ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {allCorrect
                    ? <Check size={15} className="text-emerald-600" />
                    : <span className="text-amber-600 font-bold text-sm">{correctSelected}/{correctCount}</span>}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${allCorrect ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {allCorrect ? 'Alle richtig!' : `${correctSelected} von ${correctCount} richtig`}
                  </p>
                  <p className={`text-sm mt-0.5 leading-relaxed ${allCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {allCorrect ? 'Gut gemacht!' : 'Die richtigen Antworten sind oben markiert.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── Single-Select ────────────────────────────────────────────
      const selectedId  = answers[node.id] as string | undefined;
      const selectedOpt = opts.find((o) => o.id === selectedId);
      const isCorrect   = selectedOpt?.correct ?? false;
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-5">
          <p className="fp-heading font-semibold text-base mb-3" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
          <div className="space-y-2">
            {opts.map((o) => {
              const isSelected = selectedId === o.id;
              return (
                <button key={o.id} disabled={revealed}
                  onClick={() => !revealed && onAnswer(node.id, o.id)}
                  className="w-full text-left fp-opt flex items-center gap-3 px-4 py-3 text-sm"
                  style={!revealed ? (isSelected ? { borderColor: primary, background: `${primary}08` } : {})
                    : o.correct
                    ? { borderColor: '#10b981', background: '#f0fdf4' }
                    : isSelected ? { borderColor: '#f87171', background: '#fef2f2' } : { opacity: 0.4 }}>
                  <div className="flex-shrink-0 w-4">
                    {!revealed
                      ? <div className={`w-3.5 h-3.5 rounded-full border-2 ${isSelected ? 'border-transparent' : 'border-slate-300'}`}
                          style={isSelected ? { background: primary } : {}}>
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
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

          {revealed && selectedOpt && (
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
          <h3 className="font-semibold text-sky-900 mb-1.5" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.title))) }} />
          <div className="text-sm text-sky-700 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(s(p.text)) }} />
        </div>
      );

    case 'quest_freetext':
      return (
        <div className="px-5 py-4">
          <div className="text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(s(p.text)) }} />
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

    case 'quest_spinner':
      // si() ersetzt @vorname / @companyName u.a. — sonst würden die Vars als
      // Roh-Text wie "Richtig, @vorname!" auf dem Bildschirm landen.
      return <SpinnerBlock text={si(p.text)} doneText={si(p.doneText)} primary={primary} onNext={() => onNext()} duration={n(p.duration, 2400)} />;

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

    case 'quest_zuordnung': {
      const pairs = (p.pairs as ZuordnungPair[]) || [];
      return (
        <ZuordnungBlock
          question={si(p.question)}
          pairs={pairs}
          shuffleRight={b(p.shuffleRight ?? true)}
          showFeedback={b(p.showFeedback ?? true)}
          feedbackText={s(p.feedbackText, 'Gut gemacht!')}
          primary={primary}
          br={br}
          nodeId={node.id}
          answers={answers}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    }

    case 'quest_hotspot': {
      const imageUrl  = s(p.imageUrl);
      const hotspots  = (p.hotspots as { id: string; x: number; y: number; label: string; description: string; icon?: string }[]) || [];
      const requireAll = b(p.requireAll ?? true);
      const doneText  = s(p.doneText, 'Weiter erkunden');
      return (
        <HotspotBlock
          imageUrl={imageUrl}
          hotspots={hotspots}
          requireAll={requireAll}
          doneText={doneText}
          primary={primary}
          br={br}
          nodeId={node.id}
          answers={answers}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    }

    case 'quest_lead':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.thankYouHeadline, 'Vielen Dank!')} text={s(p.thankYouText)} primary={primary} buttonText={s(p.thankYouButtonText)} buttonUrl={s(p.thankYouButtonUrl)} />
        : <LeadFormBlock props={p} company={company} br={br} primary={primary} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form, cf) => onLeadSubmit(form, cf)} firstName={firstName} capturedVars={capturedVars} />;

    // ── BerufsCheck blocks ────────────────────────────────────────────────────
    case 'check_intro': {
      const imageUrl = s(p.imageUrl);
      // Support <accent>Traum-Ausbildung</accent> in the headline — renders as
      // the CD accent/primary colour so intros feel branded without requiring
      // inline styles from the author.
      const rawHeadline = s(p.headline);
      const accentedHeadline = rawHeadline.replace(
        /<accent>([\s\S]*?)<\/accent>/g,
        '<span class="fp-accent">$1</span>',
      );
      return (
        <div className="px-6 pt-8 md:pt-14 pb-10 text-center min-h-[400px] flex flex-col justify-center max-w-md mx-auto">
          {!!imageUrl && (
            <img src={imageUrl} alt="" className="w-full max-h-56 object-cover rounded-xl mb-8" />
          )}
          <h1
            className="fp-heading text-3xl md:text-4xl font-bold mb-5 leading-tight tracking-tight"
            dangerouslySetInnerHTML={{ __html: sh(inlineHtml(accentedHeadline)) }}
          />
          <p className="text-sm md:text-base text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto">
            {s(p.subtext)}
          </p>
          <div>
            <button
              onClick={() => onNext()}
              className="fp-btn w-full flex items-center justify-between px-6 py-4 font-semibold text-base"
              style={{ borderRadius: br }}
            >
              <span>{s(p.buttonText, 'Berufscheck starten')}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      );
    }

    case 'check_vorname':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-4" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
          <input type="text" value={firstName} onChange={(e) => onSetFirstName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && firstName.trim()) onNext(); }}
            placeholder={s(p.placeholder, 'Dein Vorname')}
            className="w-full px-4 py-3 border-2 border-slate-200 text-sm focus:outline-none"
            style={{ borderRadius: br, fontSize: '16px' }} />
          <button onClick={() => onNext()} disabled={!firstName.trim()}
            className="fp-btn w-full mt-4 py-3 font-semibold text-sm disabled:opacity-50"
            style={{ borderRadius: br }}>
            {s(p.buttonText, 'Weiter')}
          </button>
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
            <h2 className="fp-heading text-xl font-bold mb-6" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
            <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} onNext={onNext} primary={primary} />
          </div>
        );
      }

      const allowSkip = !!p.allowSkip && node.type === 'check_frage';
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-4" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
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
          {allowSkip && !selected && (
            <button
              onClick={() => { onAnswer(node.id, SKIP_ANSWER); setTimeout(onNext, 200); }}
              className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              Weiß nicht / überspringen
            </button>
          )}
        </div>
      );
    }

    case 'check_swipe_deck':
      return (
        <SwipeDeckBlock
          nodeId={node.id}
          props={p}
          answers={answers}
          onAnswer={onAnswer}
          onNext={onNext}
          primary={primary}
          br={br}
        />
      );

    case 'check_this_or_that': {
      const optA = (p.optionA as ThisOrThatOption | undefined) ?? { id: 'A', label: 'Option A' };
      const optB = (p.optionB as ThisOrThatOption | undefined) ?? { id: 'B', label: 'Option B' };
      return (
        <ThisOrThatBlock
          nodeId={node.id}
          question={s(p.question)}
          description={s(p.description) || undefined}
          allowSkip={p.allowSkip === true}
          optionA={optA}
          optionB={optB}
          answer={answers[node.id]}
          onAnswer={onAnswer}
          onNext={onNext}
          primary={primary}
          br={br}
        />
      );
    }

    case 'check_selbst':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
          {b(p.description) && <p className="text-sm text-slate-500 mb-5">{s(p.description)}</p>}
          <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} onNext={onNext} primary={primary} />
        </div>
      );

    case 'check_statements': {
      const stmts = (p.statements as Array<{ id: string; text: string }>) ?? [];
      const checked = Array.isArray(answers[node.id]) ? (answers[node.id] as string[]) : [];
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-lg font-bold mb-1 text-center" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
          <p className="text-xs text-slate-400 text-center mb-4">Wahle alles, was auf dich zutrifft</p>
          <div className="space-y-2">
            {stmts.map((stmt) => {
              const isChecked = checked.includes(stmt.id);
              return (
                <button
                  key={stmt.id}
                  onClick={() => {
                    const next = isChecked ? checked.filter((id) => id !== stmt.id) : [...checked, stmt.id];
                    onAnswer(node.id, next);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition-all active:scale-[0.98]"
                  style={{
                    borderColor: isChecked ? primary : '#e2e8f0',
                    background: isChecked ? `${primary}08` : 'white',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: isChecked ? primary : '#cbd5e1',
                      background: isChecked ? primary : 'transparent',
                    }}
                  >
                    {isChecked && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`font-medium ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>{stmt.text}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onNext()}
            disabled={checked.length === 0}
            className="fp-btn w-full mt-4 py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: br }}
          >
            Weiter
          </button>
        </div>
      );
    }

    case 'check_lead':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.thankYouHeadline, 'Vielen Dank!')} text={s(p.thankYouText)} primary={primary} buttonText={s(p.thankYouButtonText)} buttonUrl={s(p.thankYouButtonUrl)} />
        : <LeadFormBlock props={p} company={company} br={br} primary={primary} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form, cf) => onLeadSubmit(form, cf)} markedSuggestions={markedSuggestions} firstName={firstName} capturedVars={capturedVars} />;

    case 'check_ergebnis': {
      const rawHeadline = s(p.headline, 'Dein Ergebnis!');
      const headline = firstName
        ? applyVars(rawHeadline, { ...varsMap, firstName })
        : applyVars(stripNamePlaceholder(rawHeadline), varsMap);
      return (
        <ErgebnisBlock
          headline={headline}
          subtext={s(p.subtext)}
          layout={(p.layout as 'simple' | 'groups') || 'simple'}
          showDimensionBars={p.showDimensionBars !== false}
          groups={(p.groups as ErgebnisGroup[] | undefined) ?? []}
          dimensions={dimensions}
          scores={scores}
          maxScores={maxScores}
          answers={answers}
          primary={primary}
          buttonBg={buttonBg}
          buttonText={buttonText}
          markedSuggestions={markedSuggestions}
          onToggleMarkedSuggestion={onToggleMarkedSuggestion}
          br={br}
          onNext={onNext}
          continueLabel={s(p.continueLabel, 'Weiter')}
        />
      );
    }

    // ── Formular blocks ───────────────────────────────────────────────────────
    case 'form_hero': {
      const imageUrl = s(p.imageUrl);
      return (
        <div className="relative min-h-[320px] flex items-center justify-center text-center overflow-hidden" style={{ background: primary }}>
          {!!imageUrl && (
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          )}
          <div className="relative z-10 px-8 py-12">
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.headline))) }} />
            {b(p.subtext) && <div className="text-white/80 text-base mb-6 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(s(p.subtext)) }} />}
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
          {b(p.headline) && <h2 className="fp-heading text-2xl font-bold mb-4" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.headline))) }} />}
          <div className="text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(s(p.content)) }} />
        </div>
      );

    case 'form_image': {
      const imageUrl = s(p.imageUrl);
      return imageUrl ? (
        <div>
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
          {b(p.title) && <h3 className="fp-heading font-bold text-lg mb-1" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.title))) }} />}
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
                    if (f.type === 'email') setLeadForm({ ...leadForm, email: e.target.value });
                    else if (f.label.toLowerCase().includes('vorname') || f.label.toLowerCase().includes('name')) {
                      setLeadForm({ ...leadForm, firstName: e.target.value });
                    } else if (f.type === 'tel') setLeadForm({ ...leadForm, phone: e.target.value });
                  }}
                  className="w-full px-3 py-2.5 border border-slate-200 text-sm focus:outline-none"
                  style={{ borderRadius: br, fontSize: '16px' }}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'form_config':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.thankYouHeadline, 'Vielen Dank!')} text={s(p.thankYouText)} primary={primary} buttonText={s(p.thankYouButtonText)} buttonUrl={s(p.thankYouButtonUrl)} />
        : <LeadFormBlock
            props={p}
            company={company}
            br={br}
            primary={primary}
            leadForm={leadForm}
            setLeadForm={setLeadForm}
            onSubmit={(form) => onFormSubmit(s(p.thankYouHeadline, 'Vielen Dank!'), s(p.thankYouText), form)}
            firstName={firstName}
            capturedVars={capturedVars}
          />;

    default:
      return null;
  }
}

// ─── Completion / Thank you screen ────────────────────────────────────────────
export function CompletionScreen({ company, headline, text, primary, buttonText, buttonUrl }: {
  company: Company; headline: string; text: string; primary: string;
  buttonText?: string; buttonUrl?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: `${primary}20` }}>
        <Check size={36} style={{ color: primary }} />
      </div>
      <h2 className="fp-heading text-2xl font-bold mb-3">{headline}</h2>
      {text && <p className="text-slate-500 text-base leading-relaxed max-w-xs">{text}</p>}
      {buttonText && buttonUrl && (
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: primary }}
        >
          {buttonText} →
        </a>
      )}
      <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs">
        {company.logo
          ? <img src={company.logo} alt="" className="h-5 w-auto max-w-[80px] rounded object-contain" />
          : <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ background: primary }}>{company.name.charAt(0)}</div>}
        <span>{company.name}</span>
      </div>
    </div>
  );
}
