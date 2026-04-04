'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { MousePointer2 } from 'lucide-react';
import {
  BerufsCheckBlock, Dimension, FrageOption,
  IntroBlock, VornameBlock, SelbsteinschaetzungBlock, FrageBlock, ErgebnisfrageBlock,
  TextBlock, LeadBlock, ErgebnisBlock, ButtonBlock,
} from '@/lib/types';

// ── Inline style helpers ──────────────────────────────────────────────────────
export type FieldRefs = React.MutableRefObject<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>;

const inlineBase = 'w-full bg-transparent outline-none border-b-2 border-transparent hover:border-slate-200 focus:border-violet-500 transition-colors py-1 placeholder:text-slate-300';
export const inlineLarge = `${inlineBase} text-xl font-bold text-slate-900`;
export const inlineMed = `${inlineBase} text-base font-semibold text-slate-800`;
export const inlineSmall = `${inlineBase} text-sm text-slate-600`;
export const inlineTextarea = `${inlineBase} resize-none leading-relaxed`;

function uid() { return crypto.randomUUID(); }

export function InlineLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[9px] uppercase tracking-widest text-violet-400 opacity-0 group-focus-within:opacity-100 transition-opacity mb-0.5">
      {children}
    </span>
  );
}
export function BlockTypeTag({ label }: { label: string }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-5">{label}</p>;
}
export function PreviewHint() {
  return (
    <p className="mt-3 text-[10px] text-violet-400 flex items-center gap-1 opacity-60">
      <MousePointer2 size={10} /> Klicken zum Bearbeiten
    </p>
  );
}

// ── Config field helpers ──────────────────────────────────────────────────────
export function CfgField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}
export function CfgInput({ value, onChange, placeholder, type = 'text' }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white" />
  );
}

// ── Inline Block Editor (dispatcher) ─────────────────────────────────────────
export function InlineBlockEditor({
  block, dimensions, company, onChange, fieldRefs,
}: {
  block: BerufsCheckBlock;
  dimensions: Dimension[];
  company: string;
  onChange: (b: BerufsCheckBlock) => void;
  fieldRefs: FieldRefs;
}) {
  switch (block.type) {
    case 'intro':              return <InlineIntroEditor              block={block} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'vorname':            return <InlineVornameEditor            block={block} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'selbsteinschaetzung':return <InlineSelbsteinschaetzungEditor block={block} dimensions={dimensions} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'frage':              return <InlineFrageEditor              block={block} dimensions={dimensions} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'ergebnisfrage':      return <InlineErgebnisfrageEditor      block={block} dimensions={dimensions} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'text':               return <InlineTextBlockEditor          block={block} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'lead':               return <InlineLeadBlockEditor          block={block} company={company} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'ergebnis':           return <InlineErgebnisEditor           block={block} onChange={onChange} fieldRefs={fieldRefs} />;
    case 'button':             return <InlineButtonEditor             block={block} onChange={onChange} fieldRefs={fieldRefs} />;
  }
}

// ── Inline Intro Editor ───────────────────────────────────────────────────────
function InlineIntroEditor({ block, onChange, fieldRefs }: { block: IntroBlock; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs }) {
  const u = (partial: Partial<IntroBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Intro" />
      <div className="group">
        <InlineLabel>Überschrift</InlineLabel>
        <input ref={(el) => { fieldRefs.current['headline'] = el; }}
          value={block.headline} onChange={(e) => u({ headline: e.target.value })}
          placeholder="Willkommen beim Berufscheck!" className={inlineLarge} />
      </div>
      <div className="group">
        <InlineLabel>Untertext</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['subtext'] = el; }}
          value={block.subtext} onChange={(e) => u({ subtext: e.target.value })}
          placeholder="Kurze Einleitung…" rows={3} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="group">
        <InlineLabel>Button-Text</InlineLabel>
        <input ref={(el) => { fieldRefs.current['buttonText'] = el; }}
          value={block.buttonText} onChange={(e) => u({ buttonText: e.target.value })}
          placeholder="Jetzt starten" className={`${inlineSmall} font-semibold text-violet-700`} />
      </div>
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Hintergrundbild-URL (optional)</p>
        <input value={block.imageUrl ?? ''} onChange={(e) => u({ imageUrl: e.target.value || undefined })}
          placeholder="https://…" className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white" />
      </div>
    </div>
  );
}

