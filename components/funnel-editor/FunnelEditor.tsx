'use client';

import { useEffect, useRef, useState } from 'react';
import { useFunnelHistory } from '@/hooks/useFunnelHistory';
import Link from 'next/link';
import { ArrowLeft, Save, Globe, Eye, Undo2, Redo2, Check, Sparkles, GitBranch, LayoutTemplate, Mail, QrCode } from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import { FunnelDoc, FunnelContentType, FunnelPage, InsertTarget, FunnelNode, FunnelStyle, BlockNode, EmailConfig } from '@/lib/funnel-types';
import { getAvailableVariables, EMAIL_VARIABLES } from '@/lib/funnel-variables';
import { funnelStorage } from '@/lib/funnel-storage';
import {
  createFunnelDoc, insertNode, deleteNode, updateNode, duplicateNode,
  addPage, deletePage, renamePage, duplicatePage, updatePage,
  reorderRootNodes, reorderColumnNodes, moveNodeBetweenContainers,
  createBlockNode,
} from '@/lib/funnel-ops';
import { useAuth } from '@/contexts/AuthContext';
import { useCorporateDesign } from '@/lib/use-corporate-design';
import { CIContext } from '@/lib/ci-context';
import { FunnelEditorContext } from './FunnelEditorContext';
import PageSidebar from './PageSidebar';
import Canvas from './Canvas';
import Inspector from './Inspector';
import GenerateQuestModal from './GenerateQuestModal';
import FlowView from './FlowView';
import EmailConfigModal from './EmailConfigModal';

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
  slug, previewHref, status, onPublish, onBack, extraPanel,
}: FunnelEditorProps) {
  const [initialDoc, setInitialDoc] = useState<FunnelDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const existing = await funnelStorage.getByContentIdAuth(contentId);
      setInitialDoc(existing ?? createFunnelDoc(contentId, contentType));
      setLoading(false);
    }
    load();
  }, [contentId, contentType]);

  if (loading || !initialDoc) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <FunnelEditorInner
    initialDoc={initialDoc}
    contentType={contentType} title={title} onTitleChange={onTitleChange}
    slug={slug} previewHref={previewHref} status={status} onPublish={onPublish} onBack={onBack} extraPanel={extraPanel}
  />;
}

