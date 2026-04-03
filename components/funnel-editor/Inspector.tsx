'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Copy, MousePointer2, Plus, X, Lock, Bold, Italic, Underline, List, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { FunnelNode, FunnelStyle, FunnelContentType, FunnelPage, BLOCK_LABELS } from '@/lib/funnel-types';
import { BLOCK_META } from './NodeView';

interface InspectorProps {
  node: FunnelNode | null;
  contentType: FunnelContentType;
  isLocked?: boolean;
  onUpdate: (patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  extraPanel?: React.ReactNode;
  pages?: FunnelPage[];
  currentPage?: FunnelPage;
  onUpdatePage?: (patch: Partial<FunnelPage>) => void;
}

export default function Inspector({ node, isLocked, onUpdate, onDelete, onDuplicate, extraPanel, pages, currentPage, onUpdatePage }: InspectorProps) {
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
              <BlockPropsEditor node={node} props={props} onChange={updateProps} pages={pages} />
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
  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="label">Seitenname</label>
        <input className="input-field" value={currentPage.name} onChange={(e) => onUpdate?.({ name: e.target.value })} />
      </div>
      <div>
        <label className="label">Nächste Seite</label>
        <select className="input-field" value={currentPage.nextPageId ?? ''} onChange={(e) => onUpdate?.({ nextPageId: e.target.value || undefined })}>
          <option value="">(nächste)</option>
          {pages?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Rich text editor ─────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef  = useRef<HTMLDivElement>(null);
  const skipRef    = useRef(false);
  const colorRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editorRef.current || skipRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value ?? '';
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      skipRef.current = true;
      onChange(editorRef.current.innerHTML);
      requestAnimationFrame(() => { skipRef.current = false; });
    }
  }

  function handleInput() {
    if (!editorRef.current) return;
    skipRef.current = true;
    onChange(editorRef.current.innerHTML);
    requestAnimationFrame(() => { skipRef.current = false; });
  }

  // Font-size mapping: XS=1, S=2, M=3(default), L=5
  const SIZES = [
    { label: 'XS', val: '1' },
    { label: 'S',  val: '2' },
    { label: 'M',  val: '3' },
    { label: 'L',  val: '5' },
  ];

