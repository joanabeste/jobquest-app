'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Copy, MousePointer2, Lock, ChevronLeft, Crop } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { FunnelNode, FunnelStyle, FunnelPage, BLOCK_LABELS, LeadFieldDef, LeadFieldType } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';
import { VarInput, VarTextarea } from './VarInput';
import { type VariableDef, CONTEXT_VARIABLES, slugifyVar, deriveFieldVarMap } from '@/lib/funnel-variables';
import LeadFieldBuilder from './LeadFieldBuilder';
import { useFunnelEditorCtx } from './FunnelEditorContext';
import { LEAD_FIELD_META, LEAD_FIELD_TYPES } from './InlineLeadFields';
import { Field, NumberInput, ImageUploadField, Section } from './inspectors/shared';
import { DialogEditor } from './inspectors/DialogEditor';
import { DecisionEditor } from './inspectors/DecisionEditor';
import { QuizEditor } from './inspectors/QuizEditor';
import { FrageEditor, ErgebnisfrageEditor } from './inspectors/FrageEditor';
import { FormStepEditor } from './inspectors/FormStepEditor';

// ─── Crop modal ───────────────────────────────────────────────────────────────
type CropBox = { left: number; top: number; right: number; bottom: number };

const ASPECT_PRESETS = [
  { label: 'S', ratio: 1 },
  { label: 'M', ratio: 4 / 3 },
  { label: 'L', ratio: 16 / 9 },
  { label: 'XL', ratio: 21 / 9 },
];

