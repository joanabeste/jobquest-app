'use client';

/**
 * RichTextEditor
 * Shared contentEditable rich text editor used in Inspector and EmailConfigModal.
 *
 * Props:
 *  value      – HTML string
 *  onChange   – called with new HTML on every input
 *  variables  – list of variables; clicking a chip inserts @key,
 *               typing @ opens an autocomplete dropdown
 *  minHeight  – min-height of editable area (default 80px)
 */

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, List, Palette, Link2, X } from 'lucide-react';
import type { VariableDef } from '@/lib/funnel-variables';

interface Props {
  value: string;
  onChange: (html: string) => void;
  variables?: VariableDef[];
  minHeight?: number;
}

const SIZES = [
  { label: 'XS', val: '1' },
  { label: 'S',  val: '2' },
  { label: 'M',  val: '3' },
  { label: 'L',  val: '5' },
];

export default function RichTextEditor({ value, onChange, variables = [], minHeight = 80 }: Props) {
  const editorRef    = useRef<HTMLDivElement>(null);
  const skipRef      = useRef(false);
  const colorRef     = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const savedRange   = useRef<Range | null>(null);

  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl]   = useState('https://');

  // @ mention state
  const [mentionFilter, setMentionFilter] = useState('');
  const [showMention, setShowMention]     = useState(false);
  const [mentionPos, setMentionPos]       = useState<{ top: number; left: number } | null>(null);
  const [mentionIdx, setMentionIdx]       = useState(0);

  const filteredVars = variables.filter(
    (v) =>
      v.key.toLowerCase().startsWith(mentionFilter.toLowerCase()) ||
      v.label.toLowerCase().startsWith(mentionFilter.toLowerCase()),
  );

  useEffect(() => {
    if (!editorRef.current || skipRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value ?? '';
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  }

  function emit() {
    if (!editorRef.current) return;
    skipRef.current = true;
    onChange(editorRef.current.innerHTML);
    requestAnimationFrame(() => { skipRef.current = false; });
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  // ── @ mention detection ────────────────────────────────────────────────────
  function detectMention() {
    if (variables.length === 0) { setShowMention(false); return; }

    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) { setShowMention(false); return; }

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) { setShowMention(false); return; }

    const textBefore = (range.startContainer.textContent ?? '').slice(0, range.startOffset);
    const match = textBefore.match(/@(\w*)$/);

    if (!match) { setShowMention(false); return; }

    setMentionFilter(match[1]);
    setMentionIdx(0);

    try {
      const caretRect = range.getBoundingClientRect();
      if (caretRect.height === 0) { setShowMention(false); return; }
      const DROPDOWN_W = 220;
      const left = Math.max(4, Math.min(caretRect.left, window.innerWidth - DROPDOWN_W - 4));
      setMentionPos({ top: caretRect.bottom + 6, left });
      setShowMention(true);
    } catch { setShowMention(false); }
  }

  function applyMention(key: string) {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;

    const textNode = range.startContainer as Text;
    const text = textNode.textContent ?? '';
    const before = text.slice(0, range.startOffset);
    const match = before.match(/@(\w*)$/);
    if (!match) return;

    const from = range.startOffset - match[0].length;
    textNode.textContent = text.slice(0, from) + '@' + key + text.slice(range.startOffset);

    const newRange = document.createRange();
    newRange.setStart(textNode, from + 1 + key.length);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setShowMention(false);
    editorRef.current?.focus();
    emit();
  }

  // ── Link editor ────────────────────────────────────────────────────────────
  function openLinkEditor() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if ((node as HTMLElement).tagName === 'A') {
          setLinkUrl((node as HTMLAnchorElement).href || 'https://');
          break;
        }
        node = node.parentNode;
      }
    }
    setShowMention(false);
    setLinkMode(true);
    requestAnimationFrame(() => {
      linkInputRef.current?.select();
      linkInputRef.current?.focus();
    });
  }

  function confirmLink() {
    const url = linkUrl.trim();
    if (!url || url === 'https://') return;
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('createLink', false, url);
    editorRef.current?.querySelectorAll('a').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    emit();
    closeLinkMode();
  }

  function removeLink() {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('unlink');
    emit();
    closeLinkMode();
  }

  function closeLinkMode() {
    setLinkMode(false);
    setLinkUrl('https://');
  }

  function insertVariable(key: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertText', false, `@${key}`);
    emit();
  }

  // ── Key handling in editable area ─────────────────────────────────────────
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!showMention || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIdx((i) => (i + 1) % filteredVars.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIdx((i) => (i - 1 + filteredVars.length) % filteredVars.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyMention(filteredVars[mentionIdx].key);
    } else if (e.key === 'Escape') {
      setShowMention(false);
    }
  }

  const btn = 'p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
      {/* Toolbar */}
      {linkMode ? (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-violet-50 border-b border-violet-200">
          <Link2 size={12} className="text-violet-400 flex-shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); confirmLink(); }
              if (e.key === 'Escape') { e.preventDefault(); closeLinkMode(); }
            }}
            placeholder="https://"
            className="flex-1 min-w-0 text-xs bg-transparent outline-none text-slate-800 placeholder-slate-400"
          />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); confirmLink(); }}
            className="px-2 py-0.5 text-xs font-semibold bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors flex-shrink-0">
            OK
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); removeLink(); }}
            className="px-2 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0">
            Entfernen
          </button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); closeLinkMode(); }}
            className={btn} title="Abbrechen">
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 bg-slate-50 border-b border-slate-200">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={btn} title="Fett"><Bold size={12} /></button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={btn} title="Kursiv"><Italic size={12} /></button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={btn} title="Unterstrichen"><Underline size={12} /></button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          {SIZES.map((sz) => (
            <button key={sz.val} type="button"
              onMouseDown={(e) => { e.preventDefault(); exec('fontSize', sz.val); }}
              className={`${btn} text-[10px] font-semibold px-1.5`}
              title={`Größe ${sz.label}`}>
              {sz.label}
            </button>
          ))}

          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); colorRef.current?.click(); }}
            className={btn} title="Textfarbe">
            <Palette size={12} />
          </button>
          <input ref={colorRef} type="color" defaultValue="#000000"
            onChange={(e) => exec('foreColor', e.target.value)}
            className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />

          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); openLinkEditor(); }}
            className={btn} title="Link einfügen / bearbeiten">
            <Link2 size={12} />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={btn} title="Aufzählung"><List size={12} /></button>

          {variables.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200 mx-0.5" />
              {variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key); }}
                  className="px-1.5 py-0.5 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-700 font-mono text-[10px] font-semibold transition-colors"
                  title={`Variable einfügen: ${v.label}`}
                >
                  @{v.key}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { emit(); detectMention(); }}
        onKeyDown={handleEditorKeyDown}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="p-2 outline-none [&_a]:text-violet-600 [&_a]:underline [&_a]:cursor-pointer"
        style={{ minHeight }}
      />

      {/* @ mention dropdown (portal) */}
      {showMention && mentionPos && filteredVars.length > 0 && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ position: 'fixed', top: mentionPos.top, left: mentionPos.left, zIndex: 9999, minWidth: 180 }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variable einfügen</span>
            </div>
            {filteredVars.map((v, i) => (
              <button
                key={v.key}
                onMouseDown={(e) => { e.preventDefault(); applyMention(v.key); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  i === mentionIdx ? 'bg-violet-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-violet-600 font-mono text-xs font-semibold">@{v.key}</span>
                <span className="text-xs text-slate-400">{v.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      }
    </div>
  );
}
