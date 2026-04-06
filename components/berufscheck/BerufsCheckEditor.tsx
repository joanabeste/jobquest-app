'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { careerCheckStorage } from '@/lib/storage';
import { CareerCheck, BerufsCheckBlock, BerufsCheckBlockType, Dimension } from '@/lib/types';
import { getDefaultProps } from '@/lib/funnel-types';
import { ArrowLeft, Eye, Globe, Settings, List, MousePointer2, Link as LinkIcon } from 'lucide-react';
import { InlineBlockEditor } from './editors/InlineEditors';
import { BlockPreview } from './BlockPreview';
import { SetupWizard, PublishModal, QRModal } from './Modals';
import { BlocksPanel, DimensionsPanel } from './Panels';

function uid() { return crypto.randomUUID(); }

function createBlock(type: BerufsCheckBlockType): BerufsCheckBlock {
  switch (type) {
    case 'intro':              return { id: uid(), type: 'intro', headline: 'Willkommen beim Berufscheck!', subtext: 'Finde heraus, welcher Beruf zu dir passt.', buttonText: 'Jetzt starten' };
    case 'vorname':            return { id: uid(), type: 'vorname', question: 'Wie heißt du?', placeholder: 'Dein Vorname', buttonText: 'Weiter' };
    case 'selbsteinschaetzung':return { id: uid(), type: 'selbsteinschaetzung', question: 'Wie sehr trifft das auf dich zu?', sliderMin: 0, sliderMax: 10, sliderStep: 1, sliderLabelMin: 'Gar nicht', sliderLabelMax: 'Sehr stark' };
    case 'frage':              return { id: uid(), type: 'frage', frageType: 'single_choice', question: 'Neue Frage', options: [{ id: uid(), text: 'Option A', scores: {} }, { id: uid(), text: 'Option B', scores: {} }] };
    case 'ergebnisfrage':      return { id: uid(), type: 'ergebnisfrage', question: 'Welche Aussage trifft am ehesten auf dich zu?', options: [{ id: uid(), text: 'Option A', scores: {} }, { id: uid(), text: 'Option B', scores: {} }] };
    case 'text':               return { id: uid(), type: 'text', headline: '', content: 'Hier steht dein Text...', buttonText: 'Weiter' };
    case 'lead':               return { id: uid(), type: 'lead', ...getDefaultProps('check_lead') } as BerufsCheckBlock;
    case 'ergebnis':           return { id: uid(), type: 'ergebnis', headline: 'Dein Ergebnis, @firstName!', subtext: 'Hier siehst du, welche Berufsfelder am besten zu dir passen.', showDimensionBars: true };
    case 'button':             return { id: uid(), type: 'button', text: 'Mehr erfahren', url: '', style: 'primary' };
  }
}

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
      {showWizard && <SetupWizard onComplete={(dims) => { updateDimensions(dims); setShowWizard(false); }} />}
      {showPublishInfo && <PublishModal slug={check.slug} onShowQR={() => { setShowPublishInfo(false); setShowQR(true); }} onClose={() => setShowPublishInfo(false)} />}
      {showQR && <QRModal slug={check.slug} onClose={() => setShowQR(false)} />}

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
            <button onClick={() => setTitleEditing(true)} className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors truncate block max-w-xs text-left">
              {check.title}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-slate-400">Gespeichert</span>}
          {check.status === 'published' && (
            <>
              <Link href={`/berufscheck/${check.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Eye size={14} /> Vorschau
              </Link>
              <button onClick={() => setShowQR(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="QR-Code anzeigen">
                <LinkIcon size={14} /> QR-Code
              </button>
            </>
          )}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              check.status === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            <Globe size={14} /> {check.status === 'published' ? 'Veröffentlicht' : 'Veröffentlichen'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button onClick={() => setActivePanel('blocks')} className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activePanel === 'blocks' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={13} /> Blöcke
            </button>
            <button onClick={() => setActivePanel('settings')} className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${activePanel === 'settings' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <Settings size={13} /> Berufsfelder
            </button>
          </div>
          {activePanel === 'blocks' ? (
            <BlocksPanel check={check} selectedBlockId={selectedBlockId} onSelect={setSelectedBlockId} onAdd={addBlock} onDelete={deleteBlock} onMove={moveBlock} onDuplicate={duplicateBlock} />
          ) : (
            <DimensionsPanel dimensions={check.dimensions} onChange={updateDimensions} />
          )}
        </aside>

        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          {selectedBlock ? (
            <InlineBlockEditor block={selectedBlock} dimensions={check.dimensions} company={company?.name ?? ''} onChange={updateBlock} fieldRefs={refs} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <MousePointer2 size={28} className="text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">Block auswählen</p>
              <p className="text-xs text-slate-400 mt-1">Klicke links auf einen Block, um ihn zu bearbeiten.</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100">
          <div className="max-w-md mx-auto px-6 py-8">
            {selectedBlock ? (
              <BlockPreview block={selectedBlock} dimensions={check.dimensions} company={company?.name ?? ''} focusField={focusField} />
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
