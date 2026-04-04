'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { careerCheckStorage } from '@/lib/storage';
import {
  CareerCheck, BerufsCheckBlock, BerufsCheckBlockType,
  Dimension, BLOCK_LABELS, DIMENSION_COLORS,
} from '@/lib/types';
import { DEFAULT_BLOCK_PROPS } from '@/lib/funnel-types';
import {
  ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Eye, Globe, Settings, List, Copy, Check, Sparkles, ArrowRight,
  CheckCircle, X, Link as LinkIcon, MousePointer2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { InlineBlockEditor, FieldRefs } from './editors/InlineEditors';
import { BlockPreview } from './BlockPreview';

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }

function createBlock(type: BerufsCheckBlockType): BerufsCheckBlock {
  switch (type) {
    case 'intro':              return { id: uid(), type: 'intro', headline: 'Willkommen beim Berufscheck!', subtext: 'Finde heraus, welcher Beruf zu dir passt.', buttonText: 'Jetzt starten' };
    case 'vorname':            return { id: uid(), type: 'vorname', question: 'Wie heißt du?', placeholder: 'Dein Vorname', buttonText: 'Weiter' };
    case 'selbsteinschaetzung':return { id: uid(), type: 'selbsteinschaetzung', question: 'Wie sehr trifft das auf dich zu?', sliderMin: 0, sliderMax: 10, sliderStep: 1, sliderLabelMin: 'Gar nicht', sliderLabelMax: 'Sehr stark' };
    case 'frage':              return { id: uid(), type: 'frage', frageType: 'single_choice', question: 'Neue Frage', options: [{ id: uid(), text: 'Option A', scores: {} }, { id: uid(), text: 'Option B', scores: {} }] };
    case 'ergebnisfrage':      return { id: uid(), type: 'ergebnisfrage', question: 'Welche Aussage trifft am ehesten auf dich zu?', options: [{ id: uid(), text: 'Option A', scores: {} }, { id: uid(), text: 'Option B', scores: {} }] };
    case 'text':               return { id: uid(), type: 'text', headline: '', content: 'Hier steht dein Text...', buttonText: 'Weiter' };
    case 'lead':               return { id: uid(), type: 'lead', ...DEFAULT_BLOCK_PROPS.check_lead } as BerufsCheckBlock;
    case 'ergebnis':           return { id: uid(), type: 'ergebnis', headline: 'Dein Ergebnis, {{name}}!', subtext: 'Hier siehst du, welche Berufsfelder am besten zu dir passen.', showDimensionBars: true };
    case 'button':             return { id: uid(), type: 'button', text: 'Mehr erfahren', url: '', style: 'primary' };
  }
}

const BLOCK_COLORS: Record<BerufsCheckBlockType, string> = {
  intro:              'bg-violet-100 text-violet-700',
  vorname:            'bg-blue-100   text-blue-700',
  selbsteinschaetzung:'bg-cyan-100   text-cyan-700',
  frage:              'bg-amber-100  text-amber-700',
  ergebnisfrage:      'bg-orange-100 text-orange-700',
  text:               'bg-slate-200  text-slate-600',
  lead:               'bg-green-100  text-green-700',
  ergebnis:           'bg-pink-100   text-pink-700',
  button:             'bg-slate-100  text-slate-700',
};

