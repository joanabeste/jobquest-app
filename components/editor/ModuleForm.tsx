'use client';

import { useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import {
  QuestModule, SceneModule, DialogModule, DecisionModule, QuizModule,
  InfoModule, FreetextModule, ImageModule, VideoModule, AudioModule,
  FileModule, DialogLine, DecisionOption, QuizOption, ModuleType, MODULE_LABELS, MODULE_ICONS,
} from '@/lib/types';
import { createModule } from '@/lib/utils';
import { Plus, Trash2, X, ChevronDown } from 'lucide-react';

type FieldRefs = MutableRefObject<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>;

const BRANCH_ICONS: Partial<Record<ModuleType, string>> = {
  scene: '🌄', dialog: '💬', info: 'ℹ️', freetext: '📝',
  image: '🖼️', video: '🎬', audio: '🎧', file: '📎',
};
const BRANCH_TYPES: ModuleType[] = ['scene', 'info', 'dialog', 'freetext', 'image', 'video'];

const inlineBase = 'w-full bg-transparent outline-none border-b-2 border-transparent hover:border-slate-200 focus:border-violet-500 transition-colors py-1 placeholder:text-slate-300';
const inlineLarge = `${inlineBase} text-xl font-bold text-slate-900`;
const inlineSmall = `${inlineBase} text-sm text-slate-700`;
const inlineTextarea = `${inlineBase} resize-none leading-relaxed text-sm text-slate-700`;

function InlineLabel({ children }: { children: ReactNode }) {
  return <span className="text-[9px] uppercase tracking-widest text-slate-400 block mt-4 mb-0.5 first:mt-1">{children}</span>;
}

interface Props {
  module: QuestModule;
  onChange: (updated: QuestModule) => void;
  onClose: () => void;
  fieldRefs?: FieldRefs;
}

export default function ModuleForm({ module, onChange, onClose, fieldRefs }: Props) {
  const [local, setLocal] = useState<QuestModule>(module);

  function update(patch: Partial<QuestModule>) {
    const updated = { ...local, ...patch } as QuestModule;
    setLocal(updated);
    onChange(updated);
  }

  function renderForm() {
    switch (local.type) {
      case 'scene': return <SceneForm m={local as SceneModule} update={update} fieldRefs={fieldRefs} />;
      case 'dialog': return <DialogForm m={local as DialogModule} update={update} fieldRefs={fieldRefs} />;
      case 'decision': return <DecisionForm m={local as DecisionModule} update={update} fieldRefs={fieldRefs} />;
      case 'quiz': return <QuizForm m={local as QuizModule} update={update} fieldRefs={fieldRefs} />;
      case 'info': return <InfoForm m={local as InfoModule} update={update} fieldRefs={fieldRefs} />;
      case 'freetext': return <FreetextForm m={local as FreetextModule} update={update} fieldRefs={fieldRefs} />;
      case 'image': return <ImageForm m={local as ImageModule} update={update} fieldRefs={fieldRefs} />;
      case 'video': return <VideoForm m={local as VideoModule} update={update} fieldRefs={fieldRefs} />;
      case 'audio': return <AudioForm m={local as AudioModule} update={update} fieldRefs={fieldRefs} />;
      case 'file': return <FileModuleForm m={local as FileModule} update={update} fieldRefs={fieldRefs} />;
      default: return null;
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{MODULE_ICONS[local.type]}</span>
          <p className="text-sm font-semibold text-slate-900">{MODULE_LABELS[local.type]}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
        {renderForm()}
      </div>
    </div>
  );
}

// ── Scene ──────────────────────────────────────────────────────────────────
function SceneForm({ m, update, fieldRefs }: { m: SceneModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Titel *</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['title'] = el; }}
        className={inlineLarge}
        value={m.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="z. B. Ein Tag als Mechatroniker"
      />
      <InlineLabel>Beschreibung *</InlineLabel>
      <textarea
        ref={(el) => { if (fieldRefs) fieldRefs.current['description'] = el; }}
        className={`${inlineTextarea} min-h-[120px]`}
        value={m.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Beschreibe die Situation realistisch und lebendig…"
      />
      <InlineLabel>Bild-URL (optional)</InlineLabel>
      <input className="input-field mt-1" value={m.imageUrl || ''} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
      {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 h-24 rounded-lg object-cover border border-slate-200" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
    </>
  );
}

// ── Dialog ─────────────────────────────────────────────────────────────────
function DialogForm({ m, update, fieldRefs }: { m: DialogModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  function updateLine(idx: number, patch: Partial<DialogLine>) {
    const lines = [...m.lines];
    lines[idx] = { ...lines[idx], ...patch };
    update({ lines });
  }
  function addLine() {
    update({ lines: [...m.lines, { id: crypto.randomUUID(), speaker: '', text: '' }] });
  }
  function removeLine(idx: number) {
    update({ lines: m.lines.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <InlineLabel>Titel (optional)</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['title'] = el; }}
        className={inlineSmall}
        value={m.title || ''}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="z. B. Gespräch am ersten Tag"
      />

      

      <InlineLabel>Dialogzeilen</InlineLabel>
      <div className="space-y-3 mt-1">
        {m.lines.map((line, idx) => (
          <div key={line.id} className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="input-field text-sm"
                value={line.speaker}
                onChange={(e) => updateLine(idx, { speaker: e.target.value })}
                placeholder="Sprecher:in"
              />
              <button onClick={() => removeLine(idx)} className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              className="input-field text-sm min-h-[60px] resize-none"
              value={line.text}
              onChange={(e) => updateLine(idx, { text: e.target.value })}
              placeholder="Text…"
            />
          </div>
        ))}
      </div>
      <button onClick={addLine} className="mt-2 btn-secondary text-xs w-full justify-center">
        <Plus size={13} /> Zeile hinzufügen
      </button>
    </>
  );
}

// ── Branch Module Card ───────────────────────────────────────────────────────
function BranchModuleCard({ module: bm, isExpanded, onToggle, onDelete, onChange }: {
  module: QuestModule;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onChange: (m: QuestModule) => void;
}) {
  function update(patch: Partial<QuestModule>) {
    onChange({ ...bm, ...patch } as QuestModule);
  }

  function renderForm() {
    switch (bm.type) {
      case 'scene': return <SceneForm m={bm as SceneModule} update={update} />;
      case 'dialog': return <DialogForm m={bm as DialogModule} update={update} />;
      case 'info': return <InfoForm m={bm as InfoModule} update={update} />;
      case 'freetext': return <FreetextForm m={bm as FreetextModule} update={update} />;
      case 'image': return <ImageForm m={bm as ImageModule} update={update} />;
      case 'video': return <VideoForm m={bm as VideoModule} update={update} />;
      case 'audio': return <AudioForm m={bm as AudioModule} update={update} />;
      case 'file': return <FileModuleForm m={bm as FileModule} update={update} />;
      default: return null;
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={onToggle}>
        <ChevronDown size={11} className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? '' : '-rotate-90'}`} />
        <span className="text-sm">{BRANCH_ICONS[bm.type] ?? '📦'}</span>
        <span className="text-xs font-medium text-slate-600 flex-1 truncate">{MODULE_LABELS[bm.type]}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        >
          <Trash2 size={11} />
        </button>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-3 text-sm">
          {renderForm()}
        </div>
      )}
    </div>
  );
}

// ── Branch Editor ────────────────────────────────────────────────────────────
function BranchEditor({ branchModules, onChange }: {
  branchModules: QuestModule[];
  onChange: (modules: QuestModule[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  function addModule(type: ModuleType) {
    const m = createModule(type);
    onChange([...branchModules, m]);
    setShowMenu(false);
    setExpanded(true);
    setExpandedId(m.id);
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors py-0.5"
      >
        <ChevronDown size={11} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <span className="font-medium">Eigener Pfad</span>
        {branchModules.length > 0 && (
          <span className="bg-violet-100 text-violet-700 text-xs px-1.5 py-0.5 rounded-full leading-none">
            {branchModules.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1.5">
          {branchModules.map((bm) => (
            <BranchModuleCard
              key={bm.id}
              module={bm}
              isExpanded={expandedId === bm.id}
              onToggle={() => setExpandedId(expandedId === bm.id ? null : bm.id)}
              onDelete={() => onChange(branchModules.filter((x) => x.id !== bm.id))}
              onChange={(updated) => onChange(branchModules.map((x) => x.id === updated.id ? updated : x))}
            />
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 hover:bg-violet-50 px-2 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-violet-300 w-full transition-colors"
            >
              <Plus size={11} /> Modul in Pfad hinzufügen
            </button>
            {showMenu && (
              <>
                <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                  {BRANCH_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addModule(type)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-violet-50 hover:text-violet-700 w-full text-left transition-colors"
                    >
                      <span className="text-sm">{BRANCH_ICONS[type]}</span>
                      <span className="text-xs font-medium text-slate-700">{MODULE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Decision ────────────────────────────────────────────────────────────────
function DecisionForm({ m, update, fieldRefs }: { m: DecisionModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  function updateOption(idx: number, patch: Partial<DecisionOption>) {
    const options = [...m.options];
    options[idx] = { ...options[idx], ...patch };
    update({ options });
  }
  function addOption() {
    update({ options: [...m.options, { id: crypto.randomUUID(), text: '', reaction: '', branchModules: [] }] });
  }
  function removeOption(idx: number) {
    update({ options: m.options.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <InlineLabel>Frage / Situation *</InlineLabel>
      <textarea
        ref={(el) => { if (fieldRefs) fieldRefs.current['question'] = el; }}
        className={`${inlineTextarea} min-h-[80px]`}
        value={m.question}
        onChange={(e) => update({ question: e.target.value })}
        placeholder="Stelle eine Entscheidungssituation…"
      />
      <InlineLabel>Antwortoptionen</InlineLabel>
      <div className="space-y-3 mt-1">
        {m.options.map((opt, idx) => (
          <div key={opt.id} className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
            <div className="flex items-center gap-2">
              <input className="input-field text-sm" value={opt.text} onChange={(e) => updateOption(idx, { text: e.target.value })} placeholder="Antwort-Option" />
              <button onClick={() => removeOption(idx)} className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <textarea className="input-field text-sm min-h-[50px] resize-none" value={opt.reaction} onChange={(e) => updateOption(idx, { reaction: e.target.value })} placeholder="Reaktion / Feedback auf diese Antwort…" />
            <BranchEditor
              branchModules={opt.branchModules ?? []}
              onChange={(modules) => updateOption(idx, { branchModules: modules })}
            />
          </div>
        ))}
      </div>
      <button onClick={addOption} className="mt-2 btn-secondary text-xs w-full justify-center">
        <Plus size={13} /> Option hinzufügen
      </button>
    </>
  );
}

// ── Quiz ────────────────────────────────────────────────────────────────────
function QuizForm({ m, update, fieldRefs }: { m: QuizModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  function updateOption(idx: number, patch: Partial<QuizOption>) {
    const options = [...m.options];
    options[idx] = { ...options[idx], ...patch };
    update({ options });
  }
  function setCorrect(idx: number) {
    const options = m.options.map((o, i) => ({ ...o, correct: i === idx }));
    update({ options });
  }
  function addOption() {
    update({ options: [...m.options, { id: crypto.randomUUID(), text: '', correct: false, feedback: '' }] });
  }
  function removeOption(idx: number) {
    update({ options: m.options.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <InlineLabel>Frage *</InlineLabel>
      <textarea
        ref={(el) => { if (fieldRefs) fieldRefs.current['question'] = el; }}
        className={`${inlineTextarea} min-h-[80px]`}
        value={m.question}
        onChange={(e) => update({ question: e.target.value })}
        placeholder="Stelle eine klare Quiz-Frage…"
      />
      <InlineLabel>Antwortoptionen (eine richtige)</InlineLabel>
      <div className="space-y-3 mt-1">
        {m.options.map((opt, idx) => (
          <div key={opt.id} className={`rounded-lg p-3 space-y-2 border-2 transition-colors ${opt.correct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCorrect(idx)}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${opt.correct ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-400'}`}
                title="Als richtig markieren"
              />
              <input className="input-field text-sm" value={opt.text} onChange={(e) => updateOption(idx, { text: e.target.value })} placeholder="Antwort-Option" />
              <button onClick={() => removeOption(idx)} className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <input
              className="input-field text-sm"
              value={opt.feedback}
              onChange={(e) => updateOption(idx, { feedback: e.target.value })}
              placeholder={opt.correct ? '💡 Warum ist das die richtige Antwort?' : '💬 Feedback bei dieser Falschantwort'}
            />
          </div>
        ))}
      </div>
      <button onClick={addOption} className="mt-2 btn-secondary text-xs w-full justify-center">
        <Plus size={13} /> Option hinzufügen
      </button>
    </>
  );
}

// ── Info ────────────────────────────────────────────────────────────────────
function InfoForm({ m, update, fieldRefs }: { m: InfoModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Titel *</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['title'] = el; }}
        className={inlineLarge}
        value={m.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Überschrift"
      />
      <InlineLabel>Text *</InlineLabel>
      <textarea
        ref={(el) => { if (fieldRefs) fieldRefs.current['text'] = el; }}
        className={`${inlineTextarea} min-h-[120px]`}
        value={m.text}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Informativer Text…"
      />
      <InlineLabel>Bild-URL (optional)</InlineLabel>
      <input className="input-field mt-1" value={m.imageUrl || ''} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
      <InlineLabel>Video-URL (optional)</InlineLabel>
      <input className="input-field mt-1 mb-3" value={m.videoUrl || ''} onChange={(e) => update({ videoUrl: e.target.value })} placeholder="https://youtube.com/…" />
    </>
  );
}

// ── Freetext ─────────────────────────────────────────────────────────────────
function FreetextForm({ m, update, fieldRefs }: { m: FreetextModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Text *</InlineLabel>
      <textarea
        ref={(el) => { if (fieldRefs) fieldRefs.current['text'] = el; }}
        className={`${inlineTextarea} min-h-[200px]`}
        value={m.text}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Freier Text…"
      />
    </>
  );
}

// ── Image ────────────────────────────────────────────────────────────────────
function ImageForm({ m, update, fieldRefs }: { m: ImageModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Bild-URL *</InlineLabel>
      <input className="input-field mt-1" value={m.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} placeholder="https://…" />
      {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-2 max-h-32 rounded-lg object-cover border border-slate-200" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
      <InlineLabel>Bildunterschrift (optional)</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['caption'] = el; }}
        className={inlineSmall}
        value={m.caption || ''}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder="Kurze Beschreibung"
      />
    </>
  );
}

