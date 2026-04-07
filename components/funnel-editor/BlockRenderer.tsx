'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Trophy, FileDown, Check, X, ChevronRight } from 'lucide-react';
import { BlockNode } from '@/lib/funnel-types';
import { applyVars } from '@/lib/funnel-variables';
import { Company, Dimension } from '@/lib/types';
import { DECISION_ICONS, isIconName } from '@/lib/decision-icons';
import { s, n, b, sh, inlineHtml } from './blocks/helpers';
import DialogBlock, { type DialogLine } from './blocks/DialogBlock';
import HotspotBlock from './blocks/HotspotBlock';
import ZuordnungBlock, { type ZuordnungPair } from './blocks/ZuordnungBlock';
import LeadFormBlock, { LeadForm } from './blocks/LeadFormBlock';

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
export function BlockRenderer({
  node, company, primary, br,
  answers, firstName, onSetFirstName, onAnswer, onNext,
  onCapture, capturedVars,
  leadForm, setLeadForm, leadSubmitted, onLeadSubmit, onFormSubmit,
  scores, dimensions,
  dialogVisible, onDialogAdvance,
  dialogInputInFooter,
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
  dimensions: Dimension[];
  dialogVisible: number;
  onDialogAdvance: (count: number) => void;
  dialogInputInFooter?: boolean;
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
      const btnStyle = isSec
        ? { borderRadius: br, border: `2px solid ${primary}`, color: primary }
        : { borderRadius: br, background: primary, color: '#fff' };
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
      const opts        = (p.options as { id: string; text: string; reaction?: string; targetPageId?: string; emoji?: string; isWrong?: boolean }[]) || [];
      const selected    = answers[node.id] as string | undefined;
      const selectedOpt = opts.find((o) => o.id === selected);
      const hasEmojis   = opts.some((o) => o.emoji);
      const isWrong     = !!selectedOpt?.isWrong;
      const accentColor = isWrong ? '#dc2626' : primary;

      return (
        <div className="mx-4 my-3">
          <p className="fp-heading font-semibold text-base mb-4 px-1 text-center" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(si(p.question))) }} />

          {hasEmojis ? (
            <div className={`grid gap-3 ${opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {opts.map((o) => {
                const isSelected = selected === o.id;
                const IconComp   = isIconName(o.emoji) ? DECISION_ICONS[o.emoji] : null;
                const optAccent  = isSelected && o.isWrong ? '#dc2626' : primary;
                return (
                  <button
                    key={o.id}
                    onClick={() => { if (!selected) onAnswer(node.id, o.id); }}
                    disabled={!!selected}
                    className="fp-card bg-white shadow-sm p-4 flex flex-col items-center gap-2.5 text-center transition-all duration-200 hover:shadow-md active:scale-95"
                    style={isSelected ? { borderColor: optAccent, background: `${optAccent}10`, transform: 'scale(0.97)' } : {}}>
                    {IconComp
                      ? <IconComp size={32} style={{ color: optAccent }} />
                      : <span className="text-4xl leading-none">{o.emoji}</span>
                    }
                    <span className="text-xs font-medium text-slate-700 leading-tight">{o.text}</span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: optAccent }}>
                        {o.isWrong ? <X size={11} className="text-white" /> : <Check size={11} className="text-white" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="fp-card bg-white shadow-sm p-2 space-y-1.5">
              {opts.map((o) => {
                const isSelected = selected === o.id;
                const optAccent  = isSelected && o.isWrong ? '#dc2626' : primary;
                return (
                  <button key={o.id} onClick={() => { if (!selected) onAnswer(node.id, o.id); }}
                    disabled={!!selected}
                    className="w-full text-left fp-opt flex items-center gap-2 px-4 py-3 text-sm"
                    style={isSelected ? { borderColor: optAccent, background: `${optAccent}18` } : {}}>
                    <ChevronRight size={14} className="flex-shrink-0 text-slate-400" />
                    {o.text}
                  </button>
                );
              })}
            </div>
          )}

          {selectedOpt?.reaction && (
            <div className={`mt-4 rounded-xl shadow-sm overflow-hidden ${isWrong ? 'bg-red-50' : 'bg-white'}`} style={{ borderLeft: `4px solid ${accentColor}` }}>
              <div className="px-4 py-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${accentColor}20` }}>
                  {isWrong ? <X size={14} style={{ color: accentColor }} /> : <Check size={14} style={{ color: accentColor }} />}
                </div>
                <div className="flex-1">
                  {isWrong && (
                    <p className="text-xs font-semibold text-red-700 mb-1">Keine gute Wahl</p>
                  )}
                  <p className={`text-sm leading-relaxed ${isWrong ? 'text-red-800' : 'text-slate-700'}`}>{selectedOpt.reaction}</p>
                </div>
              </div>
            </div>
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
              className="fp-btn px-4 py-2 text-xs font-semibold flex-shrink-0" style={{ borderRadius: br, background: primary, color: '#fff' }}>
              {s(p.buttonText, 'Download')}
            </a>
          )}
        </div>
      );
    }

    case 'quest_spinner':
      return <SpinnerBlock text={s(p.text)} doneText={s(p.doneText)} primary={primary} onNext={() => onNext()} duration={n(p.duration, 2400)} />;

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
        : <LeadFormBlock props={p} company={company} br={br} primary={primary} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form, cf) => onLeadSubmit(form, cf)} />;

    // ── BerufsCheck blocks ────────────────────────────────────────────────────
    case 'check_intro': {
      const imageUrl = s(p.imageUrl);
      return (
        <div className="px-6 py-10 text-white text-center min-h-[320px] flex flex-col justify-center" style={{ background: primary }}>
          {!!imageUrl && (
            <img src={imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl mb-4 opacity-90" />
          )}
          <h1 className="text-2xl font-bold mb-3 leading-tight" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.headline))) }} />
          <div className="text-sm text-white/70 mb-8 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: sh(s(p.subtext)) }} />
          <div>
            <button onClick={() => onNext()} className="fp-btn px-10 py-3.5 font-semibold text-base" style={{ borderRadius: br, background: primary, color: '#fff' }}>
              {s(p.buttonText, 'Jetzt starten')}
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
            placeholder={s(p.placeholder, 'Dein Vorname')}
            className="w-full px-4 py-3 border-2 border-slate-200 text-sm focus:outline-none"
            style={{ borderRadius: br, fontSize: '16px' }} />
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
            <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} primary={primary} />
          </div>
        );
      }

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
        </div>
      );
    }

    case 'check_selbst':
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <h2 className="fp-heading text-xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(s(p.question))) }} />
          {b(p.description) && <p className="text-sm text-slate-500 mb-5">{s(p.description)}</p>}
          <SliderBlock nodeId={node.id} p={p} answers={answers} onAnswer={onAnswer} primary={primary} />
        </div>
      );

    case 'check_lead':
      return leadSubmitted
        ? <CompletionScreen company={company} headline={s(p.thankYouHeadline, 'Vielen Dank!')} text={s(p.thankYouText)} primary={primary} buttonText={s(p.thankYouButtonText)} buttonUrl={s(p.thankYouButtonUrl)} />
        : <LeadFormBlock props={p} company={company} br={br} primary={primary} leadForm={leadForm} setLeadForm={setLeadForm} onSubmit={(form) => onLeadSubmit(form)} />;

    case 'check_ergebnis': {
      const scoreVals = Object.values(scores);
      const maxScore  = Math.max(...scoreVals, 1);
      const headline  = applyVars(s(p.headline, 'Dein Ergebnis!'), { ...varsMap, firstName: firstName || 'dir' });
      return (
        <div className="fp-card bg-white shadow-sm mx-4 my-3 p-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
            <Trophy size={28} style={{ color: primary }} />
          </div>
          <h2 className="fp-heading text-2xl font-bold mb-2 text-center" dangerouslySetInnerHTML={{ __html: sh(inlineHtml(headline)) }} />
          {b(p.subtext) && <div className="text-slate-500 text-sm mb-5 text-center rte" dangerouslySetInnerHTML={{ __html: sh(s(p.subtext)) }} />}
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