// ── Setup wizard ──────────────────────────────────────────────────────────────
function SetupWizard({ onComplete }: { onComplete: (dims: Dimension[]) => void }) {
  const [dims, setDims] = useState<Dimension[]>([
    { id: uid(), name: '', color: DIMENSION_COLORS[0] },
    { id: uid(), name: '', color: DIMENSION_COLORS[1] },
  ]);

  function addDim() {
    const colorIdx = dims.length % DIMENSION_COLORS.length;
    setDims((d) => [...d, { id: uid(), name: '', color: DIMENSION_COLORS[colorIdx] }]);
  }

  function updateDim(id: string, partial: Partial<Dimension>) {
    setDims((d) => d.map((dim) => (dim.id === id ? { ...dim, ...partial } : dim)));
  }

  function deleteDim(id: string) {
    setDims((d) => d.filter((dim) => dim.id !== id));
  }

  const canFinish = dims.length >= 2 && dims.every((d) => d.name.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-8 py-7 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <span className="text-sm font-medium text-violet-200">Berufscheck einrichten</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Berufsfelder definieren</h2>
          <p className="text-violet-200 text-sm leading-relaxed">
            Berufsfelder sind die Kategorien, in denen du Teilnehmer bewertest.
            Die Antworten auf deine Fragen vergeben Punkte pro Berufsfeld –
            am Ende sieht man, welches am besten passt.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Berufsfelder <span className="normal-case font-normal text-slate-400">(mindestens 2)</span>
          </p>

          <div className="space-y-2">
            {dims.map((dim, idx) => (
              <div key={dim.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
                <input
                  type="color"
                  value={dim.color ?? '#7c3aed'}
                  onChange={(e) => updateDim(dim.id, { color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 flex-shrink-0"
                  title="Farbe wählen"
                />
                <input
                  value={dim.name}
                  onChange={(e) => updateDim(dim.id, { name: e.target.value })}
                  placeholder={`z. B. ${['Technik & IT', 'Soziales & Pflege', 'Handwerk', 'Büro & Verwaltung', 'Kreatives & Medien'][idx] ?? 'Berufsfeld'}`}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                  autoFocus={idx === 0}
                  onKeyDown={(e) => e.key === 'Enter' && addDim()}
                />
                {dims.length > 2 && (
                  <button
                    onClick={() => deleteDim(dim.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addDim}
            className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 transition-colors"
          >
            <Plus size={13} />
            Weiteres Berufsfeld hinzufügen
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 pb-7">
          <button
            onClick={() => onComplete(dims.map((d) => ({ ...d, name: d.name.trim() })))}
            disabled={!canFinish}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Berufscheck erstellen
            <ArrowRight size={16} />
          </button>
          {!canFinish && (
            <p className="text-center text-xs text-slate-400 mt-2">
              Bitte gib mindestens 2 Berufsfelder an.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Editor ───────────────────────────────────────────────────────────────
export function BerufsCheckEditorClient({ checkId }: { checkId: string }) {
  const { company } = useAuth();
  const router = useRouter();

  const [check, setCheck] = useState<CareerCheck | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showPublishInfo, setShowPublishInfo] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'blocks' | 'settings'>('blocks');
  const [saved, setSaved] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const loadCheck = useCallback(async () => {
    const c = await careerCheckStorage.getById(checkId);
    if (!c) { router.push('/dashboard'); return; }
    setCheck(c);
    // Show wizard if no dimensions defined yet
    if (c.dimensions.length === 0) setShowWizard(true);
  }, [checkId, router]);

  useEffect(() => { loadCheck(); }, [loadCheck]);

  function updateCheck(partial: Partial<CareerCheck>) {
    if (!check) return;
    const updated = { ...check, ...partial, updatedAt: new Date().toISOString() };
    setCheck(updated);
    careerCheckStorage.save(updated);
    setSaved(true);
  }

  function updateBlocks(blocks: BerufsCheckBlock[]) { updateCheck({ blocks }); }
  function updateDimensions(dimensions: Dimension[]) { updateCheck({ dimensions }); }

  function handleWizardComplete(dims: Dimension[]) {
    updateDimensions(dims);
    setShowWizard(false);
  }

  function addBlock(type: BerufsCheckBlockType) {
    if (!check) return;
    const block = createBlock(type);
    updateBlocks([...check.blocks, block]);
    setSelectedBlockId(block.id);
  }

  function deleteBlock(id: string) {
    if (!check) return;
    if (selectedBlockId === id) setSelectedBlockId(null);
    updateBlocks(check.blocks.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    if (!check) return;
    const idx = check.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= check.blocks.length) return;
    const arr = [...check.blocks];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    updateBlocks(arr);
  }

  function duplicateBlock(id: string) {
    if (!check) return;
    const idx = check.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = { ...check.blocks[idx], id: uid() };
    const arr = [...check.blocks];
    arr.splice(idx + 1, 0, copy);
    updateBlocks(arr);
    setSelectedBlockId(copy.id);
  }

  function updateBlock(updated: BerufsCheckBlock) {
    if (!check) return;
    updateBlocks(check.blocks.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function handlePublish() {
    if (!check) return;
    setPublishing(true);
    const isPublished = check.status === 'published';
    updateCheck({
      status: isPublished ? 'draft' : 'published',
      publishedAt: isPublished ? undefined : new Date().toISOString(),
    });
    setTimeout(() => {
      setPublishing(false);
      if (!isPublished) setShowPublishInfo(true);
    }, 500);
  }

  if (!check) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const focusField = (name: string) => {
    refs.current[name]?.focus();
    refs.current[name]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const selectedBlock = check.blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Setup wizard */}
      {showWizard && <SetupWizard onComplete={handleWizardComplete} />}

      {/* Publish Info Modal */}
      {showPublishInfo && check && (
        <PublishModal
          slug={check.slug}
          onShowQR={() => { setShowPublishInfo(false); setShowQR(true); }}
          onClose={() => setShowPublishInfo(false)}
        />
      )}

      {/* QR Code Modal */}
      {showQR && check && (
        <QRModal
          slug={check.slug}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Topbar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0 z-10">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          {titleEditing ? (
            <input
              autoFocus
              value={check.title}
              onChange={(e) => updateCheck({ title: e.target.value })}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setTitleEditing(false)}
              className="text-sm font-semibold text-slate-900 bg-transparent border-b border-violet-400 outline-none w-full max-w-xs"
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors truncate block max-w-xs text-left"
            >
              {check.title}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-slate-400">Gespeichert</span>}
          {check.status === 'published' && (
            <>
              <Link
                href={`/berufscheck/${check.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Eye size={14} />
                Vorschau
              </Link>
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="QR-Code anzeigen"
              >
                <LinkIcon size={14} />
                QR-Code
              </button>
            </>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              check.status === 'published'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {check.status === 'published'
              ? <><Globe size={14} /> Veröffentlicht</>
              : <><Globe size={14} /> Veröffentlichen</>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Col 1: Block list ───────────────────────────────────────────────── */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActivePanel('blocks')}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activePanel === 'blocks' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={13} />
              Blöcke
            </button>
            <button
              onClick={() => setActivePanel('settings')}
              className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activePanel === 'settings' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings size={13} />
              Berufsfelder
            </button>
          </div>

          {activePanel === 'blocks' ? (
            <BlocksPanel
              check={check}
              selectedBlockId={selectedBlockId}
              onSelect={setSelectedBlockId}
              onAdd={addBlock}
              onDelete={deleteBlock}
              onMove={moveBlock}
              onDuplicate={duplicateBlock}
            />
          ) : (
            <DimensionsPanel
              dimensions={check.dimensions}
              onChange={updateDimensions}
            />
          )}
        </aside>

        {/* ── Col 2: Inline editor ────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          {selectedBlock ? (
            <InlineBlockEditor
              block={selectedBlock}
              dimensions={check.dimensions}
              company={company?.name ?? ''}
              onChange={updateBlock}
              fieldRefs={refs}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MousePointer2 size={28} className="text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Block auswählen</p>
              <p className="text-xs text-slate-400 mt-1">Klicke links auf einen Block, um ihn zu bearbeiten.</p>
            </div>
          )}
        </div>

        {/* ── Col 3: Live preview ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-md mx-auto px-6 py-8">
            {selectedBlock ? (
              <BlockPreview
                block={selectedBlock}
                dimensions={check.dimensions}
                company={company?.name ?? ''}
                focusField={focusField}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-64 text-center py-12">
                <List size={40} className="mb-3 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">Kein Block ausgewählt</p>
                <p className="text-xs text-slate-400 mt-1">Wähle einen Block links aus.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Publish modals ────────────────────────────────────────────────────────────
function PublishModal({ slug, onShowQR, onClose }: {
  slug: string; onShowQR: () => void; onClose: () => void;
}) {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/berufscheck/${slug}`
    : `/berufscheck/${slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Veröffentlicht!</h2>
            <p className="text-sm text-slate-500">Dein Berufscheck ist jetzt öffentlich zugänglich.</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-slate-500 mb-1">Öffentliche URL:</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono text-slate-800 flex-1 truncate">{publicUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="text-violet-600 hover:text-violet-700 flex-shrink-0"
              title="Link kopieren"
            >
              <LinkIcon size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={onShowQR}
          className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          QR-Code anzeigen
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
        >
          Fertig
        </button>
      </div>
    </div>
  );
}

function QRModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/berufscheck/${slug}`
    : `/berufscheck/${slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">QR-Code</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="flex justify-center mb-4 p-4 bg-white rounded-xl border border-slate-100">
          <QRCodeSVG value={publicUrl} size={200} level="H" />
        </div>
        <p className="text-xs text-slate-500 mb-3 break-all font-mono">{publicUrl}</p>
        <button
          onClick={() => navigator.clipboard.writeText(publicUrl)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <LinkIcon size={14} />
          Link kopieren
        </button>
      </div>
    </div>
  );
}

// ── Blocks Panel ──────────────────────────────────────────────────────────────
function BlocksPanel({
  check, selectedBlockId, onSelect, onAdd, onDelete, onMove, onDuplicate,
}: {
  check: CareerCheck;
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BerufsCheckBlockType) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDuplicate: (id: string) => void;
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {check.blocks.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-xs text-slate-400">Noch keine Blöcke.</p>
            <p className="text-xs text-slate-400 mt-1">Füge deinen ersten Block hinzu.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {check.blocks.map((block, idx) => (
              <BlockListItem
                key={block.id}
                block={block}
                idx={idx}
                total={check.blocks.length}
                selected={block.id === selectedBlockId}
                onSelect={() => onSelect(block.id)}
                onDelete={() => onDelete(block.id)}
                onMoveUp={() => onMove(block.id, -1)}
                onMoveDown={() => onMove(block.id, 1)}
                onDuplicate={() => onDuplicate(block.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-100 relative">
        <button
          onClick={() => setShowAddMenu((v) => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Block hinzufügen
        </button>
        {showAddMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-20">
            {(Object.keys(BLOCK_LABELS) as BerufsCheckBlockType[]).map((type) => (
              <button
                key={type}
                onClick={() => { onAdd(type); setShowAddMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${BLOCK_COLORS[type]}`}>
                  {BLOCK_LABELS[type]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockListItem({
  block, idx, total, selected, onSelect, onDelete, onMoveUp, onMoveDown, onDuplicate,
}: {
  block: BerufsCheckBlock; idx: number; total: number; selected: boolean;
  onSelect: () => void; onDelete: () => void; onMoveUp: () => void;
  onMoveDown: () => void; onDuplicate: () => void;
}) {
  function getLabel() {
    switch (block.type) {
      case 'intro':              return block.headline || 'Intro';
      case 'vorname':            return block.question || 'Vorname';
      case 'selbsteinschaetzung':return block.question || 'Selbsteinschätzung';
      case 'frage':              return block.question || 'Frage';
      case 'ergebnisfrage':      return block.question || 'Ergebnisfrage';
      case 'text':               return block.headline || block.content.slice(0, 30) || 'Text';
      case 'lead':               return block.headline || 'Kontaktformular';
      case 'ergebnis':           return 'Ergebnis';
      case 'button':             return block.text || 'Button';
    }
  }

  return (
    <div
      onClick={onSelect}
      className={`group rounded-lg border cursor-pointer transition-all ${
        selected ? 'border-violet-300 bg-violet-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BLOCK_COLORS[block.type]}`}>
              {BLOCK_LABELS[block.type]}
            </span>
          </div>
          <p className="text-xs text-slate-700 truncate">{getLabel()}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={idx === 0}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <ChevronUp size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={idx === total - 1}
            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors">
            <ChevronDown size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-0.5 rounded hover:bg-slate-200 transition-colors">
            <Copy size={12} className="text-slate-500" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded hover:bg-red-100 transition-colors">
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dimensions Panel ──────────────────────────────────────────────────────────
function DimensionsPanel({ dimensions, onChange }: {
  dimensions: Dimension[];
  onChange: (dims: Dimension[]) => void;
}) {
  function addDimension() {
    const colorIdx = dimensions.length % DIMENSION_COLORS.length;
    onChange([...dimensions, { id: uid(), name: 'Neues Berufsfeld', color: DIMENSION_COLORS[colorIdx] }]);
  }

  function updateDim(id: string, partial: Partial<Dimension>) {
    onChange(dimensions.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  }

  function deleteDim(id: string) {
    onChange(dimensions.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {dimensions.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-xs text-slate-400">Noch keine Berufsfelder.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dimensions.map((dim) => (
              <div key={dim.id} className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="color"
                    value={dim.color ?? '#7c3aed'}
                    onChange={(e) => updateDim(dim.id, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={dim.name}
                    onChange={(e) => updateDim(dim.id, { name: e.target.value })}
                    className="flex-1 text-xs font-medium text-slate-800 bg-transparent border-b border-slate-300 focus:border-violet-400 outline-none py-0.5"
                    placeholder="Berufsfeld"
                  />
                  <button onClick={() => deleteDim(dim.id)}
                    className="p-0.5 rounded hover:bg-red-100 transition-colors flex-shrink-0">
                    <Trash2 size={11} className="text-red-400" />
                  </button>
                </div>
                <input
                  value={dim.description ?? ''}
                  onChange={(e) => updateDim(dim.id, { description: e.target.value })}
                  className="w-full text-xs text-slate-500 bg-transparent border-b border-slate-200 focus:border-violet-300 outline-none py-0.5"
                  placeholder="Beschreibung (optional)"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-slate-100">
        <button onClick={addDimension}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
          <Plus size={14} />
          Berufsfeld hinzufügen
        </button>
      </div>
    </div>
  );
}
