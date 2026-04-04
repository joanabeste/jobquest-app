'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  AlignLeft, ArrowDown, ArrowUp, CheckSquare, ChevronDown,
  Lock, LockOpen, Mail, Phone, Plus, Type, X,
} from 'lucide-react';
import type { LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';
import type { VariableDef } from '@/lib/funnel-variables';
import { CONTEXT_VARIABLES } from '@/lib/funnel-variables';
import { useCi } from '@/lib/ci-context';
import { useAuth } from '@/contexts/AuthContext';
import { useFunnelEditorCtx } from './FunnelEditorContext';

// Variables available in checkbox labels (context-only — no lead-field vars)
const CHECKBOX_VARS: VariableDef[] = CONTEXT_VARIABLES;

export const LEAD_FIELD_META: Record<LeadFieldType, { label: string; icon: React.ElementType; color: string }> = {
  text:     { label: 'Text',       icon: Type,        color: 'text-blue-500'   },
  email:    { label: 'E-Mail',     icon: Mail,        color: 'text-violet-500' },
  tel:      { label: 'Telefon',    icon: Phone,       color: 'text-green-500'  },
  textarea: { label: 'Mehrzeilig', icon: AlignLeft,   color: 'text-amber-500'  },
  checkbox: { label: 'Checkbox',   icon: CheckSquare, color: 'text-rose-500'   },
  select:   { label: 'Dropdown',   icon: ChevronDown, color: 'text-slate-500'  },
};

export const LEAD_FIELD_TYPES = Object.keys(LEAD_FIELD_META) as LeadFieldType[];

// Apply only the variables that have a known value — leave unknowns as-is.
function applyPreviewVars(html: string, vars: Record<string, string>): string {
  return html.replace(/(<[^>]*>)|@(\w+)/g, (match, tag, key) => {
    if (tag) {
      // Inside HTML attributes (e.g. href="@datenschutzUrl"), substitute too
      return tag.replace(/@(\w+)/g, (_m: string, k: string) => vars[k] ?? _m);
    }
    return key && key in vars ? vars[key] : match;
  });
}

// Wrap remaining @key references as a styled chip for visual clarity.
function highlightVars(html: string): string {
  return html.replace(/(<[^>]*>)|@(\w+)/g, (match, tag, key) => {
    if (tag) return tag;
    return `<span style="background:#ede9fe;color:#7c3aed;border-radius:3px;padding:1px 4px;font-size:10px;font-weight:600;white-space:nowrap">@${key}</span>`;
  });
}

// ─── Inline rich text area for checkbox labels (with @ mention) ──────────────
interface CheckboxEditorProps {
  value: string;
  onChange: (html: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

function CheckboxEditor({ value, onChange, editorRef }: CheckboxEditorProps) {
  const [mentionFilter, setMentionFilter] = useState('');
  const [showMention, setShowMention]     = useState(false);
  const [mentionPos, setMentionPos]       = useState<{ top: number; left: number } | null>(null);
  const [mentionIdx, setMentionIdx]       = useState(0);

  const filtered = CHECKBOX_VARS.filter(
    (v) =>
      v.key.toLowerCase().startsWith(mentionFilter.toLowerCase()) ||
      v.label.toLowerCase().startsWith(mentionFilter.toLowerCase()),
  );

  // Mount: initialize innerHTML and place cursor at end
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = value ?? '';
    editorRef.current.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes (e.g. Inspector sidebar edit) when NOT focused
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML === value) return;
    el.innerHTML = value ?? '';
  }, [value, editorRef]);

  function detectMention() {
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
      const rect = range.getBoundingClientRect();
      if (rect.height === 0) { setShowMention(false); return; }
      const DROPDOWN_W = 220;
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - DROPDOWN_W - 4));
      setMentionPos({ top: rect.bottom + 6, left });
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
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showMention || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % filtered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + filtered.length) % filtered.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filtered[mentionIdx].key); }
    else if (e.key === 'Escape') { setShowMention(false); }
  }

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (editorRef.current) onChange(editorRef.current.innerHTML); detectMention(); }}
        onKeyDown={handleKeyDown}
        className="flex-1 text-xs text-slate-700 outline-none leading-relaxed [&_a]:underline [&_a]:text-violet-500 [&_strong]:font-semibold min-h-[1em]"
      />
      {showMention && mentionPos && filtered.length > 0 && typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ position: 'fixed', top: mentionPos.top, left: mentionPos.left, zIndex: 9999, minWidth: 200 }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Variable einfügen</span>
            </div>
            {filtered.map((v, i) => (
              <button
                key={v.key}
                onMouseDown={(e) => { e.preventDefault(); applyMention(v.key); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${i === mentionIdx ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
              >
                <span className="text-violet-600 font-mono text-xs font-semibold">@{v.key}</span>
                <span className="text-xs text-slate-400">{v.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )
      }
    </>
  );
}

// ─── Shared reorder + required + delete toolbar section ───────────────────────
function FieldToolbar({
  fieldId, idx, total,
  required, onMove, onToggleRequired, onRemove,
}: {
  fieldId: string; idx: number; total: number;
  required: boolean;
  onMove: (dir: -1 | 1) => void;
  onToggleRequired: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      {/* Reorder — leftmost, visually grouped */}
      <div className="flex items-center bg-slate-100 rounded-md flex-shrink-0">
        <button
          onMouseDown={(e) => { e.preventDefault(); onMove(-1); }}
          disabled={idx === 0}
          className="p-0.5 rounded-l-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
          title="Nach oben"
        >
          <ArrowUp size={10} />
        </button>
        <div className="w-px h-3 bg-slate-200" />
        <button
          onMouseDown={(e) => { e.preventDefault(); onMove(1); }}
          disabled={idx === total - 1}
          className="p-0.5 rounded-r-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
          title="Nach unten"
        >
          <ArrowDown size={10} />
        </button>
      </div>

      <div className="w-px h-3 bg-slate-200 flex-shrink-0" />

      {/* Required toggle */}
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleRequired(); }}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
        title={required ? 'Pflichtfeld (klicken zum Deaktivieren)' : 'Optional (klicken zum Aktivieren)'}
      >
        {required
          ? <><Lock size={10} className="text-violet-500" /><span className="text-[10px] text-violet-500 font-medium">Pflicht</span></>
          : <><LockOpen size={10} className="text-slate-400" /><span className="text-[10px] text-slate-400">Optional</span></>
        }
      </button>

      <div className="w-px h-3 bg-slate-200 flex-shrink-0" />

      {/* Delete */}
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
        title="Feld entfernen"
      >
        <X size={10} />
      </button>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  fields: LeadFieldDef[];
  onChange: (fields: LeadFieldDef[]) => void;
}

export default function InlineLeadFields({ fields, onChange }: Props) {
  const { br } = useCi();
  const radius = br || '8px';
  const { selectedFieldId, setSelectedFieldId } = useFunnelEditorCtx();
  const { company } = useAuth();

  // Build vars for canvas preview — only context variables with real values
  const previewVars: Record<string, string> = {
    companyName:    company?.name ?? '',
    datenschutzUrl: company?.privacyUrl ?? '#',
    impressumUrl:   company?.imprintUrl ?? '#',
  };

  // Single ref for the currently-active checkbox contentEditable
  const activeEditorRef = useRef<HTMLDivElement>(null);

  function update(id: string, patch: Partial<LeadFieldDef>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function remove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function move(id: string, dir: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    const arr = [...fields];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  }

  function addField() {
    const n: LeadFieldDef = { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false };
    onChange([...fields, n]);
    setSelectedFieldId(n.id);
  }

  return (
    <div className="space-y-2.5">
      {fields.map((f, idx) => {
        const isActive = selectedFieldId === f.id;
        const meta = LEAD_FIELD_META[f.type];
        const Icon = meta.icon;

        // ── Checkbox field ──────────────────────────────────────────────────
        if (f.type === 'checkbox') {
          return (
            <div key={f.id} className="relative">
              {isActive && (
                <div
                  className="absolute -top-9 left-0 right-0 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 z-30 shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Type indicator (non-interactive for checkbox) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Icon size={11} className={meta.color} />
                    <span className="text-[11px] font-medium text-slate-500">{meta.label}</span>
                  </div>

                  <div className="w-px h-3 bg-slate-200 mx-1 flex-shrink-0" />

                  {/* Switch type */}
                  <select
                    value={f.type}
                    onChange={(e) => update(f.id, { type: e.target.value as LeadFieldType })}
                    className="text-[11px] text-slate-400 bg-transparent border-none outline-none cursor-pointer flex-shrink-0"
                    title="Typ ändern"
                  >
                    {LEAD_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
                    ))}
                  </select>

                  <div className="flex-1" />

                  <FieldToolbar
                    fieldId={f.id} idx={idx} total={fields.length}
                    required={f.required}
                    onMove={(dir) => move(f.id, dir)}
                    onToggleRequired={() => update(f.id, { required: !f.required })}
                    onRemove={() => remove(f.id)}
                  />
                </div>
              )}

              <div
                onClick={() => !isActive && setSelectedFieldId(f.id)}
                className={`flex items-start gap-2.5 w-full px-3 py-2.5 border-2 transition-all
                  ${isActive
                    ? 'border-violet-400 bg-violet-50/40 shadow-sm shadow-violet-100 cursor-default'
                    : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                  }`}
                style={{ borderRadius: radius }}
              >
                <input type="checkbox" disabled className="mt-0.5 flex-shrink-0 opacity-40" />
                {isActive ? (
                  <CheckboxEditor
                    value={f.label}
                    onChange={(html) => update(f.id, { label: html })}
                    editorRef={activeEditorRef}
                  />
                ) : (
                  <span
                    className="text-xs text-slate-400 leading-relaxed [&_a]:underline [&_a]:text-violet-400 [&_a]:pointer-events-none [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{
                      __html: highlightVars(applyPreviewVars(sanitizeHtml(f.label), previewVars)) + (f.required ? ' <span class="text-rose-400 ml-0.5">*</span>' : ''),
                    }}
                  />
                )}
              </div>
            </div>
          );
        }

        // ── Text / email / tel / textarea / select ──────────────────────────
        return (
          <div key={f.id} className="relative">
            {isActive && (
              <div
                className="absolute -top-9 left-0 right-0 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 z-30 shadow-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Reorder + required + delete */}
                <FieldToolbar
                  fieldId={f.id} idx={idx} total={fields.length}
                  required={f.required}
                  onMove={(dir) => move(f.id, dir)}
                  onToggleRequired={() => update(f.id, { required: !f.required })}
                  onRemove={() => remove(f.id)}
                />

                <div className="w-px h-3 bg-slate-200 flex-shrink-0" />

                {/* Type selector */}
                <Icon size={11} className={`flex-shrink-0 ${meta.color}`} />
                <select
                  value={f.type}
                  onChange={(e) => {
                    const t = e.target.value as LeadFieldType;
                    update(f.id, {
                      type: t,
                      options: t === 'select' ? (f.options ?? ['Option 1', 'Option 2']) : f.options,
                    });
                  }}
                  className="flex-1 text-[11px] font-medium text-slate-600 bg-transparent border-none outline-none cursor-pointer min-w-0"
                >
                  {LEAD_FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
                  ))}
                </select>
              </div>
            )}

            <div
              onClick={() => !isActive && setSelectedFieldId(f.id)}
              className={`flex items-center gap-2 w-full px-3 border-2 text-sm transition-all cursor-pointer
                ${f.type === 'textarea' ? 'py-2 min-h-[72px] items-start' : 'py-2.5'}
                ${isActive
                  ? 'border-violet-400 bg-violet-50/40 shadow-sm shadow-violet-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              style={{ borderRadius: radius }}
            >
              {isActive && <Icon size={13} className={`flex-shrink-0 mt-0.5 ${meta.color}`} />}
              {isActive ? (
                <input
                  autoFocus
                  value={f.label}
                  onChange={(e) => update(f.id, { label: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setSelectedFieldId(null); }}
                  placeholder="Feldname…"
                  className="flex-1 bg-transparent text-slate-700 font-medium outline-none placeholder:text-slate-300 text-sm"
                />
              ) : (
                <span className="flex-1 text-slate-400 select-none">
                  {f.placeholder || f.label}{f.required ? ' *' : ''}
                </span>
              )}
            </div>

            {isActive && f.type === 'select' && (
              <div className="mt-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Optionen (eine pro Zeile)</p>
                <textarea
                  value={(f.options ?? []).join('\n')}
                  onChange={(e) => update(f.id, { options: e.target.value.split('\n') })}
                  rows={3}
                  className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-300 resize-none placeholder:text-slate-300"
                  placeholder={'Option 1\nOption 2\nOption 3'}
                />
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addField}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 text-xs text-slate-400 font-medium hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/40 transition-all rounded-xl"
      >
        <Plus size={11} /> Feld hinzufügen
      </button>
    </div>
  );
}
