'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeHtml } from '@/lib/sanitize';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TiptapTextAlign from '@tiptap/extension-text-align';
import TiptapUnderline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import {
  ImageIcon, Video, ArrowRight, FileDown, Trophy, ChevronRight, MapPin,
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft as AlignLeftIcon, AlignCenter, AlignRight,
} from 'lucide-react';
import { BlockNode, LeadFieldDef } from '@/lib/funnel-types';
import { useCi } from '@/lib/ci-context';
import { useFunnelEditorCtx } from '../FunnelEditorContext';
import InlineLeadFields from '../InlineLeadFields';
import { DECISION_ICONS, isIconName } from '@/lib/decision-icons';

// Custom extension: adds fontSize + fontWeight attributes to textStyle mark
const FontSizeWeight = Extension.create({
  name: 'fontSizeWeight',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, string | null>) =>
            attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
        },
        fontWeight: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontWeight || null,
          renderHTML: (attrs: Record<string, string | null>) =>
            attrs.fontWeight ? { style: `font-weight:${attrs.fontWeight}` } : {},
        },
      },
    }];
  },
});

// ─── Toolbar button ───────────────────────────────────────────────────────────
function ToolBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

const PRESETS = [
  { label: 'N',  size: null,    weight: null  },
  { label: 'XS', size: '11px',  weight: null  },
  { label: 'S',  size: '13px',  weight: null  },
  { label: 'M',  size: '16px',  weight: null  },
  { label: 'L',  size: '20px',  weight: '600' },
] as const;

