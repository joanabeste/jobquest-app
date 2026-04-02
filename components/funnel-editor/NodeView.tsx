'use client';

import React from 'react';
import {
  Type, AlignLeft, MousePointer2, ImageIcon, Minus, Video,
  Play, MessageSquare, GitBranch, HelpCircle, Info, FileText,
  User, Sliders, List, CheckSquare, Phone, Trophy,
  Layout, Zap, ArrowRight, Copy, Trash2,
  FileDown, Send, Star, Timer, ChevronRight,
} from 'lucide-react';
import { BlockNode, FunnelBlockType, LayoutNode, FunnelNode, BLOCK_LABELS, FunnelStyle } from '@/lib/funnel-types';

const BLOCK_META: Record<FunnelBlockType, { icon: React.ElementType; color: string; bg: string }> = {
  heading:             { icon: Type,          color: 'text-slate-600',   bg: 'bg-slate-100' },
  paragraph:           { icon: AlignLeft,     color: 'text-slate-500',   bg: 'bg-slate-50' },
  button:              { icon: MousePointer2, color: 'text-violet-600',  bg: 'bg-violet-50' },
  image:               { icon: ImageIcon,     color: 'text-blue-500',    bg: 'bg-blue-50' },
  spacer:              { icon: Minus,         color: 'text-slate-400',   bg: 'bg-slate-50' },
  video:               { icon: Video,         color: 'text-red-500',     bg: 'bg-red-50' },
  quest_scene:         { icon: Play,          color: 'text-violet-600',  bg: 'bg-violet-50' },
  quest_dialog:        { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50' },
  quest_decision:      { icon: GitBranch,     color: 'text-amber-600',   bg: 'bg-amber-50' },
  quest_quiz:          { icon: HelpCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  quest_info:          { icon: Info,          color: 'text-sky-600',     bg: 'bg-sky-50' },
  quest_freetext:      { icon: FileText,      color: 'text-slate-600',   bg: 'bg-slate-50' },
  quest_file:          { icon: FileDown,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  quest_lead:          { icon: Send,          color: 'text-violet-700',  bg: 'bg-violet-100' },
  quest_spinner:       { icon: Timer,         color: 'text-slate-600',   bg: 'bg-slate-100' },
  quest_rating:        { icon: Star,          color: 'text-amber-500',   bg: 'bg-amber-50' },
  quest_vorname:       { icon: User,          color: 'text-blue-600',    bg: 'bg-blue-50' },
  check_intro:         { icon: Zap,           color: 'text-violet-600',  bg: 'bg-violet-50' },
  check_vorname:       { icon: User,          color: 'text-blue-600',    bg: 'bg-blue-50' },
  check_frage:         { icon: HelpCircle,    color: 'text-amber-600',   bg: 'bg-amber-50' },
  check_ergebnisfrage: { icon: CheckSquare,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  check_selbst:        { icon: Sliders,       color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  check_lead:          { icon: Phone,         color: 'text-rose-600',    bg: 'bg-rose-50' },
  check_ergebnis:      { icon: Trophy,        color: 'text-amber-600',   bg: 'bg-amber-50' },
  form_hero:           { icon: Layout,        color: 'text-violet-600',  bg: 'bg-violet-50' },
  form_text:           { icon: AlignLeft,     color: 'text-slate-600',   bg: 'bg-slate-50' },
  form_image:          { icon: ImageIcon,     color: 'text-blue-500',    bg: 'bg-blue-50' },
  form_step:           { icon: List,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  form_config:         { icon: FileText,      color: 'text-slate-500',   bg: 'bg-slate-100' },
};

export { BLOCK_META };

// ─── Inline-editable field ────────────────────────────────────────────────────
function Ed({ v, up, cl, ph, multi = false }: {
  v: string;
  up?: (val: string) => void;
  cl?: string;
  ph?: string;
  multi?: boolean;
}) {
  const inheritStyle: React.CSSProperties = { font: 'inherit', letterSpacing: 'inherit', color: 'inherit' };
  const base = 'bg-transparent border-0 outline-none focus:ring-0 w-full p-0 m-0';

  if (!up) {
    if (multi) return <p className={cl}>{v || <span style={{ opacity: 0.3 }}>{ph}</span>}</p>;
    return <span className={cl}>{v || <span style={{ opacity: 0.3 }}>{ph}</span>}</span>;
  }

  if (multi) {
    return (
      <textarea
        value={v}
        onChange={(e) => up(e.target.value)}
        placeholder={ph}
        className={`${base} resize-none overflow-hidden block ${cl ?? ''}`}
        style={{ ...inheritStyle, minHeight: '1.4em' }}
        rows={1}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = '0';
          el.style.height = el.scrollHeight + 'px';
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={v}
      onChange={(e) => up(e.target.value)}
      placeholder={ph}
      className={`${base} ${cl ?? ''}`}
      style={inheritStyle}
    />
  );
}

// ─── Field row (shared by quest_lead, check_lead, form_config) ────────────────
type FieldDef = { id: string; label: string; placeholder?: string };
function FieldRows({ fields, placeholderBg, textColor }: { fields: FieldDef[]; placeholderBg: string; textColor: string }) {
  const rows = fields.length > 0 ? fields : [{ id: 'fallback', label: 'E-Mail', placeholder: 'E-Mail-Adresse' }];
  return (
    <>
      {rows.map((f) => (
        <div key={f.id} className={`h-10 ${placeholderBg} rounded-lg flex items-center px-3`}>
          <span className={`text-sm ${textColor}`}>{f.placeholder || f.label}</span>
        </div>
      ))}
    </>
  );
}

// ─── Block preview – matches FunnelPlayer visual output ───────────────────────
function BlockPreview({ node, onUpdate }: {
  node: BlockNode;
  onUpdate?: (props: Record<string, unknown>) => void;
}) {
  const p = node.props;
  const up = onUpdate ? (key: string) => (val: string) => onUpdate({ [key]: val }) : undefined;

  switch (node.type) {

    // ── Generic ──────────────────────────────────────────────────────────────

    case 'heading':
      return (
        <div className="px-5 py-4">
          <Ed
            v={(p.text as string) ?? ''}
            up={up?.('text')}
            ph="Überschrift"
            cl={`font-bold text-slate-900 leading-tight ${(p.level as number) === 1 ? 'text-3xl' : (p.level as number) === 2 ? 'text-2xl' : 'text-xl'}`}
          />
        </div>
      );

    case 'paragraph':
      return (
        <div className="px-5 py-3">
          {(p.text as string)
            ? <div className="text-sm text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: p.text as string }} />
            : <p className="text-sm text-slate-400 italic">Text…</p>}
        </div>
      );

    case 'button':
      return (
        <div className="px-5 py-3">
          <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold ${
            p.variant === 'primary' ? 'bg-violet-600 text-white' :
            p.variant === 'secondary' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
            'border-2 border-violet-600 text-violet-600'
          }`}>
            <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Button" />
            <ArrowRight size={14} className="flex-shrink-0" />
          </span>
        </div>
      );

    case 'image':
      return (
        <div className="overflow-hidden">
          {p.src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.src as string} alt={(p.alt as string) || ''} className="w-full object-cover" />
            : <div className="bg-slate-100 h-36 flex items-center justify-center"><ImageIcon size={32} className="text-slate-300" /></div>
          }
        </div>
      );

    case 'spacer':
      return (
        <div style={{ height: Math.max(16, (p.height as number) || 32) }} className="flex items-center justify-center border-y border-dashed border-slate-200">
          <span className="text-[10px] text-slate-300 font-mono">{p.height as number}px</span>
        </div>
      );

    case 'video':
      return (
        <div className="bg-slate-900 h-32 flex flex-col items-center justify-center gap-2">
          <Video size={24} className="text-slate-500" />
          <p className="text-xs text-slate-500 truncate max-w-[240px]">{(p.url as string) || 'Video-URL'}</p>
        </div>
      );

    // ── Quest ─────────────────────────────────────────────────────────────────

    case 'quest_scene': {
      const hasImg = !!(p.imageUrl as string);
      return (
        <div>
          {hasImg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.imageUrl as string} alt="" className="w-full max-h-48 object-cover" />
            : <div className="h-3 bg-violet-600" />
          }
          <div className="px-6 pt-6 pb-5 text-center bg-white">
            <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Titel" cl="font-bold text-2xl uppercase leading-tight" />
            {!!(p.accentText as string) && (
              <p className="text-sm font-bold uppercase tracking-wide text-violet-600 mt-1">{p.accentText as string}</p>
            )}
            {!!(p.description as string) && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{p.description as string}</p>
            )}
            <div className="mt-4 bg-violet-600 text-white text-sm font-semibold py-3 px-6 rounded-xl inline-block">
              {(p.buttonText as string) || 'Alles klar, verstanden!'}
            </div>
          </div>
        </div>
      );
    }

    case 'quest_dialog': {
      const lines = (p.lines as { id: string; speaker: string; text: string }[]) || [];
      return (
        <div className="py-4 space-y-3">
          {lines.slice(0, 3).map((l) => (
            <div key={l.id} className="flex items-start gap-3 px-5">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-auto">
                <span className="text-xs font-bold text-violet-600">{l.speaker?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-400 mb-1">{l.speaker}</p>
                <div className="bg-slate-100 rounded-2xl px-3 py-2.5 text-sm text-slate-700">{l.text || '…'}</div>
              </div>
            </div>
          ))}
          {lines.length > 3 && (
            <p className="text-[11px] text-center text-slate-400 px-5">+{lines.length - 3} weitere</p>
          )}
          {lines.length === 0 && (
            <p className="text-sm text-slate-400 text-center px-5 italic">Keine Zeilen</p>
          )}
        </div>
      );
    }

    case 'quest_decision': {
      const opts = (p.options as { id: string; text: string }[]) || [];
      return (
        <div className="mx-4 my-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Was würdest du tun?" cl="text-base font-semibold text-slate-800 mb-4 block text-center" />
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 space-y-1.5">
            {opts.map((o) => (
              <div key={o.id} className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{o.text || `Option`}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_quiz': {
      const opts = (p.options as { id: string; text: string; correct: boolean }[]) || [];
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="text-base font-semibold text-slate-800 mb-3 block" />
          <div className="space-y-2">
            {opts.slice(0, 4).map((o) => (
              <div key={o.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
                o.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
              }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${o.correct ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`} />
                <span className="text-slate-700">{o.text || `Antwort`}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_info':
      return (
        <div className="mx-4 my-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4">
          <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Info" cl="font-semibold text-sky-900 mb-1.5 block" />
          <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Text…" cl="text-sm text-sky-700 leading-relaxed" multi />
        </div>
      );

    case 'quest_freetext':
      return (
        <div className="px-5 py-4">
          <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Freitext…" cl="text-sm text-slate-600 leading-relaxed" multi />
        </div>
      );

    case 'quest_file':
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FileDown size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{(p.title as string) || 'Datei'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{(p.fileName as string) || 'dokument.pdf'}</p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg flex-shrink-0">
            {(p.buttonText as string) || 'Download'}
          </span>
        </div>
      );

    case 'quest_vorname':
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie heißt du?" cl="text-xl font-bold text-slate-800 mb-4 block" />
          <div className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl flex items-center">
            <span className="text-sm text-slate-400">{(p.placeholder as string) || 'Dein Vorname…'}</span>
          </div>
        </div>
      );

    case 'quest_spinner':
      return (
        <div className="py-14 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full border-[5px] border-slate-200 border-t-violet-500 animate-spin" />
          <p className="text-base font-medium text-slate-700">{(p.text as string) || 'Einen Moment…'}</p>
        </div>
      );

    case 'quest_rating': {
      const count = Math.min(8, Math.max(1, (p.count as number) || 5));
      const emoji = (p.emoji as string) || '⭐';
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
          <p className="text-base font-semibold text-slate-700 mb-4">{(p.question as string) || 'Bewertung'}</p>
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="text-3xl leading-none" style={{ opacity: i < 3 ? 1 : 0.25 }}>{emoji}</span>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_lead': {
      const fields = (p.fields as FieldDef[]) || [];
      return (
        <div className="bg-violet-700 px-5 py-5 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="font-bold text-base" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Kontaktdaten hinterlassen" cl="text-sm text-violet-200 mt-1 block" multi />
          <div className="mt-4 space-y-2">
            <FieldRows fields={fields} placeholderBg="bg-white/20" textColor="text-violet-300" />
          </div>
          <div className="mt-4 px-6 py-3 bg-white rounded-xl inline-block">
            <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt bewerben" cl="text-sm font-semibold text-violet-700" />
          </div>
        </div>
      );
    }

    // ── BerufsCheck ────────────────────────────────────────────────────────────

    case 'check_intro':
      return (
        <div className="px-6 py-10 text-white text-center bg-violet-600 min-h-[220px] flex flex-col justify-center">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Intro" cl="font-bold text-2xl leading-tight mb-2 block" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-sm text-violet-200 mb-6 block" multi />
          <div>
            <span className="inline-block px-8 py-3 bg-white rounded-xl text-violet-700 text-sm font-semibold">
              <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt starten" cl="text-violet-700" />
            </span>
          </div>
        </div>
      );

    case 'check_vorname':
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie heißt du?" cl="text-xl font-bold text-slate-800 mb-4 block" />
          <div className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl flex items-center">
            <span className="text-sm text-slate-400">{(p.placeholder as string) || 'Vorname…'}</span>
          </div>
        </div>
      );

    case 'check_frage':
    case 'check_ergebnisfrage': {
      const isSlider = node.type === 'check_frage' && p.frageType === 'slider';
      const opts = (p.options as { id: string; text: string }[]) || [];
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="text-base font-semibold text-slate-800 mb-4 block" />
          {isSlider ? (
            <div>
              <div className="h-3 bg-violet-100 rounded-full relative">
                <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-4 h-4 bg-violet-600 rounded-full shadow" />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-400">{(p.sliderLabelMin as string) || '0'}</span>
                <span className="text-xs text-slate-400">{(p.sliderLabelMax as string) || '10'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {opts.slice(0, 3).map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{o.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'check_selbst':
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie schätzt du dich ein?" cl="text-base font-semibold text-slate-800 mb-4 block" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex-shrink-0">{(p.sliderLabelMin as string) || '0'}</span>
            <div className="flex-1 h-3 bg-slate-200 rounded-full relative">
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-4 h-4 bg-violet-600 rounded-full shadow" />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{(p.sliderLabelMax as string) || '10'}</span>
          </div>
        </div>
      );

    case 'check_lead': {
      const fields = (p.fields as FieldDef[]) || [];
      const rows = fields.length > 0 ? fields : [{ id: 'fallback', label: 'E-Mail', placeholder: 'E-Mail-Adresse' }];
      return (
        <div className="px-5 py-5 bg-rose-50 border-t-2 border-rose-100">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Kontakt" cl="font-bold text-base text-rose-800 mb-3 block" />
          <div className="space-y-2">
            {rows.map((f) => (
              <div key={f.id} className="h-10 bg-white border border-rose-200 rounded-lg flex items-center px-3">
                <span className="text-sm text-slate-400">{f.placeholder || f.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'check_ergebnis':
      return (
        <div className="px-5 py-5 bg-amber-50">
          <Trophy size={24} className="text-amber-500 mb-2" />
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Dein Ergebnis!" cl="text-xl font-bold text-amber-800 mb-3 block" />
          {!!p.showDimensionBars && (
            <div className="space-y-2.5">
              {['Dimension A', 'Dimension B'].map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-xs text-amber-700 w-20 truncate">{d}</span>
                  <div className="flex-1 h-2.5 bg-amber-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // ── Formular ───────────────────────────────────────────────────────────────

    case 'form_hero':
      return (
        <div className="bg-violet-600 px-6 py-10 text-white min-h-[200px] flex flex-col justify-center">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Hero" cl="font-bold text-2xl mb-2 block" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-sm text-violet-200 mb-6 block" multi />
          <span className="inline-block px-6 py-3 bg-white rounded-xl text-violet-700 text-sm font-semibold self-start">
            <Ed v={(p.ctaText as string) ?? ''} up={up?.('ctaText')} ph="CTA" cl="text-violet-700" />
          </span>
        </div>
      );

    case 'form_text':
      return (
        <div className="px-5 py-4">
          {!!(p.headline as string) && (
            <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Überschrift" cl="text-xl font-bold text-slate-900 mb-2 block" />
          )}
          {!(p.headline as string) && up && (
            <Ed v="" up={up('headline')} ph="Überschrift (optional)" cl="text-xl font-bold text-slate-900 mb-2 block" />
          )}
          <Ed v={(p.content as string) ?? ''} up={up?.('content')} ph="Text…" cl="text-sm text-slate-600 leading-relaxed" multi />
        </div>
      );

    case 'form_image':
      return (
        <div className="overflow-hidden">
          {p.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.imageUrl as string} alt="" className="w-full object-cover" />
            : <div className="bg-slate-100 h-36 flex items-center justify-center"><ImageIcon size={32} className="text-slate-300" /></div>
          }
        </div>
      );

    case 'form_step': {
      const fields = (p.fields as { id: string; label: string }[]) || [];
      return (
        <div className="px-5 py-4">
          <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Schritt" cl="text-base font-bold text-slate-800 mb-3 block" />
          <div className="space-y-2">
            {fields.slice(0, 3).map((f) => (
              <div key={f.id} className="h-10 bg-white rounded-xl border-2 border-slate-200 flex items-center px-3">
                <span className="text-sm text-slate-400">{f.label}</span>
              </div>
            ))}
            {fields.length === 0 && <p className="text-sm text-slate-300 italic">Keine Felder</p>}
            {fields.length > 3 && <p className="text-xs text-slate-400 mt-1">+{fields.length - 3} weitere</p>}
          </div>
        </div>
      );
    }

    case 'form_config': {
      const fields = (p.fields as FieldDef[]) || [];
      return (
        <div className="bg-violet-700 px-5 py-5 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="font-bold text-base" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Kontaktdaten hinterlassen" cl="text-sm text-violet-200 mt-1 block" multi />
          <div className="mt-4 space-y-2">
            <FieldRows fields={fields} placeholderBg="bg-white/20" textColor="text-violet-300" />
          </div>
          <div className="mt-4 px-6 py-3 bg-white rounded-xl inline-block">
            <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt bewerben" cl="text-sm font-semibold text-violet-700" />
          </div>
        </div>
      );
    }

    default:
      return <div className="px-5 py-4 text-xs text-slate-400 font-mono">{node.type}</div>;
  }
}

// ─── NodeView ─────────────────────────────────────────────────────────────────
interface NodeViewProps {
  node: FunnelNode;
  isSelected: boolean;
  isDragging?: boolean;
  isLocked?: boolean;
  dragHandle?: React.ReactNode;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate?: (patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  renderColumns?: (layout: LayoutNode) => React.ReactNode;
}

export default function NodeView({
  node, isSelected, isDragging, isLocked, dragHandle,
  onSelect, onDelete, onDuplicate, onUpdate, renderColumns,
}: NodeViewProps) {
  const meta = node.kind === 'block' ? BLOCK_META[node.type] : null;
  const Icon = meta?.icon;
  const label = node.kind === 'block'
    ? BLOCK_LABELS[node.type]
    : `${(node as LayoutNode).columns.length} Spalten`;

  const showControls = isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`relative group transition-all cursor-default
        ${isSelected
          ? 'shadow-[inset_0_0_0_2px_#7c3aed] z-10'
          : 'hover:shadow-[inset_0_0_0_1.5px_rgba(124,58,237,0.3)]'}
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      {/* Block content – matches player output */}
      {node.kind === 'block' ? (
        <BlockPreview
          node={node}
          onUpdate={onUpdate ? (p) => onUpdate({ props: p }) : undefined}
        />
      ) : (
        <div className="p-3 bg-white">
          {renderColumns ? renderColumns(node) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${node.columns.length}, 1fr)` }}>
              {node.columns.map((col) => (
                <div key={col.id} className="min-h-12 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-slate-300">{col.nodes.length} Blöcke</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Label badge – top-left, hover/selected only */}
      <div className={`absolute top-1.5 left-1.5 flex items-center gap-1 z-20 transition-opacity pointer-events-none ${showControls}`}>
        {dragHandle && (
          <span className="pointer-events-auto flex items-center bg-violet-700/80 text-white/80 hover:text-white rounded p-0.5 backdrop-blur-sm">
            {dragHandle}
          </span>
        )}
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-600/90 backdrop-blur-sm pointer-events-none">
          {Icon && <Icon size={9} className="text-white flex-shrink-0" />}
          <span className="text-[9px] font-bold uppercase tracking-widest text-white leading-none">{label}</span>
        </span>
      </div>

      {/* Action buttons – top-right, hover/selected only */}
      {!isLocked && (
        <div className={`absolute top-1.5 right-1.5 flex items-center gap-0.5 z-20 transition-opacity ${showControls}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 rounded bg-white/95 shadow-sm text-slate-500 hover:text-violet-600 hover:bg-white transition-colors"
            title="Duplizieren (⌘D)"
          >
            <Copy size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded bg-white/95 shadow-sm text-slate-500 hover:text-red-500 hover:bg-white transition-colors"
            title="Löschen"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
