'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Check, Trash2, CornerDownRight, FileText, Link2 } from 'lucide-react';
import type { FunnelComment, WorkspaceMember } from '@/lib/types';
import type { FunnelPage } from '@/lib/funnel-types';
import ReviewLinksModal from './ReviewLinksModal';

type Filter = 'open' | 'resolved' | 'all';

interface ReviewPanelProps {
  comments: FunnelComment[];
  pages: FunnelPage[];
  activePageId: string;
  selectedBlockId: string | null;
  currentUser: WorkspaceMember | null;
  funnelDocId: string;
  onCreate: (input: {
    pageId: string;
    blockId?: string;
    parentId?: string;
    content: string;
  }) => Promise<void>;
  onToggleStatus: (comment: FunnelComment) => Promise<void>;
  onDelete: (comment: FunnelComment) => Promise<void>;
  onFocusBlock: (pageId: string, blockId: string | null) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'eben';
  if (min < 60) return `vor ${min} Min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.round(h / 24);
  if (d < 30) return `vor ${d} T`;
  return new Date(iso).toLocaleDateString('de-DE');
}

function blockLabel(pages: FunnelPage[], pageId: string, blockId: string | undefined): string {
  const page = pages.find((p) => p.id === pageId);
  if (!page) return '';
  if (!blockId) return `Seite: ${page.name}`;
  // Flatten all nodes (incl. in layout columns) to find the block by id
  const allNodes = page.nodes.flatMap((n) =>
    n.kind === 'layout' ? n.columns.flatMap((c) => c.nodes) : [n],
  );
  const block = allNodes.find((n) => n.id === blockId);
  if (!block) return `${page.name} · Block`;
  if (block.kind !== 'block') return `${page.name} · Layout`;
  return `${page.name} · ${block.type}`;
}

function canModify(comment: FunnelComment, user: WorkspaceMember | null): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'platform_admin') return true;
  return comment.authorType === 'member' && comment.authorMemberId === user.id;
}

export default function ReviewPanel({
  comments, pages, activePageId, selectedBlockId, currentUser, funnelDocId,
  onCreate, onToggleStatus, onDelete, onFocusBlock,
}: ReviewPanelProps) {
  const [filter, setFilter] = useState<Filter>('open');
  const [newText, setNewText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);

  // Roots gefiltert nach Status + aktivem Kontext
  const rootsByThread = useMemo(() => {
    const visible = comments.filter((c) => {
      if (c.parentId) return false;
      if (filter === 'open' && c.status !== 'open') return false;
      if (filter === 'resolved' && c.status !== 'resolved') return false;
      return true;
    });
    return visible.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [comments, filter]);

  // Für aktuellen Kontext: Wenn ein Block selektiert → nur Threads dieses Blocks
  // Wenn kein Block → Threads der aktiven Seite (Page-Level + Blöcke)
  const contextRoots = rootsByThread.filter((c) => {
    if (c.pageId !== activePageId) return false;
    if (selectedBlockId) return c.blockId === selectedBlockId;
    return true;
  });

  // Alle Roots aus anderen Seiten (zur Navigation)
  const otherPageRoots = rootsByThread.filter((c) => c.pageId !== activePageId);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, FunnelComment[]>();
    comments.forEach((c) => {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    });
    map.forEach((arr) => arr.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ));
    return map;
  }, [comments]);

  const placeholder = selectedBlockId
    ? 'Kommentar zu diesem Block…'
    : 'Kommentar zur Seite…';

  async function handleCreate() {
    const text = newText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onCreate({
        pageId: activePageId,
        blockId: selectedBlockId ?? undefined,
        content: text,
      });
      setNewText('');
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(parentId: string, pageId: string, blockId: string | undefined) {
    const text = replyText.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onCreate({ pageId, blockId, parentId, content: text });
      setReplyText('');
      setReplyingTo(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-800">Review</h2>
          </div>
          <button
            onClick={() => setShowLinksModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            title="Externe Links verwalten"
          >
            <Link2 size={11} /> Externe Links
          </button>
        </div>
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'open' ? 'Offen' : f === 'resolved' ? 'Erledigt' : 'Alle'}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Context: aktive Seite / aktiver Block */}
        <div className="px-3 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
            <FileText size={11} />
            <span className="truncate">{blockLabel(pages, activePageId, selectedBlockId ?? undefined)}</span>
          </div>

          {/* New comment input */}
          <div className="space-y-1.5">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={placeholder}
              rows={2}
              className="w-full text-[12px] text-slate-700 px-2 py-1.5 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={!newText.trim() || busy}
                className="px-3 py-1 text-[11px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                Kommentieren
              </button>
            </div>
          </div>
        </div>

        {/* Threads im aktiven Kontext */}
        {contextRoots.length > 0 && (
          <div className="px-3 py-3 space-y-4">
            {contextRoots.map((root) => (
              <ThreadItem
                key={root.id}
                root={root}
                replies={repliesByParent.get(root.id) ?? []}
                pages={pages}
                currentUser={currentUser}
                isReplying={replyingTo === root.id}
                replyText={replyText}
                busy={busy}
                onStartReply={() => { setReplyingTo(root.id); setReplyText(''); }}
                onCancelReply={() => { setReplyingTo(null); setReplyText(''); }}
                onChangeReply={setReplyText}
                onSubmitReply={() => handleReply(root.id, root.pageId, root.blockId)}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                showPageLabel={false}
                onFocusBlock={onFocusBlock}
              />
            ))}
          </div>
        )}

        {contextRoots.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[12px] text-slate-400">
              {filter === 'open'
                ? 'Keine offenen Kommentare hier.'
                : filter === 'resolved'
                ? 'Keine erledigten Kommentare hier.'
                : 'Noch keine Kommentare hier.'}
            </p>
          </div>
        )}

        {/* Threads auf anderen Seiten */}
        {otherPageRoots.length > 0 && (
          <div className="border-t border-slate-100 pt-3 pb-3">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Auf anderen Seiten
              </span>
            </div>
            <div className="px-3 space-y-4">
              {otherPageRoots.map((root) => (
                <ThreadItem
                  key={root.id}
                  root={root}
                  replies={repliesByParent.get(root.id) ?? []}
                  pages={pages}
                  currentUser={currentUser}
                  isReplying={replyingTo === root.id}
                  replyText={replyText}
                  busy={busy}
                  onStartReply={() => { setReplyingTo(root.id); setReplyText(''); }}
                  onCancelReply={() => { setReplyingTo(null); setReplyText(''); }}
                  onChangeReply={setReplyText}
                  onSubmitReply={() => handleReply(root.id, root.pageId, root.blockId)}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  showPageLabel={true}
                  onFocusBlock={onFocusBlock}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    {showLinksModal && (
      <ReviewLinksModal
        funnelDocId={funnelDocId}
        onClose={() => setShowLinksModal(false)}
      />
    )}
    </>
  );
}

// ─── Thread Item ───────────────────────────────────────────────────────────────
interface ThreadItemProps {
  root: FunnelComment;
  replies: FunnelComment[];
  pages: FunnelPage[];
  currentUser: WorkspaceMember | null;
  isReplying: boolean;
  replyText: string;
  busy: boolean;
  showPageLabel: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  onChangeReply: (v: string) => void;
  onSubmitReply: () => void;
  onToggleStatus: (c: FunnelComment) => void;
  onDelete: (c: FunnelComment) => void;
  onFocusBlock: (pageId: string, blockId: string | null) => void;
}

function ThreadItem({
  root, replies, pages, currentUser, isReplying, replyText, busy, showPageLabel,
  onStartReply, onCancelReply, onChangeReply, onSubmitReply, onToggleStatus, onDelete, onFocusBlock,
}: ThreadItemProps) {
  const resolved = root.status === 'resolved';
  return (
    <div className={`space-y-2 ${resolved ? 'opacity-60' : ''}`}>
      {showPageLabel && (
        <button
          onClick={() => onFocusBlock(root.pageId, root.blockId ?? null)}
          className="text-[10px] font-medium text-violet-600 hover:text-violet-800 hover:underline"
        >
          → {blockLabel(pages, root.pageId, root.blockId)}
        </button>
      )}
      <CommentBubble
        comment={root}
        currentUser={currentUser}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onReply={onStartReply}
      />
      {replies.map((reply) => (
        <div key={reply.id} className="pl-4 flex gap-1.5">
          <CornerDownRight size={12} className="text-slate-300 flex-shrink-0 mt-2" />
          <CommentBubble
            comment={reply}
            currentUser={currentUser}
            onDelete={onDelete}
          />
        </div>
      ))}
      {isReplying && (
        <div className="pl-5 space-y-1.5">
          <textarea
            value={replyText}
            onChange={(e) => onChangeReply(e.target.value)}
            placeholder="Antworten…"
            rows={2}
            autoFocus
            className="w-full text-[12px] text-slate-700 px-2 py-1.5 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={onCancelReply}
              className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              Abbrechen
            </button>
            <button
              onClick={onSubmitReply}
              disabled={!replyText.trim() || busy}
              className="px-3 py-1 text-[11px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              Antworten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Comment Bubble ────────────────────────────────────────────────────────────
interface CommentBubbleProps {
  comment: FunnelComment;
  currentUser: WorkspaceMember | null;
  onReply?: () => void;
  onToggleStatus?: (c: FunnelComment) => void;
  onDelete: (c: FunnelComment) => void;
}

function CommentBubble({ comment, currentUser, onReply, onToggleStatus, onDelete }: CommentBubbleProps) {
  const isResolved = comment.status === 'resolved';
  const canEdit = canModify(comment, currentUser);
  const canDel = canModify(comment, currentUser);
  const isExternal = comment.authorType === 'external';

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-800 truncate">{comment.authorName}</span>
        {isExternal && (
          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1 py-0.5 rounded">
            Extern
          </span>
        )}
        <span className="text-[10px] text-slate-400 flex-shrink-0">{relativeTime(comment.createdAt)}</span>
      </div>
      <p className="text-[12px] text-slate-700 whitespace-pre-wrap break-words leading-snug">
        {comment.content}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        {onReply && (
          <button
            onClick={onReply}
            className="text-[10px] text-slate-500 hover:text-violet-700 font-medium"
          >
            Antworten
          </button>
        )}
        {onToggleStatus && canEdit && (
          <button
            onClick={() => onToggleStatus(comment)}
            className={`flex items-center gap-0.5 text-[10px] font-medium ${
              isResolved ? 'text-slate-500 hover:text-slate-800' : 'text-emerald-600 hover:text-emerald-800'
            }`}
          >
            <Check size={10} /> {isResolved ? 'Wieder öffnen' : 'Erledigt'}
          </button>
        )}
        {canDel && (
          <button
            onClick={() => onDelete(comment)}
            className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-red-600 font-medium"
            title="Löschen"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