// ── Video ────────────────────────────────────────────────────────────────────
function VideoForm({ m, update, fieldRefs }: { m: VideoModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Video-URL *</InlineLabel>
      <input className="input-field mt-1" value={m.videoUrl} onChange={(e) => update({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=… oder https://vimeo.com/…" />
      <InlineLabel>Bildunterschrift (optional)</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['caption'] = el; }}
        className={inlineSmall}
        value={m.caption || ''}
        onChange={(e) => update({ caption: e.target.value })}
        placeholder="Kurze Beschreibung"
      />
    </>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────
function AudioForm({ m, update, fieldRefs }: { m: AudioModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Audio-URL *</InlineLabel>
      <input className="input-field mt-1" value={m.audioUrl} onChange={(e) => update({ audioUrl: e.target.value })} placeholder="https://… (MP3, OGG)" />
      <InlineLabel>Titel (optional)</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['title'] = el; }}
        className={inlineSmall}
        value={m.title || ''}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="z. B. Interview mit dem Ausbilder"
      />
    </>
  );
}

// ── File ─────────────────────────────────────────────────────────────────────
function FileModuleForm({ m, update, fieldRefs }: { m: FileModule; update: (p: Partial<QuestModule>) => void; fieldRefs?: FieldRefs }) {
  return (
    <>
      <InlineLabel>Datei-URL *</InlineLabel>
      <input className="input-field mt-1" value={m.fileUrl} onChange={(e) => update({ fileUrl: e.target.value })} placeholder="https://…" />
      <InlineLabel>Dateiname *</InlineLabel>
      <input
        ref={(el) => { if (fieldRefs) fieldRefs.current['filename'] = el; }}
        className={inlineSmall}
        value={m.filename}
        onChange={(e) => update({ filename: e.target.value })}
        placeholder="Ausbildungsbroschüre.pdf"
      />
      <InlineLabel>Beschreibung (optional)</InlineLabel>
      <textarea
        className={`${inlineTextarea} min-h-[70px] mb-3`}
        value={m.description || ''}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Was enthält diese Datei?"
      />
    </>
  );
}
