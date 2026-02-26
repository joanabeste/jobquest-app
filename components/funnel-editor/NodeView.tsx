'use client';

import React from 'react';
import {
  Type, AlignLeft, MousePointer2, ImageIcon, Minus, Video,
  Play, MessageSquare, GitBranch, HelpCircle, Info, FileText,
  User, Sliders, List, CheckSquare, Phone, Trophy,
  Layout, Zap, ArrowRight, Copy, Trash2,
  FileDown, Send, Star, Timer,
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
// Renders a styled input/textarea when editable, or plain text when read-only.
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

// ─── Block preview (1:1 live output + optional inline editing) ────────────────
function BlockPreview({ node, onUpdate }: {
  node: BlockNode;
  onUpdate?: (props: Record<string, unknown>) => void;
}) {
  const p = node.props;
  const up = onUpdate ? (key: string) => (val: string) => onUpdate({ [key]: val }) : undefined;

  switch (node.type) {
    case 'heading':
      return (
        <div className="px-4 py-3">
          <Ed
            v={(p.text as string) ?? ''}
            up={up?.('text')}
            ph="Überschrift"
            cl={`font-bold text-slate-900 ${(p.level as number) === 1 ? 'text-2xl' : (p.level as number) === 2 ? 'text-xl' : 'text-lg'}`}
          />
        </div>
      );

    case 'paragraph':
      return (
        <div className="px-4 py-3">
          {(p.text as string)
            ? <div className="text-sm text-slate-600 leading-relaxed rte" dangerouslySetInnerHTML={{ __html: p.text as string }} />
            : <p className="text-sm text-slate-400">Text…</p>}
        </div>
      );

    case 'button':
      return (
        <div className="px-4 py-3 flex">
          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium ${p.variant === 'primary' ? 'bg-violet-600 text-white' : p.variant === 'secondary' ? 'bg-slate-200 text-slate-700' : 'border border-violet-600 text-violet-600'}`}>
            <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Button" />
            <ArrowRight size={13} className="flex-shrink-0" />
          </span>
        </div>
      );

    case 'image':
      return (
        <div className="bg-slate-100 h-28 flex items-center justify-center overflow-hidden">
          {p.src ? <img src={p.src as string} alt={(p.alt as string) || ''} className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-slate-300" />}
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
        <div className="bg-slate-900 h-24 flex flex-col items-center justify-center gap-1.5">
          <Video size={20} className="text-slate-400" />
          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{(p.url as string) || 'Video-URL'}</p>
        </div>
      );

    case 'quest_scene': {
      const hasImg = !!(p.imageUrl as string);
      return (
        <div>
          {hasImg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.imageUrl as string} alt="" className="w-full h-20 object-cover" />
            : <div className="h-1.5 bg-gradient-to-r from-violet-500 to-violet-700" />
          }
          <div className="px-3 py-3 text-center bg-white">
            <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Titel" cl="font-bold text-xs uppercase text-center" />
            {!!(p.accentText as string) && (
              <p className="text-[10px] font-bold uppercase text-violet-600 mt-0.5 truncate">{p.accentText as string}</p>
            )}
            {!!(p.description as string) && (
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.description as string}</p>
            )}
            <div className="mt-2 bg-violet-600 text-white text-[10px] font-semibold py-1.5 px-3 rounded text-center">
              {(p.buttonText as string) || 'Alles klar, verstanden!'}
            </div>
          </div>
        </div>
      );
    }

    case 'quest_dialog': {
      const lines = (p.lines as { id: string; speaker: string; text: string; imageUrl?: string }[]) || [];
      return (
        <div className="px-4 py-3 space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-[9px] font-bold text-violet-600">{l.speaker?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                {!!l.imageUrl && (
                  <img src={l.imageUrl} alt="" className="w-full h-10 object-cover rounded-lg mb-1" />
                )}
                <div className="bg-slate-100 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">{l.text || '…'}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'quest_decision': {
      const opts = (p.options as { id: string; text: string }[]) || [];
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="text-xs font-semibold text-slate-800 mb-2 block" />
          <div className="space-y-1.5">
            {opts.slice(0, 3).map((o) => (
              <div key={o.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <GitBranch size={10} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700">{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_quiz': {
      const opts = (p.options as { id: string; text: string; correct: boolean }[]) || [];
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Quiz?" cl="text-xs font-semibold text-slate-800 mb-2 block" />
          <div className="space-y-1.5">
            {opts.slice(0, 3).map((o) => (
              <div key={o.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${o.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100'}`}>
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${o.correct ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`} />
                <span className="text-xs text-slate-700">{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_info':
      return (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 mx-3 my-2">
          <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Info" cl="text-xs font-semibold text-sky-800" />
          <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Text" cl="text-xs text-sky-600 mt-1" multi />
        </div>
      );

    case 'quest_freetext':
      return (
        <div className="px-4 py-3">
          <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Freitext…" cl="text-xs text-slate-600" multi />
        </div>
      );

    case 'quest_file':
      return (
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <FileDown size={15} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800">{(p.title as string) || 'Datei'}</p>
            <p className="text-[10px] text-slate-400 truncate">{(p.fileName as string) || 'dokument.pdf'}</p>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">
            {(p.buttonText as string) || 'Download'}
          </span>
        </div>
      );

    case 'quest_vorname':
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie heißt du?" cl="text-xs font-semibold text-slate-800" />
          <div className="mt-2 h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center px-3">
            <span className="text-xs text-slate-400">{(p.placeholder as string) || 'Dein Vorname…'}</span>
          </div>
        </div>
      );

    /* avatar block removed */

    case 'quest_spinner':
      return (
        <div className="px-4 py-5 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-violet-500 animate-spin" />
          <p className="text-xs text-slate-500">{(p.text as string) || 'Einen Moment…'}</p>
        </div>
      );

    case 'quest_rating': {
      const count = Math.min(10, Math.max(1, (p.count as number) || 5));
      const emoji = (p.emoji as string) || '⭐';
      return (
        <div className="px-4 py-3 text-center">
          <p className="text-xs font-semibold text-slate-700 mb-2">{(p.question as string) || 'Bewertung'}</p>
          <div className="flex justify-center gap-1">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="text-base" style={{ opacity: i < 3 ? 1 : 0.25 }}>{emoji}</span>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_lead':
      return (
        <div className="bg-violet-700 px-4 py-4 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="text-xs font-bold" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Kontaktdaten hinterlassen" cl="text-[10px] text-violet-200 mt-0.5" multi />
          <div className="mt-3 space-y-1.5">
            {!!p.showName && <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">Name</span></div>}
            <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">E-Mail</span></div>
            {!!p.showPhone && <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">Telefon</span></div>}
          </div>
          <div className="mt-3 px-3 py-1.5 bg-white text-violet-700 text-xs font-semibold rounded-lg inline-block">
            <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt bewerben" cl="text-violet-700" />
          </div>
        </div>
      );

    case 'check_intro':
      return (
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 px-4 py-4 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Intro" cl="font-bold text-sm" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-xs text-violet-200 mt-0.5" multi />
          <span className="mt-2.5 inline-block px-2.5 py-1 bg-white rounded-lg text-violet-700 text-xs font-semibold">
            <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Start" cl="text-violet-700" />
          </span>
        </div>
      );

    case 'check_vorname':
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie heißt du?" cl="text-xs font-semibold text-slate-800" />
          <div className="mt-2 h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center px-3">
            <span className="text-xs text-slate-400">{(p.placeholder as string) || 'Vorname…'}</span>
          </div>
        </div>
      );

    case 'check_frage':
    case 'check_ergebnisfrage': {
      const isSlider = node.type === 'check_frage' && p.frageType === 'slider';
      const opts = (p.options as { id: string; text: string }[]) || [];
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="text-xs font-semibold text-slate-800 mb-2 block" />
          {isSlider ? (
            <div className="h-3 bg-violet-100 rounded-full relative">
              <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-violet-600 rounded-full" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {opts.slice(0, 3).map((o) => (
                <div key={o.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  <span className="text-xs text-slate-700">{o.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'check_selbst':
      return (
        <div className="px-4 py-3">
          <Ed v={(p.question as string) ?? ''} up={up?.('question')} ph="Einschätzung" cl="text-xs font-semibold text-slate-800" />
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[10px] text-slate-400">{(p.sliderLabelMin as string) || '0'}</span>
            <div className="flex-1 h-3 bg-slate-200 rounded-full relative">
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-violet-600 rounded-full shadow" />
            </div>
            <span className="text-[10px] text-slate-400">{(p.sliderLabelMax as string) || '10'}</span>
          </div>
        </div>
      );

    case 'check_lead':
      return (
        <div className="px-4 py-3 bg-rose-50 border border-rose-100">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Kontakt" cl="text-xs font-bold text-rose-800" />
          <div className="mt-2 space-y-1.5">
            <div className="h-7 bg-white rounded border border-rose-200 flex items-center px-2"><span className="text-[10px] text-slate-300">E-Mail</span></div>
            {!!p.showPhone && <div className="h-7 bg-white rounded border border-rose-200 flex items-center px-2"><span className="text-[10px] text-slate-300">Telefon</span></div>}
          </div>
        </div>
      );

    case 'check_ergebnis':
      return (
        <div className="px-4 py-4 bg-amber-50 border border-amber-100">
          <Trophy size={18} className="text-amber-500 mb-1.5" />
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Ergebnis!" cl="text-xs font-bold text-amber-800" />
          {!!p.showDimensionBars && (
            <div className="mt-2 space-y-1">
              {['Dim A', 'Dim B'].map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-600 w-12 truncate">{d}</span>
                  <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'form_hero':
      return (
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 px-4 py-4 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Hero" cl="font-bold text-sm" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-xs text-violet-200 mt-0.5" multi />
          <span className="mt-2.5 inline-block px-2.5 py-1 bg-white rounded-lg text-violet-700 text-xs font-semibold">
            <Ed v={(p.ctaText as string) ?? ''} up={up?.('ctaText')} ph="CTA" cl="text-violet-700" />
          </span>
        </div>
      );

    case 'form_text':
      return (
        <div className="px-4 py-3">
          {!!p.headline && (
            <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Überschrift" cl="text-sm font-bold text-slate-900 mb-1 block" />
          )}
          {!p.headline && up && (
            <Ed v="" up={up('headline')} ph="Überschrift (optional)" cl="text-sm font-bold text-slate-900 mb-1 block" />
          )}
          <Ed v={(p.content as string) ?? ''} up={up?.('content')} ph="Text…" cl="text-xs text-slate-600" multi />
        </div>
      );

    case 'form_image':
      return (
        <div className="bg-slate-100 h-24 flex items-center justify-center overflow-hidden">
          {p.imageUrl ? <img src={p.imageUrl as string} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-slate-300" />}
        </div>
      );

    case 'form_step': {
      const fields = (p.fields as { id: string; label: string }[]) || [];
      return (
        <div className="px-4 py-3">
          <Ed v={(p.title as string) ?? ''} up={up?.('title')} ph="Schritt" cl="text-xs font-bold text-slate-800 mb-2 block" />
          <div className="space-y-1.5">
            {fields.slice(0, 3).map((f) => (
              <div key={f.id} className="h-7 bg-slate-100 rounded border border-slate-200 flex items-center px-2.5">
                <span className="text-[10px] text-slate-400">{f.label}</span>
              </div>
            ))}
            {fields.length === 0 && <p className="text-[10px] text-slate-300 italic">Keine Felder</p>}
            {fields.length > 3 && <p className="text-[10px] text-slate-400">+{fields.length - 3} weitere</p>}
          </div>
        </div>
      );
    }

    case 'form_config':
      // mirror quest_lead preview so editor appearance matches
      return (
        <div className="bg-violet-700 px-4 py-4 text-white">
          <Ed v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="text-xs font-bold" />
          <Ed v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Kontaktdaten hinterlassen" cl="text-[10px] text-violet-200 mt-0.5" multi />
          <div className="mt-3 space-y-1.5">
            {!!p.showName && <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">Name</span></div>}
            <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">E-Mail</span></div>
            {!!p.showPhone && <div className="h-7 bg-white/20 rounded-lg flex items-center px-2.5"><span className="text-[10px] text-violet-300">Telefon</span></div>}
          </div>
          <div className="mt-3 px-3 py-1.5 bg-white text-violet-700 text-xs font-semibold rounded-lg inline-block">
            <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt bewerben" cl="text-violet-700" />
          </div>
        </div>
      );

    default:
      return <div className="px-4 py-3 text-xs text-slate-400 font-mono">{node.type}</div>;
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
      className={`relative group transition-shadow cursor-default
        ${isSelected ? 'shadow-[inset_0_0_0_2px_#7c3aed] z-10' : 'hover:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.35)]'}
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      {/* Block content – live output 1:1 */}
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