function FunnelEditorInner({
  initialDoc, contentType, title, onTitleChange,
  slug: _slug, previewHref, status, onPublish, onBack, extraPanel,
}: Omit<FunnelEditorProps, 'contentId'> & { initialDoc: FunnelDoc }) {
  const { company } = useAuth();
  const ci = useCorporateDesign(company ?? { id: '', name: '', contactName: '', contactEmail: '', createdAt: '' });

  const { doc, push, undo, redo, canUndo, canRedo } = useFunnelHistory(initialDoc);

  const [activePageId, setActivePageId] = useState(doc.pages[0]?.id ?? '');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [publishing, setPublishing] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [view, setView] = useState<'canvas' | 'flow'>('canvas');

  // Local draft for the title input — only commits on blur or Enter
  const [draftTitle, setDraftTitle] = useState(title);
  const prevTitleRef = useRef(title);
  useEffect(() => {
    if (title !== prevTitleRef.current) {
      setDraftTitle(title);
      prevTitleRef.current = title;
    }
  }, [title]);

  const companyContext: Record<string, string> = {
    companyName:      company?.name ?? '',
    datenschutzUrl:   company?.privacyUrl ?? '',
    impressumUrl:     company?.imprintUrl ?? '',
    karriereseiteUrl: company?.careerPageUrl ?? '',
  };
  const availableVars = getAvailableVariables(doc.pages.flatMap((p) => p.nodes), companyContext);

  // keep activePageId valid when pages change
  useEffect(() => {
    if (!doc.pages.find((p) => p.id === activePageId)) {
      setActivePageId(doc.pages[0]?.id ?? '');
    }
  }, [doc.pages, activePageId]);

  // reset field selection when the selected block changes

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    setSaveStatus('saving');
    await funnelStorage.save(doc);
    setSaveStatus('saved');
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }

  // ── keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT' || target.isContentEditable;

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
    const node = createBlockNode(type, props);
    push(insertNode(doc, activePageId, node, target));
    setSelectedNodeId(node.id);
    setInsertTarget(null);
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

  // ── flow view: update any page (not just active) ─────────────────────────
  function handleUpdateAnyPage(pageId: string, patch: Partial<FunnelPage>) {
    const next = updatePage(doc, pageId, patch);
    push(next);
    funnelStorage.save(next);
  }

  function handleUpdateDecisionOption(
    pageId: string,
    nodeId: string,
    optionId: string,
    targetPageId: string | undefined,
  ) {
    const page = doc.pages.find((p) => p.id === pageId);
    const node = page?.nodes.find((n) => n.id === nodeId) as BlockNode | undefined;
    if (!node || node.kind !== 'block') return;
    const options = (node.props.options as { id: string; [k: string]: unknown }[]).map((opt) =>
      opt.id === optionId ? { ...opt, targetPageId } : opt,
    );
    push(updateNode(doc, pageId, nodeId, { props: { ...node.props, options } }));
  }

  // ── email config ────────────────────────────────────────────────────────────
  function handleSaveEmailConfig(emailConfig: EmailConfig) {
    const next = { ...doc, emailConfig };
    push(next);
    funnelStorage.save(next);
  }

  // ── AI generation ───────────────────────────────────────────────────────────
  function handleGenerateQuest(pages: FunnelPage[], jobTitle: string) {
    const next = { ...doc, pages };
    push(next);
    funnelStorage.save(next);
    setActivePageId(pages[0]?.id ?? '');
    setSelectedNodeId(null);
    setShowGenerateModal(false);
    if (jobTitle) onTitleChange(jobTitle);
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
      <header className="h-[52px] flex items-center gap-2 px-3 bg-white border-b border-slate-200 flex-shrink-0 z-20 overflow-x-auto">

        {/* Back */}
        <button onClick={onBack} title="Zurück"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
          <ArrowLeft size={17} />
        </button>

        {/* Title */}
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => {
            const trimmed = draftTitle.trim();
            const next = trimmed || title;
            setDraftTitle(next);
            if (next !== title) onTitleChange(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.currentTarget.blur(); }
            if (e.key === 'Escape') { setDraftTitle(title); e.currentTarget.blur(); }
          }}
          className="min-w-0 flex-shrink w-32 lg:w-44 text-[13px] font-semibold text-slate-800 bg-transparent border-none outline-none hover:bg-slate-50 focus:bg-slate-100 rounded-lg px-2 py-1 transition-colors"
        />

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={undo} disabled={!canUndo} title="Rückgängig (⌘Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 transition-colors">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Wiederholen (⌘⇧Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 transition-colors">
            <Redo2 size={14} />
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => setView('canvas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
              view === 'canvas'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutTemplate size={12} /> Canvas
          </button>
          <button
            onClick={() => setView('flow')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
              view === 'flow'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <GitBranch size={12} /> Flow
          </button>
        </div>

        {/* AI Generate – quest only */}
        {contentType === 'quest' && (
          <>
            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
            <button onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0 border border-violet-200">
              <Sparkles size={12} /> KI
            </button>
          </>
        )}

        {/* E-Mail config */}
        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
        <button onClick={() => setShowEmailConfig(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
          <Mail size={12} /> E-Mails
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview + Copy link */}
        {status === 'published' && (
          <>
            <Link href={previewHref} target="_blank" onClick={() => funnelStorage.save(doc)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <Eye size={13} /> Vorschau
            </Link>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              title="Teilen & QR-Code">
              <QrCode size={13} /> Teilen
            </button>
            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
          </>
        )}

        {/* Save */}
        <button onClick={save} disabled={saveStatus === 'saving'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all flex-shrink-0 ${
            saveStatus === 'saved'
              ? 'text-emerald-700 bg-emerald-50'
              : saveStatus === 'saving'
              ? 'bg-violet-400 text-white cursor-wait'
              : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200'
          }`}>
          {saveStatus === 'saved'
            ? <><Check size={13} /> Gespeichert</>
            : saveStatus === 'saving'
            ? <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Speichern…</>
            : <><Save size={13} /> Speichern</>}
        </button>

        {/* Publish */}
        <button
          onClick={() => { setPublishing(true); Promise.resolve(onPublish()).finally(() => setPublishing(false)); }}
          disabled={publishing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors flex-shrink-0 ${
            publishing
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-wait'
              : status === 'published'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}>
          {publishing
            ? <><div className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" /> Wird veröffentlicht…</>
            : <><Globe size={13} /> {status === 'published' ? 'Live' : 'Veröffentlichen'}</>}
        </button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <CIContext.Provider value={ci}>
      <style dangerouslySetInnerHTML={{ __html: ci.css }} />
      <div className="flex flex-1 min-h-0">
        {view === 'flow' ? (
          <FlowView
            doc={doc}
            onSelectPage={(pageId) => { setActivePageId(pageId); setView('canvas'); }}
            onUpdatePage={handleUpdateAnyPage}
            onUpdateDecisionOption={handleUpdateDecisionOption}
            onAddPage={handleAddPage}
          />
        ) : (
          <>
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

            {/* Center – Canvas */}
            <FunnelEditorContext.Provider value={{ selectedFieldId, setSelectedFieldId, availableVars }}>
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
              isLocked={false}
              onUpdate={(patch) => selectedNodeId && handleUpdateNode(selectedNodeId, patch)}
              onDelete={() => selectedNodeId && handleDelete(selectedNodeId)}
              onDuplicate={() => selectedNodeId && handleDuplicate(selectedNodeId)}
              extraPanel={extraPanel}
              pages={doc.pages}
              currentPage={activePage}
              onUpdatePage={handleUpdatePage}
              availableVars={availableVars}
            />
            </FunnelEditorContext.Provider>
          </>
        )}
      </div>
      </CIContext.Provider>
    </div>

    {showGenerateModal && (
      <GenerateQuestModal
        onGenerate={handleGenerateQuest}
        onClose={() => setShowGenerateModal(false)}
      />
    )}
    {showEmailConfig && (
      <EmailConfigModal
        initial={doc.emailConfig}
        onSave={handleSaveEmailConfig}
        onClose={() => setShowEmailConfig(false)}
        availableVars={EMAIL_VARIABLES}
      />
    )}
    {showShareModal && typeof window !== 'undefined' && (
      <ShareModal
        url={`${window.location.origin}${previewHref}`}
        title={title}
        logoUrl={company?.corporateDesign?.faviconUrl || company?.logo}
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  );
}
