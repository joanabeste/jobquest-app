'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Copy, MousePointer2, Lock, ChevronLeft } from 'lucide-react';
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

// ─── Focal point picker ───────────────────────────────────────────────────────
function FocalPointPicker({ src, cropX, cropY, onChange }: {
  src: string;
  cropX: number;
  cropY: number;
  onChange: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function pick(e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
    onChange(x, y);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-slate-400">Klicke auf das Bild um den sichtbaren Bereich zu setzen</p>
      <div
        ref={ref}
        className="relative w-full rounded-lg overflow-hidden cursor-crosshair select-none border border-slate-200"
        style={{ height: 140 }}
        onClick={pick}
        onTouchStart={(e) => { e.preventDefault(); pick(e); }}
      >
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${cropX}% ${cropY}%` }}
          draggable={false}
        />
        {/* Focal point dot */}
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${cropX}%`, top: `${cropY}%`, background: 'rgba(124,58,237,0.85)' }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)',
          backgroundSize: '33.33% 33.33%',
        }} />
      </div>
      <p className="text-[10px] text-slate-300 text-right">{cropX}% / {cropY}%</p>
    </div>
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
            <input value={(props.text as string) ?? ''} onChange={(e) => onChange({ text: e.target.value })}
              className="input-field text-sm" placeholder="Überschrift…" />
          </Field>
        </div>
      );

    case 'paragraph':
      return (
        <RichTextEditor
          value={(props.text as string) ?? ''}
          onChange={(html) => onChange({ text: html })}
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

    case 'image': {
      const imgSize  = (props.size as string) ?? 'full';
      const imgFit   = (props.objectFit as string) ?? 'cover';
      const imgHeight = (props.height as number | undefined);
      const cropX    = (props.cropX as number) ?? 50;
      const cropY    = (props.cropY as number) ?? 50;
      const SIZES = [
        { label: 'Voll', val: 'full' },
        { label: 'L', val: 'l' },
        { label: 'M', val: 'm' },
        { label: 'S', val: 's' },
        { label: 'XS', val: 'xs' },
      ];
      const FITS = [
        { label: 'Zuschneiden', val: 'cover' },
        { label: 'Einpassen', val: 'contain' },
        { label: 'Original', val: 'none' },
      ];
      const HEIGHTS = [
        { label: 'Auto', val: undefined },
        { label: '150', val: 150 },
        { label: '250', val: 250 },
        { label: '350', val: 350 },
        { label: '500', val: 500 },
      ];
      return (
        <div className="space-y-3">
          <ImageUploadField value={(props.src as string) ?? ''} onChange={(v) => onChange({ src: v })} label="Bild" />
          <Field label="Größe">
            <div className="flex gap-1.5 flex-wrap">
              {SIZES.map((sz) => (
                <button key={sz.val} type="button" onClick={() => onChange({ size: sz.val })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgSize === sz.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {sz.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Höhe (px)">
            <div className="flex gap-1.5 flex-wrap">
              {HEIGHTS.map((h) => (
                <button key={String(h.val)} type="button" onClick={() => onChange({ height: h.val })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgHeight === h.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {h.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Darstellung">
            <div className="flex gap-1.5 flex-wrap">
              {FITS.map((f) => (
                <button key={f.val} type="button" onClick={() => onChange({ objectFit: f.val })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgFit === f.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
          {imgFit === 'cover' && (props.src as string) && (
            <FocalPointPicker
              src={props.src as string}
              cropX={cropX}
              cropY={cropY}
              onChange={(x, y) => onChange({ cropX: x, cropY: y })}
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
          <Field label="Titel"><input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Beschreibung"><textarea value={(props.description as string) ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={3} className="input-field text-sm resize-none" /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" placeholder="Alles klar, verstanden!" /></Field>
          </Section>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Subtext"><input value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} className="input-field text-sm" placeholder="Erlebe virtuell einen typischen Arbeitstag als:" /></Field>
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
          <Field label="Titel"><input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Text (Rich Text)">
            <RichTextEditor value={(props.text as string) ?? ''} onChange={(html) => onChange({ text: html })} />
          </Field>
        </div>
      );

    case 'quest_freetext':
      return (
        <Field label="Text (Rich Text)">
          <RichTextEditor value={(props.text as string) ?? ''} onChange={(html) => onChange({ text: html })} />
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
          <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Platzhalter"><input value={(props.placeholder as string) ?? ''} onChange={(e) => onChange({ placeholder: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    /* avatar block removed */

    case 'quest_spinner':
      return (
        <div className="space-y-3">
          <Field label="Ladetext"><input value={(props.text as string) ?? ''} onChange={(e) => onChange({ text: e.target.value })} className="input-field text-sm" placeholder="Einen Moment…" /></Field>
          <p className="text-[10px] text-slate-400">Geht automatisch nach 2 Sekunden weiter.</p>
          <Section label="Erweitert" collapsible defaultOpen={false}>
            <Field label="Fertig-Text"><input value={(props.doneText as string) ?? ''} onChange={(e) => onChange({ doneText: e.target.value })} className="input-field text-sm" placeholder="Geschafft!" /></Field>
          </Section>
        </div>
      );

    case 'quest_rating':
      return (
        <div className="space-y-3">
          <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
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
            <input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" />
          </Field>
          <Field label="Untertext">
            <textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" />
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
          <Field label="Überschrift"><input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Untertext"><textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    case 'check_vorname':
      return (
        <div className="space-y-3">
          <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
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
          <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Beschreibung"><textarea value={(props.description as string) ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
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
          <Field label="Überschrift"><input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Untertext"><textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
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
          <Field label="Untertext"><textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
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
          <Field label="Überschrift"><input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Untertext"><textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
          <Section label="Verhalten" collapsible defaultOpen={true}>
            <Field label="Button-Text"><input value={(props.ctaText as string) ?? ''} onChange={(e) => onChange({ ctaText: e.target.value })} className="input-field text-sm" /></Field>
          </Section>
        </div>
      );

    case 'form_text':
      return (
        <div className="space-y-3">
          <Field label="Überschrift (optional)"><input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" /></Field>
          <Field label="Text (Rich Text)">
            <RichTextEditor value={(props.content as string) ?? ''} onChange={(html) => onChange({ content: html })} />
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
            <input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" />
          </Field>
          <Field label="Untertext">
            <textarea value={(props.subtext as string) ?? ''} onChange={(e) => onChange({ subtext: e.target.value })} rows={2} className="input-field text-sm resize-none" />
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