function CropModal({ src, initial, onSave, onClose }: {
  src: string;
  initial: CropBox;
  onSave: (crop: CropBox) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState<CropBox>(initial);
  const [activeAspect, setActiveAspect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  type DragHandle = 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'draw';
  const drag = useRef<{ handle: DragHandle; startX: number; startY: number; startCrop: CropBox } | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const MIN = 5; // minimum crop dimension in %

  const applyAspect = useCallback((box: CropBox, ratio: number | null): CropBox => {
    if (!ratio) return box;
    const w = box.right - box.left;
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    const newH = w / ratio;
    return {
      left: clamp(cx - w / 2, 0, 100 - w),
      top: clamp(cy - newH / 2, 0, 100 - newH),
      right: clamp(cx + w / 2, w, 100),
      bottom: clamp(cy + newH / 2, newH, 100),
    };
  }, []);

  function startDrag(handle: DragHandle, e: React.MouseEvent, customStartCrop?: CropBox) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: customStartCrop ?? crop };

    function onMove(me: MouseEvent) {
      if (!drag.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((me.clientX - drag.current.startX) / rect.width) * 100;
      const dy = ((me.clientY - drag.current.startY) / rect.height) * 100;
      const s = drag.current.startCrop;
      let { left, top, right, bottom } = s;

      if (drag.current.handle === 'draw') {
        // s.left/top = click origin in %; expand to current pointer position
        const ox = s.left, oy = s.top;
        const cx = clamp(ox + dx, 0, 100);
        const cy = clamp(oy + dy, 0, 100);
        left   = Math.min(ox, cx);
        top    = Math.min(oy, cy);
        right  = Math.max(ox, cx);
        bottom = Math.max(oy, cy);
      } else if (drag.current.handle === 'move') {
        const w = s.right - s.left, h = s.bottom - s.top;
        left   = clamp(s.left  + dx, 0, 100 - w);
        top    = clamp(s.top   + dy, 0, 100 - h);
        right  = left + w;
        bottom = top + h;
      } else {
        if (drag.current.handle === 'nw' || drag.current.handle === 'sw') left   = clamp(s.left   + dx, 0, s.right  - MIN);
        if (drag.current.handle === 'ne' || drag.current.handle === 'se') right  = clamp(s.right  + dx, s.left   + MIN, 100);
        if (drag.current.handle === 'nw' || drag.current.handle === 'ne') top    = clamp(s.top    + dy, 0, s.bottom - MIN);
        if (drag.current.handle === 'sw' || drag.current.handle === 'se') bottom = clamp(s.bottom + dy, s.top    + MIN, 100);
      }

      let next: CropBox = {
        left:   Math.round(left),
        top:    Math.round(top),
        right:  Math.round(right),
        bottom: Math.round(bottom),
      };
      const ratio = ASPECT_PRESETS.find((a) => a.label === activeAspect)?.ratio ?? null;
      if (ratio && drag.current.handle !== 'move') next = applyAspect(next, ratio);
      setCrop(next);
    }
    function onUp() {
      drag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startDrawFromContainer(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ox = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const oy = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const origin: CropBox = { left: ox, top: oy, right: ox, bottom: oy };
    startDrag('draw', e, origin);
  }

  function selectAspect(label: string) {
    const ratio = ASPECT_PRESETS.find((a) => a.label === label)!.ratio;
    setActiveAspect(label);
    setCrop((prev) => applyAspect(prev, ratio));
  }

  const hCls = 'absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm z-20 -translate-x-1/2 -translate-y-1/2';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Bild zuschneiden</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">Abbrechen</button>
            <button onClick={() => onSave(crop)} className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">Speichern</button>
          </div>
        </div>

        {/* Aspect ratio tabs */}
        <div className="grid grid-cols-4 gap-2 px-6 pb-4">
          {ASPECT_PRESETS.map((a) => (
            <button key={a.label} onClick={() => selectAspect(a.label)}
              className={`py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${activeAspect === a.label ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Image + crop overlay */}
        <div className="px-6 pb-6 overflow-auto">
          <div ref={containerRef} className="relative select-none overflow-hidden rounded-xl bg-slate-100"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDrawFromContainer}
          >
            <img src={src} alt="" className="w-full block pointer-events-none" draggable={false} />

            {/* Dark mask outside crop */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: `${crop.top}%` }} />
              <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: `${100 - crop.bottom}%` }} />
              <div className="absolute bg-black/45" style={{ top: `${crop.top}%`, bottom: `${100 - crop.bottom}%`, left: 0, width: `${crop.left}%` }} />
              <div className="absolute bg-black/45" style={{ top: `${crop.top}%`, bottom: `${100 - crop.bottom}%`, right: 0, width: `${100 - crop.right}%` }} />
            </div>

            {/* Crop rectangle */}
            <div
              className="absolute border-2 border-white"
              style={{ left: `${crop.left}%`, top: `${crop.top}%`, right: `${100 - crop.right}%`, bottom: `${100 - crop.bottom}%`, cursor: 'move' }}
              onMouseDown={(e) => startDrag('move', e)}
            >
              {/* Rule-of-thirds lines */}
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.25) 1px,transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }} />
              {/* Dashed border overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ border: '1.5px dashed rgba(255,255,255,0.6)' }} />
            </div>

            {/* Corner handles */}
            <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.left}%`, top: `${crop.top}%` }}       onMouseDown={(e) => startDrag('nw', e)} />
            <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.right}%`, top: `${crop.top}%` }}      onMouseDown={(e) => startDrag('ne', e)} />
            <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.left}%`, top: `${crop.bottom}%` }}    onMouseDown={(e) => startDrag('sw', e)} />
            <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.right}%`, top: `${crop.bottom}%` }}   onMouseDown={(e) => startDrag('se', e)} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface InspectorProps {
  node: FunnelNode | null;
  isLocked?: boolean;
  onUpdate: (patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  extraPanel?: React.ReactNode;
  pages?: FunnelPage[];
  currentPage?: FunnelPage;
  onUpdatePage?: (patch: Partial<FunnelPage>) => void;
  /** All variables available in this funnel (from getAvailableVariables) */
  availableVars?: VariableDef[];
}

export default function Inspector({ node, isLocked, onUpdate, onDelete, onDuplicate, extraPanel, pages, currentPage, onUpdatePage, availableVars = CONTEXT_VARIABLES }: InspectorProps) {
  const [tab, setTab] = useState<'props' | 'style' | 'page'>('props');

  // When a block is selected switch to props tab; when deselected switch to page tab
  useEffect(() => {
    if (node) {
      setTab('props');
    } else {
      setTab('page');
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = node ? (node.kind === 'block' ? BLOCK_LABELS[node.type] : 'Layout') : null;
  const blockMeta = node?.kind === 'block' ? BLOCK_META[node.type] : null;
  const props = node?.kind === 'block' ? node.props : {};
  const style = node?.style ?? {};

  function updateProps(patch: Record<string, unknown>) {
    onUpdate({ props: patch });
  }
  function updateStyle(patch: Partial<FunnelStyle>) {
    onUpdate({ style: patch });
  }

  return (
    <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">

      {/* Header – only when block selected */}
      {node && (
        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
          {blockMeta && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${blockMeta.bg}`}>
              {(() => { const Icon = blockMeta.icon; return <Icon size={13} className={blockMeta.color} />; })()}
            </div>
          )}
          <p className="flex-1 text-sm font-semibold text-slate-800 truncate">{label}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isLocked ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-violet-50 rounded-lg text-[10px] font-medium text-violet-600">
                <Lock size={10} /> Gesperrt
              </span>
            ) : (
              <>
                <button onClick={onDuplicate} title="Duplizieren (⌘D)"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                  <Copy size={13} />
                </button>
                <button onClick={onDelete} title="Löschen (Backspace)"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-100 flex-shrink-0">
        {node && <TabBtn active={tab === 'props'} onClick={() => setTab('props')}>Inhalt</TabBtn>}
        {node?.kind === 'block' && <TabBtn active={tab === 'style'} onClick={() => setTab('style')}>Darstellung</TabBtn>}
        <TabBtn active={tab === 'page'} onClick={() => setTab('page')}>Seite</TabBtn>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'page' ? (
          <PageSettingsEditor currentPage={currentPage} pages={pages} onUpdate={onUpdatePage} />
        ) : tab === 'props' && node ? (
          node.kind === 'layout' ? (
            <div className="p-4">
              <StyleEditor style={style} onChange={updateStyle} />
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Spalten</p>
                {node.columns.map((col, i) => (
                  <div key={col.id} className="flex items-center justify-between py-1.5 text-xs text-slate-600">
                    <span>Spalte {i + 1}</span>
                    <span className="text-slate-400">{col.nodes.length} Blöcke</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <BlockPropsEditor node={node} props={props} onChange={updateProps} pages={pages} availableVars={availableVars} />
            </div>
          )
        ) : tab === 'style' && node?.kind === 'block' ? (
          <div className="p-4">
            <StyleEditor style={style} onChange={updateStyle} />
          </div>
        ) : !node ? (
          <div className="flex flex-col items-center justify-center text-center px-5 py-10 gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <MousePointer2 size={18} className="text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Block auswählen</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Klick auf einen Block im Canvas, um ihn zu bearbeiten.</p>
            </div>
            <p className="text-[10px] text-slate-300 mt-1">Neue Blöcke über [+] im Canvas einfügen</p>
          </div>
        ) : null}

        {extraPanel && (
          <div className="border-t border-slate-100 p-4">
            {extraPanel}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
        active ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}>
      {children}
    </button>
  );
}

// ─── Page settings editor ───────────────────────────────────────────────────
function PageSettingsEditor({ currentPage, pages, onUpdate }: { currentPage?: FunnelPage | undefined; pages?: FunnelPage[]; onUpdate?: (p: Partial<FunnelPage>) => void }) {
  if (!currentPage) return <div className="p-4 text-sm text-slate-400">Keine Seiten-Einstellungen verfügbar.</div>;

  const pageIdx = pages?.findIndex((p) => p.id === currentPage.id) ?? -1;
  const sequentialNextId = pages?.[pageIdx + 1]?.id ?? '';
  // Effective target: explicit override, or sequential default, or empty (last page)
  const effectiveNextId = currentPage.nextPageId ?? sequentialNextId;
  const isCustom = Boolean(currentPage.nextPageId) && currentPage.nextPageId !== sequentialNextId;

  function handleNextChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value;
    // If user picks the sequential default, clear the override
    onUpdate?.({ nextPageId: selected === sequentialNextId ? undefined : (selected || undefined) });
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="label">Seitenname</label>
        <input className="input-field" value={currentPage.name} onChange={(e) => onUpdate?.({ name: e.target.value })} />
      </div>
      <div>
        <label className="label">Nächste Seite</label>
        <select className="input-field" value={effectiveNextId} onChange={handleNextChange}>
          {pages?.filter((p) => p.id !== currentPage.id).map((p, _) => {
            const i = pages!.indexOf(p);
            return (
              <option key={p.id} value={p.id}>
                {p.name || `Seite ${i + 1}`}{p.id === sequentialNextId ? ' (Standard)' : ''}
              </option>
            );
          })}
          {!sequentialNextId && <option value="">— Letzter Schritt —</option>}
        </select>
        {isCustom && (
          <p className="text-[10px] text-violet-600 mt-1.5 flex items-center gap-1">
            Benutzerdefinierte Reihenfolge aktiv
            <button
              onClick={() => onUpdate?.({ nextPageId: undefined })}
              className="underline hover:text-violet-800"
            >
              zurücksetzen
            </button>
          </p>
        )}
      </div>
    </div>
  );
}


function StyleEditor({ style, onChange }: { style: FunnelStyle; onChange: (p: Partial<FunnelStyle>) => void }) {
  return (
    <div className="space-y-4">
      <Section label="Abstände (px)">
        <div className="grid grid-cols-2 gap-2">
          {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((k) => (
            <NumberInput key={k} label={k.replace('padding', '')}
              value={(style[k] as number) ?? 0}
              onChange={(v) => onChange({ [k]: v })} />
          ))}
        </div>
      </Section>

      <Section label="Aussehen">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-600">Hintergrund</label>
            <input type="color" value={style.backgroundColor || '#ffffff'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="w-8 h-7 rounded cursor-pointer border border-slate-200" />
          </div>
          <NumberInput label="Eckenrundung (px)" value={style.borderRadius ?? 0}
            onChange={(v) => onChange({ borderRadius: v })} />
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-600">Textausrichtung</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button key={a} onClick={() => onChange({ textAlign: a })}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    style.textAlign === a ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Block props editors ──────────────────────────────────────────────────────
function LeadFieldEditor({ field, allFields, onChange, onBack }: {
  field: LeadFieldDef;
  allFields: LeadFieldDef[];
  onChange: (patch: Partial<LeadFieldDef>) => void;
  onBack: () => void;
}) {
  const meta = LEAD_FIELD_META[field.type];
  const Icon = meta.icon;
  // Always compute variable key from labels — never user-editable
  const varMap = deriveFieldVarMap(allFields);
  const varName = varMap.get(field.id) ?? slugifyVar(field.label.replace(/<[^>]*>/g, ''));

  return (
    <div className="space-y-3">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
      >
        <ChevronLeft size={12} /> Zurück zum Formular
      </button>

      {/* Field type badge */}
      <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50`}>
        <Icon size={13} className={meta.color} />
        <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
      </div>

      {/* Type */}
      <Field label="Feldtyp">
        <select
          value={field.type}
          onChange={(e) => onChange({
            type: e.target.value as LeadFieldType,
            options: e.target.value === 'select' ? (field.options ?? ['Option 1', 'Option 2']) : field.options,
          })}
          className="input-field text-sm"
        >
          {LEAD_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>{LEAD_FIELD_META[t].label}</option>
          ))}
        </select>
      </Field>

      {/* Label — rich text for checkbox, plain input otherwise */}
      {field.type === 'checkbox' ? (
        <Field label="Beschriftung">
          <RichTextEditor
            value={field.label}
            onChange={(html) => onChange({ label: html })}
            variables={[
              { key: 'companyName',    label: 'Firmenname'      },
              { key: 'datenschutzUrl', label: 'Datenschutz-URL' },
              { key: 'impressumUrl',   label: 'Impressum-URL'   },
            ]}
            minHeight={60}
          />
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            Verwende @datenschutzUrl und @impressumUrl für automatische Links aus dem Firmenprofil.
          </p>
        </Field>
      ) : (
        <Field label="Feldname">
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="input-field text-sm"
            placeholder="z.B. Vorname"
          />
        </Field>
      )}

      {/* Variable — auto-derived, not editable */}
      {field.type !== 'checkbox' && (
        <Field label="Variable">
          <div className="px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
            @{varName}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            In E-Mail-Vorlagen mit <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">@{varName}</code> verwenden.
          </p>
        </Field>
      )}

      {/* Required */}
      <Field label="Verhalten">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="accent-violet-600"
          />
          <span className="text-xs text-slate-700">Pflichtfeld</span>
        </label>
      </Field>

      {/* Placeholder (not for checkbox) */}
      {field.type !== 'checkbox' && (
        <Field label="Platzhalter">
          <input
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="input-field text-sm"
            placeholder="optional"
          />
        </Field>
      )}

      {/* Options for select */}
      {field.type === 'select' && (
        <Field label="Optionen">
          <textarea
            value={(field.options ?? []).join('\n')}
            onChange={(e) => onChange({ options: e.target.value.split('\n') })}
            rows={4}
            className="input-field text-sm resize-none"
            placeholder={'Option 1\nOption 2\nOption 3'}
          />
          <p className="text-[10px] text-slate-400 mt-1">Eine Option pro Zeile</p>
        </Field>
      )}
    </div>
  );
}

// ─── Image block editor (extracted to own component to allow useState) ────────
const IMAGE_SIZES = [{ label: 'Voll', val: 'full' }, { label: 'L', val: 'l' }, { label: 'M', val: 'm' }, { label: 'S', val: 's' }, { label: 'XS', val: 'xs' }];

function ImageBlockEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  const [cropOpen, setCropOpen] = useState(false);
  const imgSize = (props.size as string) ?? 'full';
  const cropBox = props.cropBox as CropBox | undefined;
  const hasCrop = cropBox && (cropBox.left !== 0 || cropBox.top !== 0 || cropBox.right !== 100 || cropBox.bottom !== 100);

  return (
    <div className="space-y-3">
      <ImageUploadField value={(props.src as string) ?? ''} onChange={(v) => onChange({ src: v })} label="Bild" />
      <Field label="Größe">
        <div className="flex gap-1.5 flex-wrap">
          {IMAGE_SIZES.map((sz) => (
            <button key={sz.val} type="button" onClick={() => onChange({ size: sz.val })}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgSize === sz.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {sz.label}
            </button>
          ))}
        </div>
      </Field>
      {(props.src as string) && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCropOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-600 transition-colors">
            <Crop size={11} /> Bild zuschneiden
          </button>
          {hasCrop && (
            <button type="button" onClick={() => onChange({ cropBox: undefined })}
              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">
              Zurücksetzen
            </button>
          )}
        </div>
      )}
      {cropOpen && (props.src as string) && (
        <CropModal
          src={props.src as string}
          initial={cropBox ?? { left: 0, top: 0, right: 100, bottom: 100 }}
          onSave={(box) => { onChange({ cropBox: box }); setCropOpen(false); }}
          onClose={() => setCropOpen(false)}
        />
      )}
      <Section label="Erweitert" collapsible defaultOpen={false}>
        <Field label="Alt-Text">
          <input value={(props.alt as string) ?? ''} onChange={(e) => onChange({ alt: e.target.value })}
            className="input-field text-sm" />
        </Field>
        <Field label="Bildunterschrift">
          <input value={(props.caption as string) ?? ''} onChange={(e) => onChange({ caption: e.target.value })}
            className="input-field text-sm" />
        </Field>
      </Section>
    </div>
  );
}

// ─── Block props editors ──────────────────────────────────────────────────────
function BlockPropsEditor({ node, props, onChange, pages, availableVars }: {
  node: import('@/lib/funnel-types').BlockNode;
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  pages?: FunnelPage[];
  availableVars: VariableDef[];
}) {
  const { selectedFieldId, setSelectedFieldId } = useFunnelEditorCtx();

  switch (node.type) {

    // ── Generic ──
    case 'heading':
      return (
        <div className="space-y-3">
          <Field label="Ebene">
            <select value={(props.level as number) ?? 2}
              onChange={(e) => onChange({ level: Number(e.target.value) })}
              className="input-field text-sm">
              <option value={1}>H1 – Hauptüberschrift</option>
              <option value={2}>H2 – Abschnittsüberschrift</option>
              <option value={3}>H3 – Unterüberschrift</option>
            </select>
          </Field>
          <Field label="Text">
            <VarInput value={(props.text as string) ?? ''} onChange={(v) => onChange({ text: v })}
              className="input-field text-sm" placeholder="Überschrift…" variables={availableVars} />
          </Field>
        </div>
      );

    case 'paragraph':
      return (
        <RichTextEditor
          value={(props.text as string) ?? ''}
          onChange={(html) => onChange({ text: html })}
          variables={availableVars}
        />
      );

    case 'button':
      return (
        <div className="space-y-3">
          <Field label="Beschriftung">
            <input value={(props.text as string) ?? ''} onChange={(e) => onChange({ text: e.target.value })}
              className="input-field text-sm" />
          </Field>
          <Field label="Stil">
            <select value={(props.variant as string) ?? 'primary'}
              onChange={(e) => onChange({ variant: e.target.value })} className="input-field text-sm">
              <option value="primary">Primär</option>
              <option value="secondary">Sekundär</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
          <Section label="Verhalten" collapsible defaultOpen={!!(props.url)}>
            <Field label="URL (optional)">
              <input value={(props.url as string) ?? ''} onChange={(e) => onChange({ url: e.target.value })}
                className="input-field text-sm" placeholder="https://…" />
            </Field>
          </Section>
        </div>
      );

    case 'image':
      return <ImageBlockEditor props={props} onChange={onChange} />;

    case 'spacer':
      return (
        <NumberInput label="Höhe (px)" value={(props.height as number) ?? 32}
          onChange={(v) => onChange({ height: v })} />
      );

    case 'video':
      return (
        <div className="space-y-3">
          <Field label="Video-URL">
            <input value={(props.url as string) ?? ''} onChange={(e) => onChange({ url: e.target.value })}
              className="input-field text-sm" placeholder="https://youtube.com/…" />
          </Field>
          <Field label="Bildunterschrift">
            <input value={(props.caption as string) ?? ''} onChange={(e) => onChange({ caption: e.target.value })}
              className="input-field text-sm" />
          </Field>
        </div>
      );

    // ── Quest ──
    case 'quest_scene':
      return (
        <div className="space-y-3">
          <ImageUploadField value={(props.imageUrl as string) ?? ''} onChange={(v) => onChange({ imageUrl: v })} label="Bild (oben)" />
          <Field label="Titel"><VarInput value={(props.title as string) ?? ''} onChange={(v) => onChange({ title: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Beschreibung"><VarTextarea value={(props.description as string) ?? ''} onChange={(v) => onChange({ description: v })} rows={3} variables={availableVars} /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" placeholder="Alles klar, verstanden!" /></Field>
          </Section>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Subtext"><VarInput value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} className="input-field text-sm" placeholder="Erlebe virtuell einen typischen Arbeitstag als:" variables={availableVars} /></Field>
            <Field label="Akzenttext"><input value={(props.accentText as string) ?? ''} onChange={(e) => onChange({ accentText: e.target.value })} className="input-field text-sm" placeholder="BERUFSBEZEICHNUNG" /></Field>
          </Section>
        </div>
      );

    case 'quest_dialog':
      return <DialogEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'quest_decision':
      return <DecisionEditor props={props} onChange={onChange} pages={pages} variables={availableVars} />;

    case 'quest_quiz':
      return <QuizEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'quest_info':
      return (
        <div className="space-y-3">
          <Field label="Titel"><VarInput value={(props.title as string) ?? ''} onChange={(v) => onChange({ title: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Text (Rich Text)">
            <RichTextEditor value={(props.text as string) ?? ''} onChange={(html) => onChange({ text: html })} variables={availableVars} />
          </Field>
        </div>
      );

    case 'quest_freetext':
      return (
        <Field label="Text (Rich Text)">
          <RichTextEditor value={(props.text as string) ?? ''} onChange={(html) => onChange({ text: html })} variables={availableVars} />
        </Field>
      );

    case 'quest_file':
      return (
        <div className="space-y-3">
          <Field label="Titel">
            <input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" />
          </Field>
          <Field label="Datei-URL">
            <input value={(props.fileUrl as string) ?? ''} onChange={(e) => onChange({ fileUrl: e.target.value })} className="input-field text-sm" placeholder="https://…" />
          </Field>
          <Field label="Dateiname">
            <input value={(props.fileName as string) ?? ''} onChange={(e) => onChange({ fileName: e.target.value })} className="input-field text-sm" placeholder="dokument.pdf" />
          </Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text">
              <input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" />
            </Field>
          </Section>
        </div>
      );

    case 'quest_vorname':
      return (
        <div className="space-y-3">
          <Field label="Frage"><VarInput value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Platzhalter"><input value={(props.placeholder as string) ?? ''} onChange={(e) => onChange({ placeholder: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    /* avatar block removed */

    case 'quest_spinner': {
      const dur = (props.duration as number) ?? 2400;
      const DURATIONS = [
        { label: '1 s', val: 1000 },
        { label: '2 s', val: 2000 },
        { label: '3 s', val: 3000 },
        { label: '5 s', val: 5000 },
        { label: '8 s', val: 8000 },
      ];
      return (
        <div className="space-y-3">
          <Field label="Ladetext"><VarInput value={(props.text as string) ?? ''} onChange={(v) => onChange({ text: v })} className="input-field text-sm" placeholder="Einen Moment…" variables={availableVars} /></Field>
          <Field label="Dauer">
            <div className="flex gap-1.5 flex-wrap">
              {DURATIONS.map((d) => (
                <button key={d.val} type="button" onClick={() => onChange({ duration: d.val })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${dur === d.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Fertig-Text"><VarInput value={(props.doneText as string) ?? ''} onChange={(v) => onChange({ doneText: v })} className="input-field text-sm" placeholder="Geschafft!" variables={availableVars} /></Field>
          </Section>
        </div>
      );
    }

    case 'quest_rating':
      return (
        <div className="space-y-3">
          <Field label="Frage"><VarInput value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Emoji"><input value={(props.emoji as string) ?? '⭐'} onChange={(e) => onChange({ emoji: e.target.value })} className="input-field text-sm w-20" placeholder="⭐" /></Field>
            <NumberInput label="Anzahl (1–10)" value={(props.count as number) ?? 5} onChange={(v) => onChange({ count: Math.min(10, Math.max(1, v)) })} />
          </Section>
        </div>
      );

    case 'quest_lead': {
      const fields = (props.fields as LeadFieldDef[]) ?? [];
      const selectedField = selectedFieldId ? fields.find((f) => f.id === selectedFieldId) : null;

      if (selectedField) {
        return (
          <LeadFieldEditor
            field={selectedField}
            allFields={fields}
            onChange={(patch) => onChange({ fields: fields.map((f) => f.id === selectedField.id ? { ...f, ...patch } : f) })}
            onBack={() => setSelectedFieldId(null)}
          />
        );
      }

      return (
        <div className="space-y-3">

          <Field label="Überschrift">
            <VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} />
          </Field>
          <Field label="Untertext">
            <VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} />
          </Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text">
              <input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" />
            </Field>
          </Section>
          <LeadFieldBuilder fields={fields} onChange={(f) => onChange({ fields: f })} />
        </div>
      );
    }

    // ── BerufsCheck ──
    case 'check_intro':
      return (
        <div className="space-y-3">
          <ImageUploadField value={(props.imageUrl as string) ?? ''} onChange={(v) => onChange({ imageUrl: v })} label="Bild" />
          <Field label="Überschrift"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Untertext"><VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    case 'check_vorname':
      return (
        <div className="space-y-3">
          <Field label="Frage"><VarInput value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Platzhalter"><input value={(props.placeholder as string) ?? ''} onChange={(e) => onChange({ placeholder: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    case 'check_frage':
      return <FrageEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'check_ergebnisfrage':
      return <ErgebnisfrageEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'check_selbst':
      return (
        <div className="space-y-3">
          <Field label="Frage"><VarInput value={(props.question as string) ?? ''} onChange={(v) => onChange({ question: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Beschreibung"><VarTextarea value={(props.description as string) ?? ''} onChange={(v) => onChange({ description: v })} rows={2} variables={availableVars} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="Min" value={(props.sliderMin as number) ?? 0} onChange={(v) => onChange({ sliderMin: v })} />
            <NumberInput label="Max" value={(props.sliderMax as number) ?? 10} onChange={(v) => onChange({ sliderMax: v })} />
            <Field label="Label Min"><input value={(props.sliderLabelMin as string) ?? ''} onChange={(e) => onChange({ sliderLabelMin: e.target.value })} className="input-field text-xs" /></Field>
            <Field label="Label Max"><input value={(props.sliderLabelMax as string) ?? ''} onChange={(e) => onChange({ sliderLabelMax: e.target.value })} className="input-field text-xs" /></Field>
          </div>
        </div>
      );

    case 'check_lead':
      return (
        <div className="space-y-3">
          <Field label="Überschrift"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Untertext"><VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" /></Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!(props.showPhone)} onChange={(e) => onChange({ showPhone: e.target.checked })} className="accent-violet-600" />
              <span className="text-xs text-slate-700">Telefon-Feld anzeigen</span>
            </label>
          </Section>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Datenschutz-Text">
              <VarTextarea value={(props.privacyText as string) ?? ''} onChange={(v) => onChange({ privacyText: v })} rows={3} variables={availableVars} />
            </Field>
          </Section>
        </div>
      );

    case 'check_ergebnis':
      return (
        <div className="space-y-3">
          <Field label="Überschrift"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} variables={availableVars} /></Field>
          <Field label="Untertext"><VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} /></Field>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!(props.showDimensionBars)} onChange={(e) => onChange({ showDimensionBars: e.target.checked })} className="accent-violet-600" />
              <span className="text-xs text-slate-700">Dimensions-Balken anzeigen</span>
            </label>
          </Section>
        </div>
      );

    // ── Formular ──
    case 'form_hero':
      return (
        <div className="space-y-3">
          <ImageUploadField value={(props.imageUrl as string) ?? ''} onChange={(v) => onChange({ imageUrl: v })} label="Hintergrundbild" />
          <Field label="Überschrift"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Untertext"><VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.ctaText as string) ?? ''} onChange={(e) => onChange({ ctaText: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    case 'form_text':
      return (
        <div className="space-y-3">
          <Field label="Überschrift (optional)"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} /></Field>
          <Field label="Text (Rich Text)">
            <RichTextEditor value={(props.content as string) ?? ''} onChange={(html) => onChange({ content: html })} variables={availableVars} />
          </Field>
        </div>
      );

    case 'form_image':
      return (
        <div className="space-y-3">
          <ImageUploadField value={(props.imageUrl as string) ?? ''} onChange={(v) => onChange({ imageUrl: v })} label="Bild" />
          <Field label="Bildunterschrift"><input value={(props.caption as string) ?? ''} onChange={(e) => onChange({ caption: e.target.value })} className="input-field text-sm" /></Field>
        </div>
      );

    case 'form_step':
      return <FormStepEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'form_config': {
      const fcFields = (props.fields as LeadFieldDef[]) ?? [];
      const fcSelected = selectedFieldId ? fcFields.find((f) => f.id === selectedFieldId) : null;

      if (fcSelected) {
        return (
          <LeadFieldEditor
            field={fcSelected}
            allFields={fcFields}
            onChange={(patch) => onChange({ fields: fcFields.map((f) => f.id === fcSelected.id ? { ...f, ...patch } : f) })}
            onBack={() => setSelectedFieldId(null)}
          />
        );
      }

      return (
        <div className="space-y-3">

          <Field label="Überschrift">
            <VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} className="input-field text-sm" variables={availableVars} />
          </Field>
          <Field label="Untertext">
            <VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} />
          </Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text">
              <input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" />
            </Field>
          </Section>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Datenschutz-Text">
              <VarTextarea value={(props.privacyText as string) ?? ''} onChange={(v) => onChange({ privacyText: v })} rows={3} variables={availableVars} />
            </Field>
          </Section>
          <LeadFieldBuilder fields={fcFields} onChange={(f) => onChange({ fields: f })} />
        </div>
      );
    }

    default:
      return <p className="text-xs text-slate-400">Kein Editor für diesen Blocktyp.</p>;
  }
}