// ── Inline Vorname Editor ─────────────────────────────────────────────────────
function InlineVornameEditor({ block, onChange, fieldRefs }: { block: VornameBlock; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs }) {
  const u = (partial: Partial<VornameBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Vorname" />
      <div className="group">
        <InlineLabel>Frage / Aufforderung</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Wie heißt du?" className={inlineLarge} />
      </div>
      <div className="group">
        <InlineLabel>Platzhalter</InlineLabel>
        <input ref={(el) => { fieldRefs.current['placeholder'] = el; }}
          value={block.placeholder ?? ''} onChange={(e) => u({ placeholder: e.target.value || undefined })}
          placeholder="Dein Vorname" className={inlineSmall} />
      </div>
      <div className="group">
        <InlineLabel>Button-Text</InlineLabel>
        <input ref={(el) => { fieldRefs.current['buttonText'] = el; }}
          value={block.buttonText} onChange={(e) => u({ buttonText: e.target.value })}
          placeholder="Weiter" className={`${inlineSmall} font-semibold text-violet-700`} />
      </div>
    </div>
  );
}

// ── Inline Frage Editor ───────────────────────────────────────────────────────
function InlineFrageEditor({ block, dimensions, onChange, fieldRefs }: {
  block: FrageBlock; dimensions: Dimension[]; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<FrageBlock>) => onChange({ ...block, ...partial });
  function addOption() { u({ options: [...(block.options ?? []), { id: uid(), text: 'Neue Option', scores: {} }] }); }
  function updateOption(id: string, partial: Partial<FrageOption>) {
    u({ options: (block.options ?? []).map((o) => (o.id === id ? { ...o, ...partial } : o)) });
  }
  function setOptionDimension(optId: string, dimId: string) {
    const opt = (block.options ?? []).find((o) => o.id === optId);
    if (!opt) return;
    updateOption(optId, { scores: dimId ? { [dimId]: opt.scores[dimId] ?? 1 } : {} });
  }
  function setOptionScore(optId: string, dimId: string, value: string) {
    const opt = (block.options ?? []).find((o) => o.id === optId);
    if (!opt) return;
    updateOption(optId, { scores: { ...opt.scores, [dimId]: Math.max(0, parseInt(value) || 0) } });
  }
  function deleteOption(id: string) { u({ options: (block.options ?? []).filter((o) => o.id !== id) }); }

  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Frage" />
      <div className="group">
        <InlineLabel>Frage</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Deine Frage…" className={inlineLarge} />
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">Fragetyp</p>
        <div className="flex gap-2">
          {(['single_choice', 'slider'] as const).map((ft) => (
            <button key={ft} onClick={() => u({ frageType: ft })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                block.frageType === ft ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
              }`}>
              {ft === 'single_choice' ? 'Einzelauswahl' : 'Schieberegler'}
            </button>
          ))}
        </div>

        {block.frageType === 'single_choice' && (
          <div>
            {dimensions.length === 0 && (
              <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Keine Berufsfelder definiert. Füge Berufsfelder unter &quot;Berufsfelder&quot; hinzu.
              </p>
            )}
            <div className="space-y-2">
              {(block.options ?? []).map((opt, i) => {
                const dimId = Object.keys(opt.scores)[0] ?? '';
                const dim = dimensions.find((d) => d.id === dimId);
                return (
                  <div key={opt.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                    <span className="text-xs text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                    <input value={opt.text} onChange={(e) => updateOption(opt.id, { text: e.target.value })}
                      className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 min-w-0" placeholder="Antwort…" />
                    {dimensions.length > 0 && (
                      <>
                        <select value={dimId} onChange={(e) => setOptionDimension(opt.id, e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 max-w-[120px]"
                          style={dim ? { borderColor: dim.color, color: dim.color } : {}}>
                          <option value="">— Feld —</option>
                          {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        {dimId && (
                          <input type="number" min="0" max="100" value={opt.scores[dimId] ?? 1}
                            onChange={(e) => setOptionScore(opt.id, dimId, e.target.value)}
                            className="w-12 text-xs text-center bg-white border border-slate-200 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300" />
                        )}
                      </>
                    )}
                    <button onClick={() => deleteOption(opt.id)} className="p-1 rounded hover:bg-red-100 flex-shrink-0"><Trash2 size={12} className="text-red-400" /></button>
                  </div>
                );
              })}
            </div>
            <button onClick={addOption} className="mt-2 flex items-center gap-1 text-xs text-violet-600 font-medium px-2 py-1">
              <Plus size={12} /> Option hinzufügen
            </button>
          </div>
        )}

        {block.frageType === 'slider' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <CfgField label="Min"><CfgInput type="number" value={block.sliderMin ?? 0} onChange={(v) => u({ sliderMin: parseInt(v) || 0 })} /></CfgField>
              <CfgField label="Max"><CfgInput type="number" value={block.sliderMax ?? 10} onChange={(v) => u({ sliderMax: parseInt(v) || 10 })} /></CfgField>
              <CfgField label="Schritt"><CfgInput type="number" value={block.sliderStep ?? 1} onChange={(v) => u({ sliderStep: parseInt(v) || 1 })} /></CfgField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CfgField label="Label links"><CfgInput value={block.sliderLabelMin ?? ''} onChange={(v) => u({ sliderLabelMin: v })} placeholder="Wenig" /></CfgField>
              <CfgField label="Label rechts"><CfgInput value={block.sliderLabelMax ?? ''} onChange={(v) => u({ sliderLabelMax: v })} placeholder="Viel" /></CfgField>
            </div>
            <CfgField label="Berufsfeld" hint="Slider-Wert wird als Punktzahl gewertet">
              <select value={block.sliderDimensionId ?? ''} onChange={(e) => u({ sliderDimensionId: e.target.value || undefined })}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white">
                <option value="">— Kein Berufsfeld —</option>
                {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </CfgField>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline Selbsteinschätzung Editor ──────────────────────────────────────────
function InlineSelbsteinschaetzungEditor({ block, dimensions, onChange, fieldRefs }: {
  block: SelbsteinschaetzungBlock; dimensions: Dimension[]; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<SelbsteinschaetzungBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Selbsteinschätzung" />
      <div className="group">
        <InlineLabel>Frage / Aussage</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Wie sehr trifft das auf dich zu?" className={inlineLarge} />
      </div>
      <div className="group">
        <InlineLabel>Beschreibung (optional)</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['description'] = el; }}
          value={block.description ?? ''} onChange={(e) => u({ description: e.target.value || undefined })}
          placeholder="Weitere Erklärung…" rows={2} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">Slider-Konfiguration</p>
        <div className="grid grid-cols-3 gap-2">
          <CfgField label="Min"><CfgInput type="number" value={block.sliderMin} onChange={(v) => u({ sliderMin: parseInt(v) || 0 })} /></CfgField>
          <CfgField label="Max"><CfgInput type="number" value={block.sliderMax} onChange={(v) => u({ sliderMax: parseInt(v) || 10 })} /></CfgField>
          <CfgField label="Schritt"><CfgInput type="number" value={block.sliderStep} onChange={(v) => u({ sliderStep: parseInt(v) || 1 })} /></CfgField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <CfgField label="Label links"><CfgInput value={block.sliderLabelMin ?? ''} onChange={(v) => u({ sliderLabelMin: v })} placeholder="Gar nicht" /></CfgField>
          <CfgField label="Label rechts"><CfgInput value={block.sliderLabelMax ?? ''} onChange={(v) => u({ sliderLabelMax: v })} placeholder="Sehr stark" /></CfgField>
        </div>
        <CfgField label="Berufsfeld" hint="Slider-Wert als Punktzahl">
          <select value={block.sliderDimensionId ?? ''} onChange={(e) => u({ sliderDimensionId: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white">
            <option value="">— Kein Berufsfeld —</option>
            {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </CfgField>
      </div>
    </div>
  );
}

// ── Inline Text Block Editor ──────────────────────────────────────────────────
function InlineTextBlockEditor({ block, onChange, fieldRefs }: { block: TextBlock; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs }) {
  const u = (partial: Partial<TextBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Textblock" />
      <div className="group">
        <InlineLabel>Überschrift (optional)</InlineLabel>
        <input ref={(el) => { fieldRefs.current['headline'] = el; }}
          value={block.headline ?? ''} onChange={(e) => u({ headline: e.target.value || undefined })}
          placeholder="Optionale Überschrift…" className={inlineMed} />
      </div>
      <div className="group">
        <InlineLabel>Text</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['content'] = el; }}
          value={block.content} onChange={(e) => u({ content: e.target.value })}
          placeholder="Dein Text hier…" rows={8} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="group">
        <InlineLabel>Button-Text</InlineLabel>
        <input ref={(el) => { fieldRefs.current['buttonText'] = el; }}
          value={block.buttonText} onChange={(e) => u({ buttonText: e.target.value })}
          placeholder="Weiter" className={`${inlineSmall} font-semibold text-violet-700`} />
      </div>
    </div>
  );
}

// ── Inline Ergebnisfrage Editor ───────────────────────────────────────────────
function InlineErgebnisfrageEditor({ block, dimensions, onChange, fieldRefs }: {
  block: ErgebnisfrageBlock; dimensions: Dimension[]; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<ErgebnisfrageBlock>) => onChange({ ...block, ...partial });
  function addOption() { u({ options: [...block.options, { id: uid(), text: 'Neue Option', scores: {} }] }); }
  function updateOption(id: string, partial: Partial<FrageOption>) {
    u({ options: block.options.map((o) => (o.id === id ? { ...o, ...partial } : o)) });
  }
  function setOptionDimension(optId: string, dimId: string) {
    const opt = block.options.find((o) => o.id === optId);
    if (!opt) return;
    updateOption(optId, { scores: dimId ? { [dimId]: opt.scores[dimId] ?? 1 } : {} });
  }
  function setOptionScore(optId: string, dimId: string, value: string) {
    const opt = block.options.find((o) => o.id === optId);
    if (!opt) return;
    updateOption(optId, { scores: { ...opt.scores, [dimId]: Math.max(0, parseInt(value) || 0) } });
  }
  function deleteOption(id: string) { u({ options: block.options.filter((o) => o.id !== id) }); }

  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Ergebnisfrage" />
      <div className="group">
        <InlineLabel>Frage</InlineLabel>
        <input ref={(el) => { fieldRefs.current['question'] = el; }}
          value={block.question} onChange={(e) => u({ question: e.target.value })}
          placeholder="Welche Aussage trifft am ehesten zu?" className={inlineLarge} />
      </div>
      <div className="group">
        <InlineLabel>Beschreibung (optional)</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['description'] = el; }}
          value={block.description ?? ''} onChange={(e) => u({ description: e.target.value || undefined })}
          placeholder="Weitere Erklärung…" rows={2} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="pt-3 border-t border-slate-100">
        {dimensions.length === 0 && (
          <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            Keine Berufsfelder definiert. Füge sie unter &quot;Berufsfelder&quot; hinzu.
          </p>
        )}
        <div className="space-y-2">
          {block.options.map((opt, i) => {
            const dimId = Object.keys(opt.scores)[0] ?? '';
            const dim = dimensions.find((d) => d.id === dimId);
            return (
              <div key={opt.id} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                <span className="text-xs text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                <input value={opt.text} onChange={(e) => updateOption(opt.id, { text: e.target.value })}
                  className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-300 min-w-0" placeholder="Antwort…" />
                {dimensions.length > 0 && (
                  <>
                    <select value={dimId} onChange={(e) => setOptionDimension(opt.id, e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 max-w-[120px]"
                      style={dim ? { borderColor: dim.color, color: dim.color } : {}}>
                      <option value="">— Feld —</option>
                      {dimensions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    {dimId && (
                      <input type="number" min="0" max="100" value={opt.scores[dimId] ?? 1}
                        onChange={(e) => setOptionScore(opt.id, dimId, e.target.value)}
                        className="w-12 text-xs text-center bg-white border border-slate-200 rounded-lg px-1 py-1.5" />
                    )}
                  </>
                )}
                <button onClick={() => deleteOption(opt.id)} className="p-1 rounded hover:bg-red-100"><Trash2 size={12} className="text-red-400" /></button>
              </div>
            );
          })}
        </div>
        <button onClick={addOption} className="mt-2 flex items-center gap-1 text-xs text-violet-600 font-medium px-2 py-1">
          <Plus size={12} /> Option hinzufügen
        </button>
      </div>
    </div>
  );
}

// ── Inline Lead Block Editor ──────────────────────────────────────────────────
function InlineLeadBlockEditor({ block, company, onChange, fieldRefs }: {
  block: LeadBlock; company: string; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs;
}) {
  const u = (partial: Partial<LeadBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Kontaktformular" />
      <div className="group">
        <InlineLabel>Überschrift</InlineLabel>
        <input ref={(el) => { fieldRefs.current['headline'] = el; }}
          value={block.headline} onChange={(e) => u({ headline: e.target.value })}
          placeholder="Fast geschafft!" className={inlineMed} />
      </div>
      <div className="group">
        <InlineLabel>Untertext</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['subtext'] = el; }}
          value={block.subtext} onChange={(e) => u({ subtext: e.target.value })}
          placeholder="Hinterlasse deine Kontaktdaten…" rows={3} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="group">
        <InlineLabel>Button-Text</InlineLabel>
        <input ref={(el) => { fieldRefs.current['buttonText'] = el; }}
          value={block.buttonText} onChange={(e) => u({ buttonText: e.target.value })}
          placeholder="Ergebnis anzeigen" className={`${inlineSmall} font-semibold text-violet-700`} />
      </div>
      <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
        <span className="text-sm text-slate-600">Telefonnummer anzeigen</span>
        <button onClick={() => u({ showPhone: !block.showPhone })}
          className={`relative w-9 h-5 rounded-full transition-colors ${block.showPhone ? 'bg-violet-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${block.showPhone ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="group">
        <InlineLabel>Datenschutztext</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['privacyText'] = el; }}
          value={block.privacyText} onChange={(e) => u({ privacyText: e.target.value })}
          placeholder="Ich stimme zu…" rows={3} className={`${inlineTextarea} text-xs text-slate-500`} />
        <p className="text-xs text-slate-400 mt-1">&#123;&#123;company&#125;&#125; → &quot;{company}&quot;</p>
      </div>
    </div>
  );
}

// ── Inline Ergebnis Editor ────────────────────────────────────────────────────
function InlineErgebnisEditor({ block, onChange, fieldRefs }: { block: ErgebnisBlock; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs }) {
  const u = (partial: Partial<ErgebnisBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Ergebnis" />
      <div className="group">
        <InlineLabel>Überschrift</InlineLabel>
        <input ref={(el) => { fieldRefs.current['headline'] = el; }}
          value={block.headline} onChange={(e) => u({ headline: e.target.value })}
          placeholder="Dein Ergebnis, {{name}}!" className={inlineMed} />
        <p className="text-xs text-slate-400 mt-1">&#123;name&#125; wird durch den Vornamen ersetzt.</p>
      </div>
      <div className="group">
        <InlineLabel>Untertext</InlineLabel>
        <textarea ref={(el) => { fieldRefs.current['subtext'] = el; }}
          value={block.subtext} onChange={(e) => u({ subtext: e.target.value })}
          placeholder="Hier siehst du deine Ergebnisse." rows={3} className={`${inlineTextarea} ${inlineSmall}`} />
      </div>
      <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
        <span className="text-sm text-slate-600">Berufsfeld-Balken anzeigen</span>
        <button onClick={() => u({ showDimensionBars: !block.showDimensionBars })}
          className={`relative w-9 h-5 rounded-full transition-colors ${block.showDimensionBars ? 'bg-violet-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${block.showDimensionBars ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}

// ── Inline Button Editor ──────────────────────────────────────────────────────
function InlineButtonEditor({ block, onChange, fieldRefs }: { block: ButtonBlock; onChange: (b: BerufsCheckBlock) => void; fieldRefs: FieldRefs }) {
  const u = (partial: Partial<ButtonBlock>) => onChange({ ...block, ...partial });
  return (
    <div className="p-6 space-y-5">
      <BlockTypeTag label="Button" />
      <div className="group">
        <InlineLabel>Button-Text</InlineLabel>
        <input ref={(el) => { fieldRefs.current['text'] = el; }}
          value={block.text} onChange={(e) => u({ text: e.target.value })}
          placeholder="Mehr erfahren" className={`${inlineMed} text-violet-700`} />
      </div>
      <div className="group">
        <InlineLabel>URL / Link</InlineLabel>
        <input ref={(el) => { fieldRefs.current['url'] = el; }}
          value={block.url} onChange={(e) => u({ url: e.target.value })}
          placeholder="https://…" className={inlineSmall} />
      </div>
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Stil</p>
        <div className="flex gap-2">
          {(['primary', 'secondary'] as const).map((s) => (
            <button key={s} onClick={() => u({ style: s })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                block.style === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
              }`}>
              {block.style === s && <Check size={11} />}
              {s === 'primary' ? 'Primär' : 'Sekundär'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
