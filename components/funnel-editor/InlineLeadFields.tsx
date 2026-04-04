'use client';

import { useRef, useEffect } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  AlignLeft, Bold, CheckSquare, ChevronDown, Link2,
  Lock, LockOpen, Mail, Phone, Plus, Type, X,
} from 'lucide-react';
import type { LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';
import { useCi } from '@/lib/ci-context';
import { useFunnelEditorCtx } from './FunnelEditorContext';

export const LEAD_FIELD_META: Record<LeadFieldType, { label: string; icon: React.ElementType; color: string }> = {
  text:     { label: 'Text',       icon: Type,        color: 'text-blue-500'   },
  email:    { label: 'E-Mail',     icon: Mail,        color: 'text-violet-500' },
  tel:      { label: 'Telefon',    icon: Phone,       color: 'text-green-500'  },
  textarea: { label: 'Mehrzeilig', icon: AlignLeft,   color: 'text-amber-500'  },
  checkbox: { label: 'Checkbox',   icon: CheckSquare, color: 'text-rose-500'   },
  select:   { label: 'Dropdown',   icon: ChevronDown, color: 'text-slate-500'  },
};

export const LEAD_FIELD_TYPES = Object.keys(LEAD_FIELD_META) as LeadFieldType[];

// Renders @varName as a soft purple chip — only in TEXT nodes, not inside HTML attributes
const VAR_KEYS = new Set(['companyName', 'datenschutzUrl', 'impressumUrl', 'firstName', 'lastName', 'email', 'phone']);
function highlightVars(html: string): string {
  // Alternate: match full HTML tags (keep as-is) OR @key in text (replace)
  return html.replace(/(<[^>]*>)|@(\w+)/g, (match, tag, key) => {
    if (tag) return tag; // HTML tag — pass through untouched
    if (key && VAR_KEYS.has(key)) {
      return `<span style="background:#ede9fe;color:#7c3aed;border-radius:3px;padding:1px 4px;font-size:10px;font-weight:600;white-space:nowrap">@${key}</span>`;
    }
    return match;
  });
}

// ─── Inline rich text area for checkbox labels (no toolbar — controlled externally) ──
interface CheckboxEditorProps {
  value: string;
  onChange: (html: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

function CheckboxEditor({ value, onChange, editorRef }: CheckboxEditorProps) {
  // Capture initial value so the mount effect doesn't re-run when value changes
  const initialValue = useRef(value);

  // Initialize innerHTML ONCE on mount — never re-sync from props while the user is typing.
  // Syncing innerHTML from props during active editing resets the cursor and can crash.
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = initialValue.current ?? '';
    // Focus and place cursor at end
    editorRef.current.focus();
    try {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false); // collapse to end
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* ignore selection errors in edge cases */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — editorRef identity is stable

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        if (editorRef.current) onChange(editorRef.current.innerHTML);
      }}
      className="flex-1 text-xs text-slate-700 outline-none leading-relaxed [&_a]:underline [&_a]:text-violet-500 [&_strong]:font-semibold min-h-[1em]"
    />
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

  // Single ref for the currently-active checkbox contentEditable
  const activeEditorRef = useRef<HTMLDivElement>(null);

  function update(id: string, patch: Partial<LeadFieldDef>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function remove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  function addField() {
    const n: LeadFieldDef = { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false };
    onChange([...fields, n]);
    setSelectedFieldId(n.id);
  }

  // Formatting actions that operate on the active checkbox editor
  function execBold() {
    activeEditorRef.current?.focus();
    document.execCommand('bold');
    // emit is handled by onInput in CheckboxEditor
  }

  function insertLink(fieldId: string) {
    const url = window.prompt('URL:', 'https://');
    if (!url) return;
    activeEditorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('createLink', false, url);
      activeEditorRef.current?.querySelectorAll(`a[href="${url}"]`).forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    } else {
      document.execCommand('insertHTML', false,
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
    // Trigger onChange by reading current HTML
    if (activeEditorRef.current) {
      update(fieldId, { label: activeEditorRef.current.innerHTML });
    }
  }

  return (
    <div className="space-y-2.5">
      {fields.map((f) => {
        const isActive = selectedFieldId === f.id;
        const meta = LEAD_FIELD_META[f.type];
        const Icon = meta.icon;

        // ── Checkbox field ──────────────────────────────────────────────────
        if (f.type === 'checkbox') {
          return (
            <div key={f.id} className="relative">
              {/* Floating toolbar */}
              {isActive && (
                <div
                  className="absolute -top-9 left-0 right-0 flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 z-30 shadow-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon size={11} className={`flex-shrink-0 ${meta.color}`} />
                  <select
                    value={f.type}
                    onChange={(e) => update(f.id, { type: e.target.value as LeadFieldType })}
                    className="text-[11px] font-medium text-slate-600 bg-transparent border-none outline-none cursor-pointer"
                  >
                    {LEAD_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
                    ))}
                  </select>
                  <div className="flex-1" />
                  {/* Formatting: Bold + Link */}
                  <button
                    onMouseDown={(e) => { e.preventDefault(); execBold(); }}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Fett"
                  >
                    <Bold size={11} />
                  </button>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); insertLink(f.id); }}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Link einfügen"
                  >
                    <Link2 size={11} />
                  </button>
                  <div className="w-px h-3 bg-slate-200 mx-0.5" />
                  <button
                    onClick={() => update(f.id, { required: !f.required })}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    {f.required
                      ? <><Lock size={10} className="text-violet-500" /><span className="text-[10px] text-violet-500 font-medium">Pflicht</span></>
                      : <><LockOpen size={10} className="text-slate-400" /><span className="text-[10px] text-slate-400">Optional</span></>
                    }
                  </button>
                  <div className="w-px h-3 bg-slate-200 mx-0.5" />
                  <button
                    onClick={() => remove(f.id)}
                    className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* Checkbox row — same border style as text fields */}
              <div
                onClick={() => !isActive && setSelectedFieldId(f.id)}
                className={`flex items-start gap-2.5 w-full px-3 py-2.5 border-2 transition-all
                  ${isActive
                    ? 'border-violet-400 bg-violet-50/40 shadow-sm shadow-violet-100 cursor-default'
                    : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                  }
                `}
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
                    dangerouslySetInnerHTML={{ __html: highlightVars(sanitizeHtml(f.label)) + (f.required ? ' *' : '') }}
                  />
                )}
              </div>
            </div>
          );
        }

        // ── Text / select / etc. ────────────────────────────────────────────
        return (
          <div key={f.id} className="relative">
            {/* Floating toolbar */}
            {isActive && (
              <div
                className="absolute -top-9 left-0 right-0 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 z-30 shadow-md"
                onClick={(e) => e.stopPropagation()}
              >
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
                <div className="w-px h-3 bg-slate-200 flex-shrink-0" />
                <button
                  onClick={() => update(f.id, { required: !f.required })}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  {f.required
                    ? <><Lock size={10} className="text-violet-500" /><span className="text-[10px] text-violet-500 font-medium">Pflicht</span></>
                    : <><LockOpen size={10} className="text-slate-400" /><span className="text-[10px] text-slate-400">Optional</span></>
                  }
                </button>
                <div className="w-px h-3 bg-slate-200 flex-shrink-0" />
                <button
                  onClick={() => remove(f.id)}
                  className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Field — styled like a real input */}
            <div
              onClick={() => setSelectedFieldId(isActive ? null : f.id)}
              className={`flex items-center gap-2 w-full px-3 border-2 text-sm transition-all cursor-pointer
                ${f.type === 'textarea' ? 'py-2 min-h-[72px] items-start' : 'py-2.5'}
                ${isActive
                  ? 'border-violet-400 bg-violet-50/40 shadow-sm shadow-violet-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
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

            {/* Select options — inline below active field */}
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

      {/* Add field */}
      <button
        onClick={addField}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 text-xs text-slate-400 font-medium hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/40 transition-all rounded-xl"
      >
        <Plus size={11} /> Feld hinzufügen
      </button>
    </div>
  );
}
