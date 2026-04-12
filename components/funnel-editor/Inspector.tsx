'use client';

import { useEffect, useState } from 'react';
import { Trash2, Copy, MousePointer2, Lock } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { FunnelNode, FunnelStyle, FunnelPage, BLOCK_LABELS, LeadFieldDef } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';
import { VarInput, VarTextarea } from './VarInput';
import { type VariableDef, CONTEXT_VARIABLES } from '@/lib/funnel-variables';
import LeadFieldBuilder from './LeadFieldBuilder';
import { useFunnelEditorCtx } from './FunnelEditorContext';
import { Field, NumberInput, ImageUploadField, Section } from './inspectors/shared';
import { ImageBlockEditor } from './inspectors/CropModal';
import { LeadFieldEditor } from './inspectors/LeadFieldEditor';
import { DialogEditor } from './inspectors/DialogEditor';
import { DecisionEditor } from './inspectors/DecisionEditor';
import { QuizEditor } from './inspectors/QuizEditor';
import { FrageEditor, ErgebnisfrageEditor } from './inspectors/FrageEditor';
import { SwipeDeckEditor } from './inspectors/SwipeDeckEditor';
import { ErgebnisGroupsEditor } from './inspectors/ErgebnisGroupsEditor';
import { FormStepEditor } from './inspectors/FormStepEditor';
import { HotspotEditor } from './inspectors/HotspotEditor';
import { ZuordnungEditor } from './inspectors/ZuordnungEditor';

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
  availableVars?: VariableDef[];
}

