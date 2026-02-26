'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Globe, Eye, Undo2, Redo2, Check, Sparkles, Copy } from 'lucide-react';
import { FunnelDoc, FunnelContentType, FunnelPage, InsertTarget, FunnelNode, FunnelStyle, FunnelBlockType } from '@/lib/funnel-types';
import { funnelStorage } from '@/lib/funnel-storage';
import {
  createFunnelDoc, insertNode, deleteNode, updateNode, duplicateNode,
  addPage, deletePage, renamePage, duplicatePage, updatePage,
  reorderRootNodes, reorderColumnNodes, moveNodeBetweenContainers,
  createBlockNode,
} from '@/lib/funnel-ops';
import PageSidebar from './PageSidebar';
import BlockPanel from './BlockPanel';
import Canvas from './Canvas';
import Inspector from './Inspector';
import GenerateQuestModal from './GenerateQuestModal';

// ─── History hook ─────────────────────────────────────────────────────────────
function useHistory(initial: FunnelDoc) {
  const [past, setPast] = useState<FunnelDoc[]>([]);
  const [present, setPresent] = useState<FunnelDoc>(initial);
  const [future, setFuture] = useState<FunnelDoc[]>([]);

  const push = useCallback((next: FunnelDoc) => {
    setPast((p) => [...p.slice(-50), present]);
    setPresent(next);
    setFuture([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [present, ...f]);
    setPresent(prev);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, present]);
    setPresent(next);
  }, [future, present]);

  return { doc: present, push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface FunnelEditorProps {
  contentId: string;
  contentType: FunnelContentType;
  title: string;
  onTitleChange: (t: string) => void;
  slug: string;
  previewHref: string;
  status: 'draft' | 'published';
  onPublish: () => void;
  onBack: () => void;
  /** Extra panel rendered alongside inspector (e.g. dimension manager) */
  extraPanel?: React.ReactNode;
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
export default function FunnelEditor({
  contentId, contentType, title, onTitleChange,
  previewHref, status, onPublish, onBack, extraPanel,
}: FunnelEditorProps) {
  const [initialDoc] = useState(() => funnelStorage.getByContentId(contentId) ?? createFunnelDoc(contentId, contentType));
  const { doc, push, undo, redo, canUndo, canRedo } = useHistory(initialDoc);

  const [activePageId, setActivePageId] = useState(doc.pages[0]?.id ?? '');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [savedBriefly, setSavedBriefly] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // keep activePageId valid when pages change
  useEffect(() => {
    if (!doc.pages.find((p) => p.id === activePageId)) {
      setActivePageId(doc.pages[0]?.id ?? '');
    }
  }, [doc.pages, activePageId]);

  // autosave debounce
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => funnelStorage.save(doc), 1000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [doc]);

  function save() {
    funnelStorage.save(doc);
    setSavedBriefly(true);
    setTimeout(() => setSavedBriefly(false), 2000);
  }

  // ── keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (meta && e.key === 's') { e.preventDefault(); save(); return; }
      if (!isInput && selectedNodeId) {
        if (meta && e.key === 'd') { e.preventDefault(); handleDuplicate(selectedNodeId); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { handleDelete(selectedNodeId); return; }
        if (e.key === 'Escape') { setSelectedNodeId(null); setInsertTarget(null); return; }
      }
      if (e.key === 'Escape') { setInsertTarget(null); setSelectedNodeId(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, undo, redo]);

  // ── doc mutations ───────────────────────────────────────────────────────────
  const activePage = doc.pages.find((p) => p.id === activePageId);

  function handleInsertBlock(type: import('@/lib/funnel-types').FunnelBlockType, props: Record<string, unknown>, target: InsertTarget) {
    // quest_lead: only one per page, always insert at end
    if (type === 'quest_lead') {
      const alreadyExists = activePage?.nodes.some((n) => n.kind === 'block' && n.type === 'quest_lead');
      if (alreadyExists) { setInsertTarget(null); return; }
      const endTarget: InsertTarget = { location: 'root', afterId: activePage?.nodes.at(-1)?.id ?? null };
      const node = createBlockNode(type, props);
      push(insertNode(doc, activePageId, node, endTarget));
      setSelectedNodeId(node.id);
      setInsertTarget(null);
      return;
    }
    const node = createBlockNode(type, props);
    push(insertNode(doc, activePageId, node, target));
    setSelectedNodeId(node.id);
    setInsertTarget(null);
  }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function isNodeLocked(_nodeId: string): boolean {
    return false;
  }

  function handleDelete(nodeId: string) {
    push(deleteNode(doc, activePageId, nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }

  function handleDuplicate(nodeId: string) {
    push(duplicateNode(doc, activePageId, nodeId));
  }

  function handleUpdateNode(nodeId: string, patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }) {
    push(updateNode(doc, activePageId, nodeId, patch));
  }

  function handleReorderRoot(fromIdx: number, toIdx: number) {
    push(reorderRootNodes(doc, activePageId, fromIdx, toIdx));
  }

  function handleReorderColumn(columnId: string, fromIdx: number, toIdx: number) {
    push(reorderColumnNodes(doc, activePageId, columnId, fromIdx, toIdx));
  }

  function handleMoveToContainer(nodeId: string, targetContainer: 'root' | string, afterId: string | null) {
    push(moveNodeBetweenContainers(doc, activePageId, nodeId, targetContainer, afterId));
  }

  // ── page mutations ──────────────────────────────────────────────────────────
  // Structural page operations save immediately (no debounce) so the live page
  // always reflects the current state when opened in a new tab.
  function handleAddPage() {
    const { doc: next, newPageId } = addPage(doc);
    push(next);
    funnelStorage.save(next);
    setActivePageId(newPageId);
    setSelectedNodeId(null);
  }

  function handleDeletePage(pageId: string) {
    const next = deletePage(doc, pageId);
    push(next);
    funnelStorage.save(next);
    if (activePageId === pageId) setActivePageId(next.pages[0]?.id ?? '');
    setSelectedNodeId(null);
  }

  function handleRenamePage(pageId: string, name: string) {
    const next = renamePage(doc, pageId, name);
    push(next);
    funnelStorage.save(next);
  }

  function handleReorderPages(newPages: import('@/lib/funnel-types').FunnelPage[]) {
    const next = { ...doc, pages: newPages };
    push(next);
    funnelStorage.save(next);
  }

  function handleUpdatePage(patch: Partial<FunnelPage>) {
    if (!activePageId) return;
    const next = updatePage(doc, activePageId, patch);
    push(next);
    funnelStorage.save(next);
  }

  function handleDuplicatePage(pageId: string) {
    const { doc: next, newPageId } = duplicatePage(doc, pageId);
    push(next);
    funnelStorage.save(next);
    setActivePageId(newPageId);
  }

  // ── insert from block panel (appends after selected node or at end) ─────────
  function handleInsertFromPanel(type: FunnelBlockType, props: Record<string, unknown>) {
    const afterId = selectedNodeId ?? (activePage?.nodes.at(-1)?.id ?? null);
    const target: InsertTarget = { location: 'root', afterId };
    handleInsertBlock(type, props, target);
  }

// ── AI generation ───────────────────────────────────────────────────────────
  function handleGenerateQuest(pages: FunnelPage[]) {
    const next = { ...doc, pages };
    push(next);
    funnelStorage.save(next);
    setActivePageId(pages[0]?.id ?? '');
    setSelectedNodeId(null);
    setShowGenerateModal(false);
  }

  // ── selected node ───────────────────────────────────────────────────────────
  const selectedNode: FunnelNode | null = (() => {
    if (!selectedNodeId || !activePage) return null;
    for (const n of activePage.nodes) {
      if (n.id === selectedNodeId) return n;
      if (n.kind === 'layout') {
        for (const col of n.columns) {
          const found = col.nodes.find((cn) => cn.id === selectedNodeId);
          if (found) return found;
        }
      }
    }
    return null;
  })();

  return (
    <>
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center gap-3 px-4 bg-white border-b border-slate-200 flex-shrink-0 z-20">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>

        {/* Title */}
        <input
          type="text" value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 min-w-0 text-sm font-semibold text-slate-900 bg-transparent border-none outline-none truncate hover:bg-slate-50 focus:bg-slate-50 rounded px-1.5 py-1 -ml-1.5"
        />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={undo} disabled={!canUndo} title="Rückgängig (⌘Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <Undo2 size={15} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Wiederholen (⌘⇧Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors">
            <Redo2 size={15} />
          </button>
        </div>

        {/* AI Generate – quest only */}
        {contentType === 'quest' && (
          <button onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0 border border-violet-200">
            <Sparkles size={13} /> KI generieren
          </button>
        )}

        {/* Preview + Copy link */}
        {status === 'published' && (
          <>
            <Link href={previewHref} target="_blank" onClick={() => funnelStorage.save(doc)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <Eye size={14} /> Vorschau
            </Link>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}${previewHref}`).catch(() => {});
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              title="Link kopieren">
              {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </>
        )}

        {/* Save */}
        <button onClick={save}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
            savedBriefly ? 'text-emerald-700 bg-emerald-50' : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}>
          {savedBriefly ? <><Check size={14} /> Gespeichert</> : <><Save size={14} /> Speichern</>}
        </button>

        {/* Publish */}
        <button onClick={onPublish}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors flex-shrink-0 ${
            status === 'published'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}>
          <Globe size={14} />
          {status === 'published' ? 'Veröffentlicht' : 'Veröffentlichen'}
        </button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left – Page sidebar */}
        <PageSidebar
          pages={doc.pages}
          activePageId={activePageId}
          onSelectPage={(id) => { setActivePageId(id); setSelectedNodeId(null); }}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onReorderPages={handleReorderPages}
          onDuplicatePage={handleDuplicatePage}
        />

        {/* Left – Block panel */}
        <BlockPanel
          contentType={contentType}
          onInsertBlock={handleInsertFromPanel}
        />

        {/* Center – Canvas */}
        <Canvas
          page={activePage ?? null}
          contentType={contentType}
          selectedNodeId={selectedNodeId}
          insertTarget={insertTarget}
          onSelectNode={(id) => { setSelectedNodeId(id); setInsertTarget(null); }}
          onDeselectNode={() => setSelectedNodeId(null)}
          onSetInsertTarget={setInsertTarget}
          onInsertBlock={handleInsertBlock}
          onDeleteNode={handleDelete}
          onDuplicateNode={handleDuplicate}
          onUpdateNode={handleUpdateNode}
          onReorderRoot={handleReorderRoot}
          onReorderColumn={handleReorderColumn}
          onMoveToContainer={handleMoveToContainer}
        />

        {/* Right – Inspector */}
        <Inspector
          node={selectedNode}
          contentType={contentType}
          isLocked={selectedNodeId ? isNodeLocked(selectedNodeId) : false}
          onUpdate={(patch) => selectedNodeId && handleUpdateNode(selectedNodeId, patch)}
          onDelete={() => selectedNodeId && handleDelete(selectedNodeId)}
          onDuplicate={() => selectedNodeId && handleDuplicate(selectedNodeId)}
          extraPanel={extraPanel}
          pages={doc.pages}
          currentPage={activePage}
          onUpdatePage={handleUpdatePage}
        />
      </div>
    </div>

    {showGenerateModal && (
      <GenerateQuestModal
        onGenerate={handleGenerateQuest}
        onClose={() => setShowGenerateModal(false)}
      />
    )}
    </>
  );
}