  const btnCls = 'p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 bg-slate-50 border-b border-slate-200 flex-wrap">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={btnCls} title="Fett">
          <Bold size={12} />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={btnCls} title="Kursiv">
          <Italic size={12} />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={btnCls} title="Unterstrichen">
          <Underline size={12} />
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {/* Font size */}
        {SIZES.map((sz) => (
          <button key={sz.val} type="button"
            onMouseDown={(e) => { e.preventDefault(); exec('fontSize', sz.val); }}
            className={`${btnCls} text-[10px] font-semibold px-1.5`}
            title={`Größe ${sz.label}`}>
            {sz.label}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {/* Text color */}
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); colorRef.current?.click(); }}
          className={btnCls} title="Textfarbe">
          <Palette size={12} />
        </button>
        <input ref={colorRef} type="color" defaultValue="#000000"
          onChange={(e) => exec('foreColor', e.target.value)}
          className="w-0 h-0 opacity-0 absolute" tabIndex={-1} />
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'h2'); }} className={`${btnCls} text-[10px] font-bold px-1.5`} title="Überschrift 2">H2</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'h3'); }} className={`${btnCls} text-[10px] font-bold px-1.5`} title="Überschrift 3">H3</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'p'); }} className={`${btnCls} text-[10px] px-1.5`} title="Absatz">¶</button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={btnCls} title="Aufzählung">
          <List size={12} />
        </button>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[80px] p-2"
      />
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
function BlockPropsEditor({ node, props, onChange, pages }: {
  node: import('@/lib/funnel-types').BlockNode;
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  pages?: FunnelPage[];
}) {
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
      const imgSize = (props.size as string) ?? 'full';
      const imgFit  = (props.objectFit as string) ?? 'cover';
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
          <Field label="Bildzuschnitt">
            <div className="flex gap-1.5 flex-wrap">
              {FITS.map((f) => (
                <button key={f.val} type="button" onClick={() => onChange({ objectFit: f.val })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgFit === f.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
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
      return <DialogEditor props={props} onChange={onChange} />;

    case 'quest_decision':
      return <DecisionEditor props={props} onChange={onChange} pages={pages} />;

    case 'quest_quiz':
      return <QuizEditor props={props} onChange={onChange} />;

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
      const leadFields = (props.fields as LeadFieldDef[]) ?? [];
      const LEAD_FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'checkbox', 'select'] as const;
      const LEAD_FIELD_LABELS: Record<string, string> = { text: 'Text', email: 'E-Mail', tel: 'Telefon', textarea: 'Mehrzeilig', checkbox: 'Checkbox', select: 'Dropdown' };
      const addLeadField = () => onChange({ fields: [...leadFields, { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false }] });
      const updateLeadField = (id: string, patch: Partial<LeadFieldDef>) => onChange({ fields: leadFields.map((f) => f.id === id ? { ...f, ...patch } : f) });
      const removeLeadField = (id: string) => onChange({ fields: leadFields.filter((f) => f.id !== id) });
      const moveLeadField = (id: string, dir: -1 | 1) => {
        const idx = leadFields.findIndex((f) => f.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= leadFields.length) return;
        const arr = [...leadFields];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        onChange({ fields: arr });
      };
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-2.5 py-2 bg-violet-50 rounded-xl">
            <Lock size={11} className="text-violet-500 flex-shrink-0" />
            <span className="text-[10px] font-medium text-violet-700">Fester Abschlussblock – nicht löschbar</span>
          </div>
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
              <textarea value={(props.privacyText as string) ?? ''} onChange={(e) => onChange({ privacyText: e.target.value })} rows={3} className="input-field text-sm resize-none" />
              <p className="text-[10px] text-slate-400 mt-1">&#123;company&#125; → Firmenname</p>
            </Field>
          </Section>
          {/* Flexible fields builder */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Formularfelder</p>
              <button onClick={addLeadField} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium hover:text-violet-800 transition-colors">
                <Plus size={11} /> Feld hinzufügen
              </button>
            </div>
            {leadFields.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Noch keine Felder – klicke auf Feld hinzufügen
              </p>
            ) : (
              <div className="space-y-2">
                {leadFields.map((f, idx) => (
                  <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
                    {/* Row 1: type selector + pflicht + reorder + delete */}
                    <div className="flex gap-1 items-center">
                      <select value={f.type} onChange={(e) => updateLeadField(f.id, { type: e.target.value, options: e.target.value === 'select' ? (f.options ?? ['Option 1', 'Option 2']) : f.options })}
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
                        {LEAD_FIELD_TYPES.map((t) => <option key={t} value={t}>{LEAD_FIELD_LABELS[t]}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                        <input type="checkbox" checked={!!(f.required)} onChange={(e) => updateLeadField(f.id, { required: e.target.checked })} className="accent-violet-600" />
                        Pflicht
                      </label>
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveLeadField(f.id, -1)} disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronUp size={10} />
                        </button>
                        <button onClick={() => moveLeadField(f.id, 1)} disabled={idx === leadFields.length - 1}
                          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">
                          <ChevronDown size={10} />
                        </button>
                      </div>
                      <button onClick={() => removeLeadField(f.id)} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    {/* Row 2: label */}
                    <input value={f.label} onChange={(e) => updateLeadField(f.id, { label: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder="Beschriftung" />
                    {/* Row 3: placeholder (not for checkbox/select) */}
                    {f.type !== 'checkbox' && f.type !== 'select' && (
                      <input value={f.placeholder ?? ''} onChange={(e) => updateLeadField(f.id, { placeholder: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder="Platzhalter (optional)" />
                    )}
                    {/* Row 4: dropdown options (one per line) */}
                    {f.type === 'select' && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Optionen (eine pro Zeile)</p>
                        <textarea
                          value={(f.options ?? []).join('\n')}
                          onChange={(e) => updateLeadField(f.id, { options: e.target.value.split('\n') })}
                          rows={3}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none resize-none"
                          placeholder={"Option 1\nOption 2\nOption 3"}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
      return <FrageEditor props={props} onChange={onChange} />;

    case 'check_ergebnisfrage':
      return <ErgebnisfrageEditor props={props} onChange={onChange} />;

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
              <textarea value={(props.privacyText as string) ?? ''} onChange={(e) => onChange({ privacyText: e.target.value })} rows={3} className="input-field text-sm resize-none" />
              <p className="text-[10px] text-slate-400 mt-1">&#123;company&#125; → Firmenname</p>
            </Field>
          </Section>
        </div>
      );

    case 'check_ergebnis':
      return (
        <div className="space-y-3">
          <Field label="Überschrift"><input value={(props.headline as string) ?? ''} onChange={(e) => onChange({ headline: e.target.value })} className="input-field text-sm" /><p className="text-[10px] text-slate-400 mt-1">&#123;name&#125; → Vorname</p></Field>
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
      return <FormStepEditor props={props} onChange={onChange} />;

    case 'form_config': {
      // identical UI to quest_lead inspector
      const leadFields = (props.fields as LeadFieldDef[]) ?? [];
      const LEAD_FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'checkbox', 'select'] as const;
      const LEAD_FIELD_LABELS: Record<string, string> = { text: 'Text', email: 'E-Mail', tel: 'Telefon', textarea: 'Mehrzeilig', checkbox: 'Checkbox', select: 'Dropdown' };
      const addLeadField = () => onChange({ fields: [...leadFields, { id: crypto.randomUUID(), type: 'text', label: 'Neues Feld', required: false }] });
      const updateLeadField = (id: string, patch: Partial<LeadFieldDef>) => onChange({ fields: leadFields.map((f) => f.id === id ? { ...f, ...patch } : f) });
      const removeLeadField = (id: string) => onChange({ fields: leadFields.filter((f) => f.id !== id) });
      const moveLeadField = (id: string, dir: -1 | 1) => {
        const idx = leadFields.findIndex((f) => f.id === id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= leadFields.length) return;
        const arr = [...leadFields];
        [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
        onChange({ fields: arr });
      };
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-2.5 py-2 bg-violet-50 rounded-xl">
            <Lock size={11} className="text-violet-500 flex-shrink-0" />
            <span className="text-[10px] font-medium text-violet-700">Fester Abschlussblock – nicht löschbar</span>
          </div>
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
              <textarea value={(props.privacyText as string) ?? ''} onChange={(e) => onChange({ privacyText: e.target.value })} rows={3} className="input-field text-sm resize-none" />
              <p className="text-[10px] text-slate-400 mt-1">&#123;company&#125; → Firmenname</p>
            </Field>
          </Section>
          {/* Flexible fields builder */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Formularfelder</p>
              <button onClick={addLeadField} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium hover:text-violet-800 transition-colors">
                <Plus size={11} /> Feld hinzufügen
              </button>
            </div>
            {leadFields.length === 0 && <p className="text-[10px] text-slate-300 italic">Keine Felder</p>}
            <div className="space-y-2">
              {leadFields.map((f, i) => (
                <div key={f.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                  <div className="flex items-center gap-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <select value={f.type} onChange={(e) => updateLeadField(f.id, { type: e.target.value as any })}
                      className="text-xs px-2 py-0.5 border border-slate-200 rounded focus:outline-none">
                      {LEAD_FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{LEAD_FIELD_LABELS[t]}</option>
                      ))}
                    </select>
                    <input value={f.label} onChange={(e) => updateLeadField(f.id, { label: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded" placeholder="Label" />
                    <button onClick={() => moveLeadField(f.id, -1)} disabled={i === 0} className="p-0.5 rounded hover:bg-slate-200 transition-colors">
                      <ChevronUp size={12} className="text-slate-400" />
                    </button>
                    <button onClick={() => moveLeadField(f.id, 1)} disabled={i === leadFields.length - 1} className="p-0.5 rounded hover:bg-slate-200 transition-colors">
                      <ChevronDown size={12} className="text-slate-400" />
                    </button>
                    <button onClick={() => removeLeadField(f.id)} className="p-0.5 rounded hover:bg-red-100 transition-colors">
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                  {f.type === 'select' && (
                    <input value={(f.options as string[] | undefined)?.join(', ') ?? ''} onChange={(e) => updateLeadField(f.id, { options: e.target.value.split(',').map((s) => s.trim()) })}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded" placeholder="Optionen, mit Komma getrennt" />
                  )}
                  {f.type === 'textarea' && (
                    <textarea value={f.placeholder as string || ''} onChange={(e) => updateLeadField(f.id, { placeholder: e.target.value })}
                      rows={2} className="w-full px-2 py-1 text-xs border border-slate-200 rounded resize-none" placeholder="Platzhalter" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    default:
      return <p className="text-xs text-slate-400">Kein Editor für diesen Blocktyp.</p>;
  }
}

// ─── Sub-editors ──────────────────────────────────────────────────────────────
type DialogLineDef = { id: string; speaker: string; text: string; imageUrl?: string };

function DialogEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const lines = (props.lines as DialogLineDef[]) ?? [];
  const choices = (props.choices as { id: string; text: string; reaction?: string }[]) ?? [];
  const input = (props.input as { placeholder?: string; captures?: string; followUpText?: string } | undefined) ?? null;
  const hasChoices = choices.length > 0;
  const hasInput = !!input;

  function updateLine(id: string, patch: Partial<DialogLineDef>) {
    onChange({ lines: lines.map((l) => l.id === id ? { ...l, ...patch } : l) });
  }
  function updateChoice(i: number, patch: Partial<{ text: string; reaction: string }>) {
    onChange({ choices: choices.map((c, j) => j === i ? { ...c, ...patch } : c) });
  }

  return (
    <div className="space-y-3">
      <Field label="Titel (optional)"><input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Zeilen</p>
          <button onClick={() => onChange({ lines: [...lines, { id: crypto.randomUUID(), speaker: 'Sprecher', text: '', imageUrl: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 font-medium">
            <Plus size={11} /> Zeile
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={l.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
              {/* Speaker + delete */}
              <div className="flex items-center gap-1">
                <input value={l.speaker} onChange={(e) => updateLine(l.id, { speaker: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Sprecher" />
                <button onClick={() => onChange({ lines: lines.filter((_, idx) => idx !== i) })}
                  disabled={lines.length <= 1} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30">
                  <X size={12} />
                </button>
              </div>
              {/* Text */}
              <textarea value={l.text} onChange={(e) => updateLine(l.id, { text: e.target.value })}
                rows={2} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" placeholder="Text…" />
              {/* Image upload */}
              <ImageUploadField label="Bild (optional)" value={l.imageUrl ?? ''} onChange={(v) => updateLine(l.id, { imageUrl: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Antwortoptionen (Choices) – mutually exclusive with Input */}
      {!hasInput && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Antwortoptionen</p>
            <button onClick={() => onChange({ choices: [...choices, { id: crypto.randomUUID(), text: '', reaction: '' }] })}
              className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-700 font-medium">
              <Plus size={11} /> Option
            </button>
          </div>
          {hasChoices && (
            <div className="space-y-2">
              {choices.map((c, i) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                  <div className="flex gap-1">
                    <input value={c.text} onChange={(e) => updateChoice(i, { text: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Antworttext" />
                    <button onClick={() => onChange({ choices: choices.filter((_, j) => j !== i) })}
                      className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                  <input value={c.reaction ?? ''} onChange={(e) => updateChoice(i, { reaction: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Reaktion des Sprechers (optional)" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Eingabefeld – mutually exclusive with Choices */}
      {!hasChoices && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Eingabefeld</p>
            <button
              onClick={() => hasInput
                ? onChange({ input: undefined })
                : onChange({ input: { placeholder: 'Dein Vorname…', captures: 'firstName', followUpText: '' } })}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${hasInput ? 'bg-violet-100 text-violet-700 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:text-violet-600'}`}
            >
              {hasInput ? '× Entfernen' : '+ Hinzufügen'}
            </button>
          </div>
          {hasInput && (
            <div className="space-y-1.5">
              <input value={input?.placeholder ?? ''} onChange={(e) => onChange({ input: { ...input, placeholder: e.target.value } })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Platzhalter…" />
              <select value={input?.captures ?? ''} onChange={(e) => onChange({ input: { ...input, captures: e.target.value || undefined } })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400">
                <option value="">Kein Capture</option>
                <option value="firstName">Vorname speichern (als &#123;&#123;name&#125;&#125;)</option>
              </select>
              <textarea value={input?.followUpText ?? ''} onChange={(e) => onChange({ input: { ...input, followUpText: e.target.value } })}
                rows={2} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none" placeholder="Reaktion des Sprechers nach Eingabe (optional)…" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionEditor({ props, onChange, pages }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  pages?: FunnelPage[];
}) {
  const options = (props.options as { id: string; text: string; reaction: string; targetPageId?: string }[]) ?? [];
  function updateOpt(i: number, patch: Partial<typeof options[0]>) {
    onChange({ options: options.map((x, j) => j === i ? { ...x, ...patch } : x) });
  }
  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', reaction: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
        </div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
              <div className="flex gap-1">
                <input value={o.text} onChange={(e) => updateOpt(i, { text: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Optionstext" />
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
              </div>
              <input value={o.reaction} onChange={(e) => updateOpt(i, { reaction: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Reaktion nach Auswahl" />
              {pages && pages.length > 1 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 flex-shrink-0">→ Weiter zu</span>
                  <select
                    value={o.targetPageId ?? ''}
                    onChange={(e) => updateOpt(i, { targetPageId: e.target.value || undefined })}
                    className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                  >
                    <option value="">Nächste Seite</option>
                    {pages.map((pg) => (
                      <option key={pg.id} value={pg.id}>{pg.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuizEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const options = (props.options as { id: string; text: string; correct: boolean; feedback: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Antworten</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Antwort', correct: false, feedback: '' }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Antwort</button>
        </div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.id} className={`rounded-xl p-2 space-y-1.5 border ${o.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex gap-1 items-center">
                <input type="checkbox" checked={o.correct}
                  onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, correct: e.target.checked } : x) })}
                  className="accent-emerald-600" title="Richtige Antwort" />
                <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
              </div>
              <input value={o.feedback} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, feedback: e.target.value } : x) })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" placeholder="Feedback nach Auswahl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrageEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const frageType = (props.frageType as string) ?? 'single_choice';
  const options = (props.options as { id: string; text: string; scores: Record<string, number> }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Typ">
        <select value={frageType} onChange={(e) => onChange({ frageType: e.target.value })} className="input-field text-sm">
          <option value="single_choice">Einfachauswahl</option>
          <option value="slider">Slider</option>
        </select>
      </Field>
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      {frageType === 'single_choice' ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
            <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', scores: {} }] })}
              className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
          </div>
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={o.id} className="flex gap-1">
                <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
                <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Min" value={(props.sliderMin as number) ?? 0} onChange={(v) => onChange({ sliderMin: v })} />
          <NumberInput label="Max" value={(props.sliderMax as number) ?? 10} onChange={(v) => onChange({ sliderMax: v })} />
        </div>
      )}
    </div>
  );
}

function ErgebnisfrageEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const options = (props.options as { id: string; text: string; scores: Record<string, number> }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Frage"><input value={(props.question as string) ?? ''} onChange={(e) => onChange({ question: e.target.value })} className="input-field text-sm" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Optionen</p>
          <button onClick={() => onChange({ options: [...options, { id: crypto.randomUUID(), text: 'Option', scores: {} }] })}
            className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Option</button>
        </div>
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div key={o.id} className="flex gap-1">
              <input value={o.text} onChange={(e) => onChange({ options: options.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })}
                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
              <button onClick={() => onChange({ options: options.filter((_, j) => j !== i) })} disabled={options.length <= 1}
                className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type FormFieldDef = { id: string; type: string; label: string; placeholder?: string; required: boolean; options?: string[] };
type LeadFieldDef = { id: string; type: string; label: string; placeholder?: string; required?: boolean; options?: string[]; };

function FormStepEditor({ props, onChange }: { props: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const fields = (props.fields as FormFieldDef[]) ?? [];
  const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'radio'] as const;
  const FIELD_LABELS: Record<string, string> = { text: 'Textfeld', email: 'E-Mail', phone: 'Telefon', textarea: 'Mehrzeilig', select: 'Auswahl', radio: 'Einfachauswahl' };

  function addField() {
    onChange({ fields: [...fields, { id: crypto.randomUUID(), type: 'text', label: 'Feld', required: false }] });
  }
  function updateField(id: string, patch: Partial<FormFieldDef>) {
    onChange({ fields: fields.map((f) => f.id === id ? { ...f, ...patch } : f) });
  }
  function removeField(id: string) {
    onChange({ fields: fields.filter((f) => f.id !== id) });
  }

  return (
    <div className="space-y-3">
      <Field label="Schritt-Titel"><input value={(props.title as string) ?? ''} onChange={(e) => onChange({ title: e.target.value })} className="input-field text-sm" /></Field>
      <Field label="Beschreibung"><textarea value={(props.description as string) ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="input-field text-sm resize-none" /></Field>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Felder ({fields.length})</p>
          <button onClick={addField} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium"><Plus size={11} /> Feld</button>
        </div>
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5">
              <div className="flex gap-1 items-center">
                <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value })}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_LABELS[t]}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="accent-violet-600" />
                  Pflicht
                </label>
                <button onClick={() => removeField(f.id)} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"><X size={12} /></button>
              </div>
              <input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder="Beschriftung" />
              {(f.type === 'select' || f.type === 'radio') && (
                <div className="space-y-1">
                  {(f.options ?? []).map((opt, i) => (
                    <div key={i} className="flex gap-1">
                      <input value={opt} onChange={(e) => { const o = [...(f.options ?? [])]; o[i] = e.target.value; updateField(f.id, { options: o }); }}
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none" placeholder={`Option ${i + 1}`} />
                      <button onClick={() => updateField(f.id, { options: (f.options ?? []).filter((_, j) => j !== i) })}
                        disabled={(f.options ?? []).length <= 1} className="p-0.5 rounded text-slate-400 hover:text-red-500 disabled:opacity-30"><X size={11} /></button>
                    </div>
                  ))}
                  <button onClick={() => updateField(f.id, { options: [...(f.options ?? []), `Option ${(f.options ?? []).length + 1}`] })}
                    className="text-[10px] text-violet-600 font-medium flex items-center gap-1"><Plus size={10} /> Option</button>
                </div>
              )}
            </div>
          ))}
          {fields.length === 0 && <p className="text-[10px] text-slate-300 text-center py-3 italic">Noch keine Felder</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field text-sm" />
    </Field>
  );
}

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  return (
    <Field label={label}>
      {value && (
        <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 mb-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 p-1 bg-white rounded-lg shadow text-slate-500 hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
      <input type="file" accept="image/*" onChange={handleUpload}
        className="block text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer" />
    </Field>
  );
}

function Section({ label, children, collapsible, defaultOpen = true }: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (collapsible) {
    return (
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
          {open ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
        </button>
        {open && <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100">{children}</div>}
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}