export default function Inspector({ node, isLocked, onUpdate, onDelete, onDuplicate, extraPanel, pages, currentPage, onUpdatePage, availableVars = CONTEXT_VARIABLES }: InspectorProps) {
  const [tab, setTab] = useState<'props' | 'page'>('props');

  useEffect(() => {
    if (node) {
      setTab('props');
    } else {
      setTab('page');
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const label     = node ? (node.kind === 'block' ? BLOCK_LABELS[node.type] : 'Layout') : null;
  const blockMeta = node?.kind === 'block' ? BLOCK_META[node.type] : null;
  const props     = node?.kind === 'block' ? node.props : {};
  function updateProps(patch: Record<string, unknown>) { onUpdate({ props: patch }); }

  return (
    <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">

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

      <div className="flex border-b border-slate-100 flex-shrink-0">
        {node && <TabBtn active={tab === 'props'} onClick={() => setTab('props')}>Inhalt</TabBtn>}
        <TabBtn active={tab === 'page'} onClick={() => setTab('page')}>Seite</TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'page' ? (
          <PageSettingsEditor currentPage={currentPage} pages={pages} onUpdate={onUpdatePage} />
        ) : tab === 'props' && node ? (
          node.kind === 'layout' ? (
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Spalten</p>
              {node.columns.map((col, i) => (
                <div key={col.id} className="flex items-center justify-between py-1.5 text-xs text-slate-600">
                  <span>Spalte {i + 1}</span>
                  <span className="text-slate-400">{col.nodes.length} Blöcke</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <BlockPropsEditor node={node} props={props} onChange={updateProps} pages={pages} availableVars={availableVars} />
            </div>
          )
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

// ─── Page settings editor ─────────────────────────────────────────────────────
function PageSettingsEditor({ currentPage, pages, onUpdate }: { currentPage?: FunnelPage | undefined; pages?: FunnelPage[]; onUpdate?: (p: Partial<FunnelPage>) => void }) {
  if (!currentPage) return <div className="p-4 text-sm text-slate-400">Keine Seiten-Einstellungen verfügbar.</div>;

  const pageIdx        = pages?.findIndex((p) => p.id === currentPage.id) ?? -1;
  const sequentialNextId = pages?.[pageIdx + 1]?.id ?? '';
  const effectiveNextId  = currentPage.nextPageId ?? sequentialNextId;
  const isCustom         = Boolean(currentPage.nextPageId) && currentPage.nextPageId !== sequentialNextId;

  function handleNextChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value;
    onUpdate?.({ nextPageId: selected === sequentialNextId ? undefined : (selected || undefined) });
  }

  // Collect candidate filter blocks on PRECEDING pages.
  const filterBlocks: Array<{ id: string; label: string; options: Array<{ id: string; text: string }> }> = [];
  if (pages && pageIdx > 0) {
    pages.slice(0, pageIdx).forEach((page) => {
      page.nodes.forEach((node) => {
        if (node.kind !== 'block') return;
        if (node.type === 'check_frage' || node.type === 'quest_decision') {
          const opts = (node.props.options as Array<{ id: string; text: string }>) ?? [];
          filterBlocks.push({
            id: node.id,
            label: (node.props.question as string) || page.name || 'Frage',
            options: opts,
          });
        }
      });
    });
  }

  const visibleIf = currentPage.visibleIf;
  const sourceBlock = visibleIf ? filterBlocks.find((b) => b.id === visibleIf.sourceBlockId) : null;

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="label">Seitenname</label>
        <input className="input-field" value={currentPage.name} onChange={(e) => onUpdate?.({ name: e.target.value })} />
        <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={currentPage.hideLocationHint ?? false}
            onChange={(e) => onUpdate?.({ hideLocationHint: e.target.checked })}
            className="rounded border-slate-300"
          />
          Seitenname im Player ausblenden
        </label>
      </div>
      <div>
        <label className="label">Nächste Seite</label>
        <select className="input-field" value={effectiveNextId} onChange={handleNextChange}>
          {pages?.filter((p) => p.id !== currentPage.id).map((p) => {
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
            <button onClick={() => onUpdate?.({ nextPageId: undefined })} className="underline hover:text-violet-800">
              zurücksetzen
            </button>
          </p>
        )}
      </div>

      {pageIdx > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <label className="label">Sichtbar wenn …</label>
          {filterBlocks.length === 0 ? (
            <p className="text-[10px] text-slate-400">Keine Filterfragen auf vorherigen Seiten gefunden.</p>
          ) : (
            <>
              <select
                className="input-field text-sm"
                value={visibleIf?.sourceBlockId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) onUpdate?.({ visibleIf: undefined });
                  else onUpdate?.({ visibleIf: { sourceBlockId: v, equals: visibleIf?.equals ?? [] } });
                }}
              >
                <option value="">— Immer sichtbar —</option>
                {filterBlocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.label.slice(0, 40)}</option>
                ))}
              </select>
              {visibleIf && sourceBlock && (
                <div className="mt-2 pl-2 border-l-2 border-violet-200 space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500">Antwort eine von:</p>
                  {sourceBlock.options.map((opt) => {
                    const checked = visibleIf.equals.includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...visibleIf.equals, opt.id]
                              : visibleIf.equals.filter((v) => v !== opt.id);
                            onUpdate?.({ visibleIf: { ...visibleIf, equals: next } });
                          }}
                          className="accent-violet-600"
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">Wird die Bedingung nicht erfüllt, springt der Player diese Seite automatisch.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Block props editor ───────────────────────────────────────────────────────
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
          <ImageUploadField value={(props.imageUrl as string) ?? ''} onChange={(v) => onChange({ imageUrl: v })} label="Bild" />
          <Field label="Titel"><VarInput value={(props.title as string) ?? ''} onChange={(v) => onChange({ title: v })} className="input-field text-sm" placeholder="Willkommen bei …" variables={availableVars} /></Field>
          <Field label="Einleitungstext"><VarInput value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} className="input-field text-sm" placeholder="Erlebe virtuell einen typischen Arbeitstag als:" variables={availableVars} /></Field>
          <Field label="Jobtitel"><input value={(props.accentText as string) ?? ''} onChange={(e) => onChange({ accentText: e.target.value })} className="input-field text-sm" placeholder="z. B. Pflegefachkraft (m/w/d)" /><p className="text-[10px] text-slate-400 mt-1">Wird farbig hervorgehoben</p></Field>
          <Field label="Beschreibung"><VarTextarea value={(props.description as string) ?? ''} onChange={(v) => onChange({ description: v })} rows={3} variables={availableVars} /></Field>
          <Field label="Button-Text"><input value={(props.buttonText as string) ?? ''} onChange={(e) => onChange({ buttonText: e.target.value })} className="input-field text-sm" placeholder="Alles klar, verstanden!" /></Field>
        </div>
      );

    case 'quest_dialog':
      return <DialogEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'quest_decision':
      return <DecisionEditor props={props} onChange={onChange} pages={pages} variables={availableVars} />;

    case 'quest_quiz':
      return <QuizEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'quest_hotspot':
      return <HotspotEditor props={props} onChange={onChange} variables={availableVars} />;

    case 'quest_zuordnung':
      return <ZuordnungEditor props={props} onChange={onChange} variables={availableVars} />;

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
          <Section label="Erfolgsseite" collapsible defaultOpen={false}>
            <Field label="Überschrift">
              <input value={(props.thankYouHeadline as string) ?? ''} onChange={(e) => onChange({ thankYouHeadline: e.target.value })} className="input-field text-sm" placeholder="Vielen Dank!" />
            </Field>
            <Field label="Text">
              <textarea value={(props.thankYouText as string) ?? ''} onChange={(e) => onChange({ thankYouText: e.target.value })} className="input-field text-sm" rows={2} placeholder="Wir melden uns bei dir." />
            </Field>
            <Field label="Button-Text (optional)">
              <input value={(props.thankYouButtonText as string) ?? ''} onChange={(e) => onChange({ thankYouButtonText: e.target.value })} className="input-field text-sm" placeholder="Zur Karriereseite" />
            </Field>
            {!!(props.thankYouButtonText as string) && (
              <Field label="Button-URL">
                <input value={(props.thankYouButtonUrl as string) ?? ''} onChange={(e) => onChange({ thankYouButtonUrl: e.target.value })} className="input-field text-sm" placeholder="https://..." />
              </Field>
            )}
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

    case 'check_swipe_deck':
      return <SwipeDeckEditor props={props} onChange={onChange} variables={availableVars} />;

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
          <Section label="Erfolgsseite" collapsible defaultOpen={false}>
            <Field label="Überschrift">
              <input value={(props.thankYouHeadline as string) ?? ''} onChange={(e) => onChange({ thankYouHeadline: e.target.value })} className="input-field text-sm" placeholder="Vielen Dank!" />
            </Field>
            <Field label="Text">
              <textarea value={(props.thankYouText as string) ?? ''} onChange={(e) => onChange({ thankYouText: e.target.value })} className="input-field text-sm" rows={2} placeholder="Wir melden uns bei dir." />
            </Field>
            <Field label="Button-Text (optional)">
              <input value={(props.thankYouButtonText as string) ?? ''} onChange={(e) => onChange({ thankYouButtonText: e.target.value })} className="input-field text-sm" placeholder="Zur Karriereseite" />
            </Field>
            {!!(props.thankYouButtonText as string) && (
              <Field label="Button-URL">
                <input value={(props.thankYouButtonUrl as string) ?? ''} onChange={(e) => onChange({ thankYouButtonUrl: e.target.value })} className="input-field text-sm" placeholder="https://..." />
              </Field>
            )}
          </Section>
        </div>
      );

    case 'check_ergebnis':
      return (
        <div className="space-y-3">
          <Field label="Überschrift"><VarInput value={(props.headline as string) ?? ''} onChange={(v) => onChange({ headline: v })} variables={availableVars} /></Field>
          <Field label="Untertext"><VarTextarea value={(props.subtext as string) ?? ''} onChange={(v) => onChange({ subtext: v })} rows={2} variables={availableVars} /></Field>
          <ErgebnisGroupsEditor props={props} onChange={onChange} pages={pages} />
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
      const fcFields   = (props.fields as LeadFieldDef[]) ?? [];
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
          <Section label="Erfolgsseite" collapsible defaultOpen={false}>
            <Field label="Überschrift">
              <input value={(props.thankYouHeadline as string) ?? ''} onChange={(e) => onChange({ thankYouHeadline: e.target.value })} className="input-field text-sm" placeholder="Vielen Dank!" />
            </Field>
            <Field label="Text">
              <textarea value={(props.thankYouText as string) ?? ''} onChange={(e) => onChange({ thankYouText: e.target.value })} className="input-field text-sm" rows={2} placeholder="Wir melden uns bei dir." />
            </Field>
            <Field label="Button-Text (optional)">
              <input value={(props.thankYouButtonText as string) ?? ''} onChange={(e) => onChange({ thankYouButtonText: e.target.value })} className="input-field text-sm" placeholder="Zur Karriereseite" />
            </Field>
            {!!(props.thankYouButtonText as string) && (
              <Field label="Button-URL">
                <input value={(props.thankYouButtonUrl as string) ?? ''} onChange={(e) => onChange({ thankYouButtonUrl: e.target.value })} className="input-field text-sm" placeholder="https://..." />
              </Field>
            )}
          </Section>
          <LeadFieldBuilder fields={fcFields} onChange={(f) => onChange({ fields: f })} />
        </div>
      );
    }

    default:
      return <p className="text-xs text-slate-400">Kein Editor für diesen Blocktyp.</p>;
  }
}
