'use client';

/**
 * VarInput / VarTextarea
 * Text inputs with @ mention support for template variables.
 * Type @ to see a dropdown of available variables, click to insert.
 *
 * Variables are passed via the `variables` prop — nothing is hardcoded here.
 * Use getAvailableVariables() from lib/funnel-variables to build the list.
 */

import { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { VariableDef } from '@/lib/funnel-variables';

// Re-export for backwards compatibility
export type { VariableDef };
export type TemplateVariable = VariableDef;

// ─── Shared mention logic ─────────────────────────────────────────────────────
function useVarMention(
  value: string,
  onChange: (v: string) => void,
  elRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  variables: VariableDef[],
) {
  const [showPicker, setShowPicker] = useState(false);
  const [filter, setFilter] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const filtered = variables.filter((v) =>
    v.key.toLowerCase().startsWith(filter.toLowerCase()) ||
    v.label.toLowerCase().startsWith(filter.toLowerCase()),
  );

  function detectMention(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
    const pos = el.selectionStart ?? val.length;
    const before = val.slice(0, pos);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setFilter(match[1]);
      const rect = el.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(e.target.value);
    detectMention(e.target, e.target.value);
  }

  const insertVar = useCallback((key: string) => {
    const el = elRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const match = before.match(/@(\w*)$/);
    if (!match) return;
    const from = pos - match[0].length;
    const newVal = value.slice(0, from) + '@' + key + value.slice(pos);
    onChange(newVal);
    setShowPicker(false);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = from + key.length + 1;
      el.focus();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onChange]);

  function dismiss() { setTimeout(() => setShowPicker(false), 120); }

  return { showPicker, dropdownPos, filtered, handleChange, insertVar, dismiss };
}

// ─── Dropdown portal ──────────────────────────────────────────────────────────
function VarDropdown({
  items, pos, onSelect,
}: {
  items: VariableDef[];
  pos: { top: number; left: number; width: number };
  onSelect: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variable einfügen</span>
      </div>
      {items.map((v) => (
        <button
          key={v.key}
          onMouseDown={(e) => { e.preventDefault(); onSelect(v.key); }}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-50 transition-colors text-left"
        >
          <span className="text-violet-600 font-mono text-xs font-semibold">@{v.key}</span>
          <span className="text-xs text-slate-400">{v.label}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

// ─── VarInput (single-line) ───────────────────────────────────────────────────
export function VarInput({
  value, onChange, placeholder, type = 'text', variables = [], className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  variables?: VariableDef[];
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { showPicker, dropdownPos, filtered, handleChange, insertVar, dismiss } =
    useVarMention(value, onChange, ref as React.RefObject<HTMLInputElement | HTMLTextAreaElement>, variables);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={type}
        className={className ?? 'input-field'}
        value={value}
        onChange={handleChange}
        onBlur={dismiss}
        onKeyDown={(e) => { if (e.key === 'Escape') dismiss(); }}
        placeholder={placeholder}
      />
      {showPicker && dropdownPos && (
        <VarDropdown items={filtered} pos={dropdownPos} onSelect={insertVar} />
      )}
    </div>
  );
}

// ─── VarTextarea (multi-line) ─────────────────────────────────────────────────
export function VarTextarea({
  value, onChange, placeholder, rows = 6, variables = [], className, mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  variables?: VariableDef[];
  className?: string;
  mono?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { showPicker, dropdownPos, filtered, handleChange, insertVar, dismiss } =
    useVarMention(value, onChange, ref as React.RefObject<HTMLInputElement | HTMLTextAreaElement>, variables);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        className={className ?? `input-field leading-relaxed resize-none ${mono ? 'font-mono text-xs' : 'text-sm'}`}
        rows={rows}
        value={value}
        onChange={handleChange}
        onBlur={dismiss}
        onKeyDown={(e) => { if (e.key === 'Escape') dismiss(); }}
        placeholder={placeholder}
      />
      {showPicker && dropdownPos && (
        <VarDropdown items={filtered} pos={dropdownPos} onSelect={insertVar} />
      )}
    </div>
  );
}
