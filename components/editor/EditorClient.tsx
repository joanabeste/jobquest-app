'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { questStorage } from '@/lib/storage';
import { JobQuest, QuestModule, ModuleType, MODULE_LABELS, MODULE_ICONS, LeadFormConfig, DEFAULT_LEAD_CONFIG } from '@/lib/types';
import { getModuleTitle, generateMockStory, generateSlug, createModule } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import ModuleForm from './ModuleForm';
import EditorPreview from './EditorPreview';
import {
  GripVertical, Plus, Trash2, Copy, Edit2, Save, Globe, Eye,
  Sparkles, ChevronDown, AlertCircle, CheckCircle, X, Link as LinkIcon, MousePointer2, Download,
} from 'lucide-react';
import { QRCodeCanvas } from "qrcode.react";

const MODULE_GROUPS: { label: string; types: ModuleType[] }[] = [
  { label: 'Story', types: ['scene', 'dialog', 'decision', 'quiz'] },
  { label: 'Inhalt', types: ['info', 'freetext'] },
  { label: 'Medien', types: ['image', 'video', 'audio', 'file'] },
];

// ── Sortable Module Item ───────────────────────────────────────────────────────
function SortableModuleItem({
  module, index, isSelected, onSelect, onDelete, onDuplicate,
}: {
  module: QuestModule;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
        isSelected ? 'bg-violet-50 border-violet-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Index + Icon */}
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium">
        {index + 1}
      </span>
      <span className="text-base flex-shrink-0">{MODULE_ICONS[module.type]}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 leading-none mb-0.5">{MODULE_LABELS[module.type]}</p>
        <p className="text-sm text-slate-700 truncate leading-tight">{getModuleTitle(module) || '—'}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onDuplicate}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Duplizieren"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Löschen"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Lead Config Form ──────────────────────────────────────────────────────────
function LeadConfigForm({
  config, onChange, onClose,
}: {
  config: LeadFormConfig;
  onChange: (c: LeadFormConfig) => void;
  onClose: () => void;
}) {
  function set<K extends keyof LeadFormConfig>(key: K, value: LeadFormConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Bewerbungsformular</p>
            <p className="text-xs text-slate-400">Texte und Felder anpassen</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={15} className="text-slate-400" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {/* Intro-Bereich */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Intro-Text</p>
          <div className="space-y-3">
            <div>
              <label className="label">Überschrift</label>
              <input
                className="input-field"
                value={config.headline}
                onChange={(e) => set('headline', e.target.value)}
                placeholder="Du hast es geschafft!"
              />
            </div>
            <div>
              <label className="label">Untertext</label>
              <textarea
                className="input-field min-h-[72px] resize-none"
                value={config.subtext}
                onChange={(e) => set('subtext', e.target.value)}
                placeholder="Hinterlasse deine Kontaktdaten…"
              />
            </div>
          </div>
        </section>

        {/* Formular-Felder */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Formular-Felder</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700">Vorname &amp; Nachname</span>
              <span className="text-xs text-slate-400 font-medium">Pflichtfeld</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-700">E-Mail-Adresse</span>
              <span className="text-xs text-slate-400 font-medium">Pflichtfeld</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => set('showPhone', !config.showPhone)}>
              <span className="text-sm text-slate-700">Telefonnummer</span>
              <div className={`relative w-9 h-5 rounded-full transition-colors ${config.showPhone ? 'bg-violet-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.showPhone ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </div>
        </section>

        {/* Button */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Abschicken</p>
          <div>
            <label className="label">Button-Text</label>
            <input
              className="input-field"
              value={config.buttonText}
              onChange={(e) => set('buttonText', e.target.value)}
              placeholder="Jetzt bewerben"
            />
          </div>
        </section>

        {/* DSGVO */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Datenschutz-Einwilligung</p>
          <div>
            <label className="label">Einwilligungstext</label>
            <textarea
              className="input-field min-h-[88px] resize-none"
              value={config.privacyText}
              onChange={(e) => set('privacyText', e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              <code className="bg-slate-100 px-1 py-0.5 rounded text-violet-600">{'{{company}}'}</code> wird durch den Firmennamen ersetzt.
            </p>
          </div>
        </section>

        {/* Danke-Seite */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Danke-Seite</p>
          <div className="space-y-3">
            <div>
              <label className="label">Überschrift</label>
              <input
                className="input-field"
                value={config.thankYouHeadline}
                onChange={(e) => set('thankYouHeadline', e.target.value)}
                placeholder="Vielen Dank!"
              />
            </div>
            <div>
              <label className="label">Text</label>
              <textarea
                className="input-field min-h-[72px] resize-none"
                value={config.thankYouText}
                onChange={(e) => set('thankYouText', e.target.value)}
                placeholder="Deine Bewerbung ist bei uns eingegangen."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Add Module Dropdown ───────────────────────────────────────────────────────
function AddModuleButton({ onAdd }: { onAdd: (type: ModuleType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-primary w-full justify-center text-xs py-2"
      >
        <Plus size={14} />
        Modul hinzufügen
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {MODULE_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</span>
              </div>
              {group.types.map((type) => (
                <button
                  key={type}
                  onClick={() => { onAdd(type); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50 hover:text-violet-700 transition-colors text-left"
                >
                  <span className="text-base">{MODULE_ICONS[type]}</span>
                  <span className="text-sm font-medium text-slate-700">{MODULE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ── Main Editor Client ────────────────────────────────────────────────────────
interface Props {
  initialQuest: JobQuest;
}

export default function EditorClient({ initialQuest }: Props) {
  const { company } = useAuth();
  const router = useRouter();

  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const focusField = (name: string) => {
    refs.current[name]?.focus();
    refs.current[name]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const [quest, setQuest] = useState<JobQuest>(initialQuest);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedModule = quest.modules.find((m) => m.id === selectedId) || null;

  function updateQuest(patch: Partial<JobQuest>) {
    setQuest((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = quest.modules.findIndex((m) => m.id === active.id);
      const newIdx = quest.modules.findIndex((m) => m.id === over.id);
      updateQuest({ modules: arrayMove(quest.modules, oldIdx, newIdx) });
    }
  }

  function addModule(type: ModuleType) {
    const newModule = createModule(type);
    updateQuest({ modules: [...quest.modules, newModule] });
    setSelectedId(newModule.id);
  }

  function deleteModule(id: string) {
    if (selectedId === id) setSelectedId(null);
    updateQuest({ modules: quest.modules.filter((m) => m.id !== id) });
  }

  function duplicateModule(id: string) {
    const idx = quest.modules.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const copy = { ...quest.modules[idx], id: crypto.randomUUID() };
    const newModules = [...quest.modules];
    newModules.splice(idx + 1, 0, copy);
    updateQuest({ modules: newModules });
  }

  function updateModule(updated: QuestModule) {
    updateQuest({ modules: quest.modules.map((m) => (m.id === updated.id ? updated : m)) });
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    questStorage.save({ ...quest, updatedAt: new Date().toISOString() });
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [quest]);

  async function handlePublish() {
    setPublishing(true);
    const slug = quest.slug || generateSlug(quest.title);
    const updated: JobQuest = {
      ...quest,
      status: 'published',
      slug,
      publishedAt: quest.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuest(updated);
    questStorage.save(updated);
    await new Promise((r) => setTimeout(r, 400));
    setPublishing(false);
    setJustPublished(true);
    setShowQR(true);
  }

  async function handleGenerate() {
    if (!company || !jobTitle.trim()) return;
    setGenerating(true);
    setShowGenModal(false);
    await new Promise((r) => setTimeout(r, 800));
    const generated = generateMockStory(company, jobTitle.trim());
    updateQuest({ modules: generated, title: quest.title || `${jobTitle} bei ${company.name}` });
    setSelectedId(null);
    setGenerating(false);
  }

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/jobquest/${quest.slug}` : '';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Editor Topbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ←
        </button>
        <input
          type="text"
          value={quest.title}
          onChange={(e) => updateQuest({ title: e.target.value })}
          className="flex-1 text-base font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-400"
          placeholder="Quest-Titel eingeben…"
        />

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Generate */}
          <button
            onClick={() => setShowGenModal(true)}
            disabled={generating}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Sparkles size={13} className="text-violet-500" />
            {generating ? 'Generiert…' : 'KI-Story'}
          </button>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5">
            {saving ? <span className="animate-spin">⟳</span> : <Save size={13} />}
            {saved ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Gespeichert</span> : 'Speichern'}
          </button>

          {/* Publish + preview/copy parity with FunnelEditor */}
            {quest.status === 'published' && (
              <>
                <a href={`/jobquest/${quest.slug}`} target="_blank" onClick={() => questStorage.save(quest)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                  <Eye size={14} /> Vorschau
                </a>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(publicUrl).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                  title="Link kopieren">
                  {copied ? <CheckCircle size={14} className="text-green-600" /> : <LinkIcon size={14} />}
                </button>
              </>
            )}

            {quest.status === 'draft' ? (
              <button onClick={handlePublish} disabled={publishing} className="btn-primary text-xs py-1.5">
                <Globe size={13} />
                {publishing ? 'Wird veröffentlicht…' : 'Veröffentlichen'}
              </button>
            ) : (
              <button onClick={() => setShowQR(true)} className="btn-secondary text-xs py-1.5 text-green-600 border-green-200 bg-green-50 hover:bg-green-100">
                <Globe size={13} className="text-green-600" />
                Veröffentlicht
              </button>
            )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Col 1: Module List */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Module ({quest.modules.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={quest.modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                {quest.modules.map((module, idx) => (
                  <SortableModuleItem
                    key={module.id}
                    module={module}
                    index={idx}
                    isSelected={selectedId === module.id}
                    onSelect={() => setSelectedId(module.id)}
                    onDelete={() => deleteModule(module.id)}
                    onDuplicate={() => duplicateModule(module.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {quest.modules.length === 0 && (
              <div className="text-center py-8 px-2">
                <p className="text-xs text-slate-400 mb-2">Noch keine Module</p>
                <p className="text-xs text-slate-300">Füge dein erstes Modul hinzu</p>
              </div>
            )}

            {/* Lead Form (fixed, clickable) */}
            <div
              onClick={() => setSelectedId('__lead__')}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                selectedId === '__lead__'
                  ? 'bg-violet-50 border-violet-300 shadow-sm'
                  : 'bg-white border-dashed border-slate-300 hover:border-slate-400'
              }`}
            >
              <span className="text-base">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400">Abschluss</p>
                <p className="text-sm text-slate-600 truncate">Bewerbungsformular</p>
              </div>
              <Edit2 size={12} className="text-slate-300 flex-shrink-0" />
            </div>
          </div>

          <div className="p-2 border-t border-slate-100">
            <AddModuleButton onAdd={addModule} />
          </div>
        </div>

        {/* Col 2: Inline Editor */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-hidden flex flex-col">
          {selectedId === '__lead__' ? (
            <LeadConfigForm
              config={quest.leadConfig ?? DEFAULT_LEAD_CONFIG}
              onChange={(c) => updateQuest({ leadConfig: c })}
              onClose={() => setSelectedId(null)}
            />
          ) : selectedModule ? (
            <ModuleForm
              key={selectedModule.id}
              module={selectedModule}
              onChange={updateModule}
              onClose={() => setSelectedId(null)}
              fieldRefs={refs}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MousePointer2 size={28} className="text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Modul auswählen</p>
              <p className="text-xs text-slate-400 mt-1">Klicke auf ein Modul in der Liste</p>
            </div>
          )}
        </div>

        {/* Col 3: Live Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          <EditorPreview
            quest={quest}
            singleModule={selectedModule}
            onFieldClick={selectedModule ? focusField : undefined}
            design={company?.corporateDesign}
          />
        </div>
      </div>

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-violet-500" />
                <h2 className="text-lg font-semibold text-slate-900">Story automatisch generieren</h2>
              </div>
              <button onClick={() => setShowGenModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 mb-4 text-sm text-violet-700">
              <p>Wir generieren eine komplette Story-Struktur basierend auf deinem Firmenprofil. Du kannst alle Inhalte danach noch bearbeiten.</p>
            </div>

            {quest.modules.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2 text-sm text-amber-700">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>Vorhandene Module werden durch die generierten Inhalte ersetzt.</span>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Ausbildungsberuf *</label>
              <input
                className="input-field"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="z. B. Mechatroniker:in, Kaufmann/-frau im Einzelhandel"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowGenModal(false)} className="btn-secondary flex-1 justify-center">
                Abbrechen
              </button>
              <button
                onClick={handleGenerate}
                disabled={!jobTitle.trim()}
                className="btn-primary flex-1 justify-center"
              >
                <Sparkles size={14} />
                Generieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Config Modal is rendered inline in the right panel, not as modal */}

      {/* QR Code Modal – opens on first publish AND when clicking "Veröffentlicht" */}
      {showQR && quest.status === 'published' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                {justPublished ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Globe size={15} className="text-violet-600" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">
                    {justPublished ? 'Veröffentlicht!' : 'QR-Code & Link'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {justPublished ? 'Deine JobQuest ist jetzt live.' : quest.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowQR(false); setJustPublished(false); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* QR Code */}
            <div
              ref={qrContainerRef}
              className="flex justify-center mb-4 p-5 bg-white rounded-xl border border-slate-100"
            >
              <QRCodeCanvas value={publicUrl} size={192} level="H" marginSize={1} />
            </div>

            {/* URL row */}
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
              <p className="text-xs font-mono text-slate-700 flex-1 truncate">{publicUrl}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 flex-shrink-0 transition-colors"
                title="Link kopieren"
              >
                {copied ? <CheckCircle size={13} className="text-green-500" /> : <LinkIcon size={13} />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const canvas = qrContainerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
                  if (!canvas) return;
                  const url = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${quest.slug || 'jobquest'}-qr.png`;
                  a.click();
                }}
                className="btn-secondary flex-1 justify-center text-sm"
              >
                <Download size={14} />
                QR herunterladen
              </button>
              <button
                onClick={() => { setShowQR(false); setJustPublished(false); }}
                className="btn-primary flex-1 justify-center text-sm"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