// ─── Rich inline-editable field ───────────────────────────────────────────────
function RichEd({ v, up, cl, ph }: {
  v: string;
  up?: (val: string) => void;
  cl?: string;
  ph?: string;
}) {
  const { availableVars } = useFunnelEditorCtx();
  const toHtml = (raw: string) => raw.startsWith('<') ? raw : (raw ? `<p>${raw}</p>` : '<p></p>');

  const [mentionFilter, setMentionFilter] = useState('');
  const [showMention, setShowMention] = useState(false);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filteredVars = availableVars.filter(
    (va) =>
      va.key.toLowerCase().startsWith(mentionFilter.toLowerCase()) ||
      va.label.toLowerCase().startsWith(mentionFilter.toLowerCase()),
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, underline: false }),
      TiptapUnderline,
      TiptapTextAlign.configure({ types: ['paragraph'] }),
      TextStyle,
      Color,
      FontSizeWeight,
    ],
    content: toHtml(v),
    editorProps: {
      attributes: {
        class: `${cl ?? ''} outline-none rte-editor`,
        'data-placeholder': ph ?? '',
      },
    },
    onUpdate: ({ editor: ed }) => {
      up?.(ed.getHTML());
      if (!up) return;
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(Math.max(0, from - 30), from, ' ');
      const match = textBefore.match(/@(\w*)$/);
      if (match) {
        setMentionFilter(match[1]);
        const domSel = window.getSelection();
        if (domSel && domSel.rangeCount > 0) {
          const rect = domSel.getRangeAt(0).getBoundingClientRect();
          setMentionPos({ top: rect.bottom + 6, left: rect.left });
        }
        setShowMention(true);
      } else {
        setShowMention(false);
      }
    },
    editable: !!up,
    immediatelyRender: false,
  });

  function insertVar(key: string) {
    if (!editor) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 30), from, ' ');
    const match = textBefore.match(/@(\w*)$/);
    if (!match) return;
    const deleteFrom = from - match[0].length;
    editor.chain().focus()
      .deleteRange({ from: deleteFrom, to: from })
      .insertContent(`@${key}`)
      .run();
    setShowMention(false);
  }

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const next = toHtml(v);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [v, editor]);

  if (!up) {
    if (!v) return <span className={cl} style={{ opacity: 0.3 }}>{ph}</span>;
    if (v.startsWith('<')) return <div className={`${cl ?? ''} rte`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(v) }} />;
    return <span className={cl}>{v}</span>;
  }

  function isPresetActive(p: typeof PRESETS[number]) {
    const a = editor?.getAttributes('textStyle') ?? {};
    return !p.size && !p.weight
      ? !a.fontSize && !a.fontWeight
      : a.fontSize === p.size && a.fontWeight === p.weight;
  }

  function applyPreset(p: typeof PRESETS[number]) {
    editor?.chain().focus().setMark('textStyle', { fontSize: p.size ?? null, fontWeight: p.weight ?? null }).run();
  }

  return (
    <div className="relative" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          className="flex items-center gap-0.5 bg-white shadow-xl rounded-lg border border-slate-200 p-1"
        >
          <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett (Ctrl+B)">
            <Bold size={12} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv (Ctrl+I)">
            <Italic size={12} />
          </ToolBtn>
          <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Unterstrichen (Ctrl+U)">
            <UnderlineIcon size={12} />
          </ToolBtn>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          {PRESETS.map(p => (
            <button
              key={p.label}
              onMouseDown={e => { e.preventDefault(); applyPreset(p); }}
              title={p.label === 'N' ? 'Normal' : p.label}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                isPresetActive(p) ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >{p.label}</button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Links">
            <AlignLeftIcon size={12} />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Zentriert">
            <AlignCenter size={12} />
          </ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Rechts">
            <AlignRight size={12} />
          </ToolBtn>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      {showMention && mentionPos && filteredVars.length > 0 && createPortal(
        <div
          style={{ position: 'fixed', top: mentionPos.top, left: mentionPos.left, zIndex: 9999, minWidth: 200 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variable einfügen</span>
          </div>
          {filteredVars.map((va) => (
            <button
              key={va.key}
              onMouseDown={() => insertVar(va.key)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-50 transition-colors text-left"
            >
              <span className="text-violet-600 font-mono text-xs font-semibold">@{va.key}</span>
              <span className="text-xs text-slate-400">{va.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Simple inline input ──────────────────────────────────────────────────────
function Ed({ v, up, cl, ph }: {
  v: string;
  up?: (val: string) => void;
  cl?: string;
  ph?: string;
}) {
  const inheritStyle: React.CSSProperties = { font: 'inherit', letterSpacing: 'inherit', color: 'inherit' };
  const base = 'bg-transparent border-0 outline-none focus:ring-0 w-full p-0 m-0';
  if (!up) return <span className={cl}>{v || <span style={{ opacity: 0.3 }}>{ph}</span>}</span>;
  return (
    <input
      type="text"
      value={v}
      onChange={(e) => up(e.target.value)}
      placeholder={ph}
      onClick={(e) => e.stopPropagation()}
      className={`${base} ${cl ?? ''}`}
      style={inheritStyle}
    />
  );
}

// ─── Static field rows for preview mode (no onUpdate) ────────────────────────
function StaticFieldRows({ fields, br }: { fields: LeadFieldDef[]; br: string }) {
  return (
    <>
      {fields.map((f) => f.type === 'checkbox' ? (
        <label key={f.id} className="flex items-start gap-3">
          <input type="checkbox" disabled className="mt-0.5 flex-shrink-0 opacity-40" />
          <span
            className="text-xs text-slate-500 leading-relaxed [&_a]:underline [&_a]:text-violet-500"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(f.label) + (f.required ? ' *' : '') }}
          />
        </label>
      ) : (
        <div key={f.id} className="w-full px-3 py-2.5 border-2 border-slate-200 text-sm text-slate-400 bg-white" style={{ borderRadius: br }}>
          {f.placeholder || f.label}{f.required ? ' *' : ''}
        </div>
      ))}
    </>
  );
}

// ─── quest_hotspot canvas preview ─────────────────────────────────────────────
function QuestHotspotPreview({ p, onUpdate }: {
  p: Record<string, unknown>;
  onUpdate?: (props: Record<string, unknown>) => void;
}) {
  const imageUrl = (p.imageUrl as string) || '';
  const hotspots = (p.hotspots as { id: string; x: number; y: number; label: string }[]) || [];
  const imgElRef = useRef<HTMLImageElement>(null);

  function startDrag(e: React.MouseEvent, hotspotId: string) {
    if (!onUpdate) return;
    const update = onUpdate;
    e.stopPropagation();
    e.preventDefault();

    function onMove(ev: MouseEvent) {
      const img = imgElRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, Math.round(((ev.clientX - rect.left) / rect.width) * 100)));
      const y = Math.min(100, Math.max(0, Math.round(((ev.clientY - rect.top) / rect.height) * 100)));
      update({ hotspots: hotspots.map((h) => h.id === hotspotId ? { ...h, x, y } : h) });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className="mx-4 my-3">
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-xl select-none">
          <img
            ref={imgElRef}
            src={imageUrl}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight: 280, display: 'block' }}
            draggable={false}
          />
          {hotspots.map((h, i) => (
            <div
              key={h.id}
              title={onUpdate ? `${h.label} — ziehen zum Verschieben` : h.label}
              onMouseDown={(e) => startDrag(e, h.id)}
              className={`absolute flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md border-2 border-rose-400 text-rose-600 text-xs font-bold ${onUpdate ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
              style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-36 rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400">
          <MapPin size={24} />
          <span className="text-xs">Bild hochladen und Hotspots platzieren</span>
        </div>
      )}
      {hotspots.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-2 text-center">{hotspots.length} Hotspot{hotspots.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

// ─── Block preview – matches FunnelPlayer visual output ───────────────────────
export default function BlockPreview({ node, onUpdate }: {
  node: BlockNode;
  onUpdate?: (props: Record<string, unknown>) => void;
}) {
  const { primary, br } = useCi();
  const p = node.props;
  const up = onUpdate ? (key: string) => (val: string) => onUpdate({ [key]: val }) : undefined;

  switch (node.type) {

    // ── Generic ──────────────────────────────────────────────────────────────

    case 'heading':
      return (
        <div className="px-5 py-4">
          <RichEd
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
          <RichEd
            v={(p.text as string) ?? ''}
            up={up?.('text')}
            ph="Text…"
            cl="text-sm text-slate-600 leading-relaxed"
          />
        </div>
      );

    case 'button': {
      const isPrimary = p.variant !== 'secondary' && p.variant !== 'outline';
      const isOutline = p.variant === 'outline';
      return (
        <div className="px-5 py-3">
          <span
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
            style={{
              borderRadius: br,
              ...(isPrimary ? { background: primary, color: '#fff' } :
                  isOutline  ? { border: `2px solid ${primary}`, color: primary } :
                               { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }),
            }}
          >
            <Ed v={(p.text as string) ?? ''} up={up?.('text')} ph="Button" />
            <ArrowRight size={14} className="flex-shrink-0" />
          </span>
        </div>
      );
    }

    case 'image': {
      const imgSize   = (p.size as string) ?? 'full';
      const fit       = (p.objectFit as string) ?? 'cover';
      const imgHeight = p.height as number | undefined;
      const cropBox   = p.cropBox as { left: number; top: number; right: number; bottom: number } | undefined;
      const sizeClass: Record<string, string> = { full: 'w-full', l: 'max-w-lg mx-auto', m: 'max-w-sm mx-auto', s: 'max-w-xs mx-auto', xs: 'max-w-[128px] mx-auto' };
      const wrapCls = sizeClass[imgSize] ?? 'w-full';
      const containerStyle: React.CSSProperties = { ...(imgHeight ? { height: imgHeight } : {}), overflow: 'hidden', position: 'relative' };
      const hasCrop = cropBox && (cropBox.left !== 0 || cropBox.top !== 0 || cropBox.right !== 100 || cropBox.bottom !== 100);
      return (
        <div className="overflow-hidden">
          {p.src ? (
            <div className={wrapCls} style={containerStyle}>
              {hasCrop ? (
                <div style={{
                  position: 'absolute',
                  width: `${10000 / (cropBox!.right - cropBox!.left)}%`,
                  height: `${10000 / (cropBox!.bottom - cropBox!.top)}%`,
                  left: `${-100 * cropBox!.left / (cropBox!.right - cropBox!.left)}%`,
                  top: `${-100 * cropBox!.top / (cropBox!.bottom - cropBox!.top)}%`,
                }}>
                  <img src={p.src as string} alt={(p.alt as string) || ''} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} draggable={false} />
                </div>
              ) : (
                <img src={p.src as string} alt={(p.alt as string) || ''} className={fit === 'none' ? '' : `w-full h-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
              )}
            </div>
          ) : (
            <div className="bg-slate-100 h-36 flex items-center justify-center"><ImageIcon size={32} className="text-slate-300" /></div>
          )}
        </div>
      );
    }

    case 'spacer':
      return (
        <div style={{ height: Math.max(16, (p.height as number) || 32) }} className="flex items-center justify-center border-y border-dashed border-slate-200">
          <span className="text-[10px] text-slate-300 font-mono">{p.height as number}px</span>
        </div>
      );

    case 'video': {
      const vUrl       = (p.url as string) || '';
      const ytMatch    = vUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      const vimeoMatch = vUrl.match(/vimeo\.com\/(\d+)/);
      const embedUrl   = ytMatch    ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
        : vimeoMatch ? `https://player.vimeo.com/video/${vimeoMatch[1]}` : vUrl;
      const videoBr    = node.style?.borderRadius ? `${node.style.borderRadius}px` : br;
      return vUrl ? (
        <div className="px-5 py-3 pointer-events-none">
          <div className="aspect-video overflow-hidden bg-black shadow-md" style={{ borderRadius: videoBr }}>
            <iframe src={embedUrl} className="w-full h-full" title="Video" />
          </div>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center gap-2 bg-slate-900" style={{ borderRadius: videoBr }}>
          <Video size={24} className="text-slate-500" />
          <p className="text-xs text-slate-500">Video-URL eingeben</p>
        </div>
      );
    }

    // ── Quest ─────────────────────────────────────────────────────────────────

    case 'quest_scene': {
      const hasImg = !!(p.imageUrl as string);
      return (
        <div>
          {hasImg
            ? <img src={p.imageUrl as string} alt="" className="w-full max-h-48 object-cover" />
            : <div className="h-3" style={{ background: primary }} />
          }
          <div className="px-6 pt-6 pb-5 text-center bg-white">
            <RichEd v={(p.title as string) ?? ''} up={up?.('title')} ph="Titel" cl="fp-heading leading-tight" />
            {!!(p.accentText as string) && (
              <p className="text-sm font-bold uppercase tracking-wide mt-1" style={{ color: primary }}>{p.accentText as string}</p>
            )}
            <RichEd v={(p.description as string) ?? ''} up={up?.('description')} ph="Beschreibung…" cl="text-sm text-slate-500 mt-2 leading-relaxed" />
            <div className="mt-4 text-white text-sm font-semibold py-3 px-6 inline-block" style={{ background: primary, borderRadius: br }}>
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
      const opts = (p.options as { id: string; text: string; emoji?: string }[]) || [];
      const hasIcons = opts.some((o) => isIconName(o.emoji) || o.emoji);
      return (
        <div className="mx-4 my-3">
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Was würdest du tun?" cl="fp-heading mb-4 block text-center" />
          {hasIcons ? (
            <div className={`grid gap-3 ${opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {opts.map((o) => {
                const IconComp = isIconName(o.emoji) ? DECISION_ICONS[o.emoji] : null;
                return (
                  <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2.5 text-center shadow-sm">
                    {IconComp
                      ? <IconComp size={28} className="text-violet-500" />
                      : <span className="text-3xl leading-none">{o.emoji}</span>
                    }
                    <span className="text-xs font-medium text-slate-700 leading-tight">{o.text || 'Option'}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-2 space-y-1.5">
              {opts.map((o) => (
                <div key={o.id} className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                  <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{o.text || 'Option'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'quest_quiz': {
      const opts = (p.options as { id: string; text: string; correct: boolean }[]) || [];
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="fp-heading mb-3 block" />
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
          <RichEd v={(p.title as string) ?? ''} up={up?.('title')} ph="Info" cl="font-semibold text-sky-900 mb-1.5 block" />
          <RichEd v={(p.text as string) ?? ''} up={up?.('text')} ph="Text…" cl="text-sm text-sky-700 leading-relaxed" />
        </div>
      );

    case 'quest_freetext':
      return (
        <div className="px-5 py-4">
          <RichEd v={(p.text as string) ?? ''} up={up?.('text')} ph="Freitext…" cl="text-sm text-slate-600 leading-relaxed" />
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

    case 'quest_spinner':
      return (
        <div className="py-14 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full border-[5px] border-slate-200 border-t-violet-500 animate-spin" />
          <p className="text-base font-medium text-slate-700">{(p.text as string) || 'Einen Moment…'}</p>
        </div>
      );

    case 'quest_hotspot':
      return <QuestHotspotPreview p={p} onUpdate={onUpdate} />;

    case 'quest_sort': {
      const items = (p.items as { id: string; text: string }[]) || [];
      return (
        <div className="mx-4 my-3">
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Bringe die Elemente in die richtige Reihenfolge…" cl="fp-heading mb-3 block" />
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm text-slate-700">{item.text || `Element ${i + 1}`}</span>
                <div className="flex flex-col gap-0.5 text-slate-300">
                  <ChevronRight size={12} className="rotate-[-90deg]" />
                  <ChevronRight size={12} className="rotate-90" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_rating': {
      const count = Math.min(8, Math.max(1, (p.count as number) || 5));
      const emoji = (p.emoji as string) || '⭐';
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5 text-center">
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Bewertung" cl="fp-heading mb-4 block" />
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className="text-3xl leading-none" style={{ opacity: i < 3 ? 1 : 0.25 }}>{emoji}</span>
            ))}
          </div>
        </div>
      );
    }

    case 'quest_lead': {
      const fields = (p.fields as LeadFieldDef[]) || [];
      return (
        <div className="mx-4 my-3 bg-white shadow-sm p-6" style={{ borderRadius: br }}>
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="fp-heading" />
          <RichEd v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Deine Kontaktdaten…" cl="text-slate-500 text-sm mt-1 block" />
          <div className="space-y-3 mt-4">
            {onUpdate ? (
              <InlineLeadFields fields={fields} onChange={(f) => onUpdate({ fields: f })} />
            ) : (
              <StaticFieldRows fields={fields} br={br} />
            )}
          </div>
          <button disabled className="w-full mt-4 py-3.5 font-semibold text-sm text-white text-center disabled:opacity-100 cursor-default" style={{ borderRadius: br, background: primary }}>
            {(p.buttonText as string) || <span style={{ opacity: 0.3 }}>Jetzt bewerben</span>}
          </button>
        </div>
      );
    }

    // ── BerufsCheck ────────────────────────────────────────────────────────────

    case 'check_intro':
      return (
        <div className="px-6 py-10 text-white text-center min-h-[220px] flex flex-col justify-center" style={{ background: primary }}>
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Intro" cl="font-bold text-2xl leading-tight mb-2 block" />
          <RichEd v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-sm text-white/70 mb-6 block" />
          <div>
            <span className="inline-block px-8 py-3 bg-white text-sm font-semibold" style={{ borderRadius: br, color: primary }}>
              <Ed v={(p.buttonText as string) ?? ''} up={up?.('buttonText')} ph="Jetzt starten" cl="" />
            </span>
          </div>
        </div>
      );

    case 'check_vorname':
      return (
        <div className="mx-4 my-3 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie heißt du?" cl="fp-heading mb-4 block" />
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
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Frage?" cl="fp-heading mb-4 block" />
          {isSlider ? (
            <div>
              <div className="h-3 bg-slate-100 rounded-full relative">
                <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow" style={{ background: primary }} />
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
          <RichEd v={(p.question as string) ?? ''} up={up?.('question')} ph="Wie schätzt du dich ein?" cl="fp-heading mb-4 block" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex-shrink-0">{(p.sliderLabelMin as string) || '0'}</span>
            <div className="flex-1 h-3 bg-slate-200 rounded-full relative">
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow" style={{ background: primary }} />
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{(p.sliderLabelMax as string) || '10'}</span>
          </div>
        </div>
      );

    case 'check_lead': {
      const fields = (p.fields as { id: string; label: string; placeholder?: string }[]) || [];
      const rows = fields.length > 0 ? fields : [{ id: 'fallback', label: 'E-Mail', placeholder: 'E-Mail-Adresse' }];
      return (
        <div className="px-5 py-5 bg-rose-50 border-t-2 border-rose-100">
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Kontakt" cl="fp-heading mb-3 block" />
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
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Dein Ergebnis!" cl="fp-heading mb-3 block" />
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
        <div className="px-6 py-10 text-white min-h-[200px] flex flex-col justify-center" style={{ background: primary }}>
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Hero" cl="font-bold text-2xl mb-2 block" />
          <RichEd v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Untertext" cl="text-sm text-white/70 mb-6 block" />
          <span className="inline-block px-6 py-3 bg-white text-sm font-semibold self-start" style={{ borderRadius: br, color: primary }}>
            <Ed v={(p.ctaText as string) ?? ''} up={up?.('ctaText')} ph="CTA" cl="" />
          </span>
        </div>
      );

    case 'form_text':
      return (
        <div className="px-5 py-4">
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Überschrift (optional)" cl="fp-heading mb-2 block" />
          <RichEd v={(p.content as string) ?? ''} up={up?.('content')} ph="Text…" cl="text-sm text-slate-600 leading-relaxed" />
        </div>
      );

    case 'form_image':
      return (
        <div className="overflow-hidden">
          {p.imageUrl
            ? <img src={p.imageUrl as string} alt="" className="w-full object-cover" />
            : <div className="bg-slate-100 h-36 flex items-center justify-center"><ImageIcon size={32} className="text-slate-300" /></div>
          }
        </div>
      );

    case 'form_step': {
      const fields = (p.fields as { id: string; label: string }[]) || [];
      return (
        <div className="px-5 py-4">
          <RichEd v={(p.title as string) ?? ''} up={up?.('title')} ph="Schritt" cl="fp-heading mb-3 block" />
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
      const fields = (p.fields as LeadFieldDef[]) || [];
      return (
        <div className="mx-4 my-3 bg-white shadow-sm p-6" style={{ borderRadius: br }}>
          <RichEd v={(p.headline as string) ?? ''} up={up?.('headline')} ph="Interessiert?" cl="fp-heading" />
          <RichEd v={(p.subtext as string) ?? ''} up={up?.('subtext')} ph="Deine Kontaktdaten…" cl="text-slate-500 text-sm mt-1 block" />
          <div className="space-y-3 mt-4">
            {onUpdate ? (
              <InlineLeadFields fields={fields} onChange={(f) => onUpdate({ fields: f })} />
            ) : (
              <StaticFieldRows fields={fields} br={br} />
            )}
          </div>
          <button disabled className="w-full mt-4 py-3.5 font-semibold text-sm text-white text-center disabled:opacity-100 cursor-default" style={{ borderRadius: br, background: primary }}>
            {(p.buttonText as string) || <span style={{ opacity: 0.3 }}>Jetzt bewerben</span>}
          </button>
        </div>
      );
    }

    default:
      return <div className="px-5 py-4 text-xs text-slate-400 font-mono">{node.type}</div>;
  }
}
