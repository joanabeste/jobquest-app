'use client';

/**
 * RichTextEditor
 * Shared contentEditable rich text editor used in Inspector and EmailConfigModal.
 *
 * Props:
 *  value      – HTML string
 *  onChange   – called with new HTML on every input
 *  variables  – optional list of variables to show as clickable chips in the toolbar
 *               (clicking inserts @key at current cursor position)
 *  minHeight  – min-height of editable area (default 80px)
 */

import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, Palette, Link2 } from 'lucide-react';
import type { VariableDef } from '@/lib/funnel-variables';

interface Props {
  value: string;
  onChange: (html: string) => void;
  variables?: VariableDef[];
  minHeight?: number;
}

// Font-size options
const SIZES = [
  { label: 'XS', val: '1' },
  { label: 'S',  val: '2' },
  { label: 'M',  val: '3' },
  { label: 'L',  val: '5' },
];

export default function RichTextEditor({ value, onChange, variables = [], minHeight = 80 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const skipRef   = useRef(false);
  const colorRef  = useRef<HTMLInputElement>(null);
  // Store selection so variable chips (which steal focus) can restore it
  const savedRange = useRef<Range | null>(null);

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

  function handleInput() { emit(); }

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

  function insertLink() {
    const url = window.prompt('URL eingeben:', 'https://');
    if (!url) return;
    exec('createLink', url);
  }

  function insertVariable(key: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertText', false, `@${key}`);
    emit();
  }

  const btn = 'p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
      {/* Toolbar */}
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
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className={btn} title="Link einfügen"><Link2 size={12} /></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={btn} title="Aufzählung"><List size={12} /></button>

        {/* Variable chips */}
        {variables.length > 0 && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key); }}
                className="px-1.5 py-0.5 rounded bg-violet-100 hover:bg-violet-200 text-violet-700 font-mono text-[10px] font-semibold transition-colors"
                title={v.label}
              >
                @{v.key}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="p-2 outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}
