'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, X, Check, Loader2, FileText } from 'lucide-react';
import type { FunnelComment, Company } from '@/lib/types';
import type { FunnelDoc } from '@/lib/funnel-types';
import FunnelPlayer from '@/components/funnel-editor/FunnelPlayer';

interface ReviewData {
  link: {
    id: string;
    label?: string;
    canComment: boolean;
    expiresAt?: string;
  };
  doc: FunnelDoc;
  comments: FunnelComment[];
  company: Company | null;
}

const REVIEWER_KEY = 'jobquest.reviewer';

function loadReviewer(): { name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REVIEWER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === 'string') return { name: parsed.name };
  } catch { /* ignore */ }
  return null;
}

function saveReviewer(reviewer: { name: string }) {
  try { window.localStorage.setItem(REVIEWER_KEY, JSON.stringify(reviewer)); } catch { /* ignore */ }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'eben';
  if (min < 60) return `vor ${min} Min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.round(h / 24);
  return `vor ${d} T`;
}

export default function ReviewClient({ token }: { token: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [panelOpen, setPanelOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Wird vom FunnelPlayer via onPageChange gefüttert (aktuelle Seite im Flow)
  const [currentPage, setCurrentPage] = useState<{ id: string; name: string; index: number } | null>(null);

  // Reviewer-Identität (Name) — aus LocalStorage oder beim ersten Kommentar erfragt
  const [reviewer, setReviewer] = useState<{ name: string } | null>(null);
  const [askIdentity, setAskIdentity] = useState(false);
  const [identityName, setIdentityName] = useState('');

  useEffect(() => {
    setReviewer(loadReviewer());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/review/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error || res.statusText);
        }
        return body as ReviewData;
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const openCount = useMemo(
    () => (data?.comments ?? []).filter((c) => !c.parentId && c.status === 'open').length,
    [data?.comments],
  );

  async function submitComment() {
    if (!data || !commentText.trim() || submitting) return;
    if (!reviewer) { setAskIdentity(true); return; }

    const pageId = currentPage?.id ?? data.doc.pages[0]?.id ?? '';
    if (!pageId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/review/${encodeURIComponent(token)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: reviewer.name,
          pageId,
          content: commentText.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || res.statusText);
      const created = body as FunnelComment;
      setData({ ...data, comments: [...data.comments, created] });
      setCommentText('');
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmIdentity() {
    const n = identityName.trim();
    if (!n) return;
    const next = { name: n };
    setReviewer(next);
    saveReviewer(next);
    setAskIdentity(false);
  }

  // ── Rendering ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Lade Review…
        </div>
      </div>
    );
  }

  if (error || !data) {
    const message = error === 'expired'
      ? 'Dieser Review-Link ist abgelaufen.'
      : error === 'revoked'
      ? 'Dieser Review-Link wurde widerrufen.'
      : error === 'invalid_token' || error === 'doc_missing'
      ? 'Dieser Review-Link ist nicht mehr gültig.'
      : `Fehler beim Laden: ${error ?? 'Unbekannt'}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <X size={20} className="text-red-500" />
          </div>
          <h1 className="text-sm font-semibold text-slate-800 mb-1">Zugriff verweigert</h1>
          <p className="text-xs text-slate-500">{message}</p>
        </div>
      </div>
    );
  }

  const { link, doc, comments, company } = data;
  const canComment = link.canComment;
  const rootComments = comments.filter((c) => !c.parentId);

  // Minimaler Stub-Company wenn keine Daten da (FunnelPlayer erwartet nicht-null)
  const playerCompany: Company = company
    ? (company as Company)
    : {
        id: '',
        name: 'Review',
        industry: '',
        location: '',
        contactName: '',
        contactEmail: '',
        createdAt: '',
      } as Company;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Review Header Banner */}
      <div className="sticky top-0 z-30 bg-violet-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={14} />
          <span className="text-xs font-semibold truncate">
            Review-Modus{link.label ? ` · ${link.label}` : ''}
          </span>
        </div>
        {canComment && (
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 rounded-md text-[11px] font-semibold transition-colors"
          >
            <MessageSquare size={12} />
            Kommentare
            {openCount > 0 && (
              <span className="bg-white text-violet-700 rounded-full px-1.5 min-w-[18px] text-center">
                {openCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Funnel preview */}
      <div className="max-w-[480px] mx-auto">
        <FunnelPlayer
          doc={doc}
          company={playerCompany}
          onPageChange={(id, name, index) => setCurrentPage({ id, name, index })}
        />
      </div>

      {/* Floating Comments Panel */}
      {panelOpen && (
        <div className="fixed top-14 right-4 bottom-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-40">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Deine Rückmeldung</h2>
            <button onClick={() => setPanelOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
              <X size={14} />
            </button>
          </div>

          {!canComment && (
            <div className="p-3 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100">
              Dieser Link erlaubt nur das Ansehen, keine Kommentare.
            </div>
          )}

          {/* Liste */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {rootComments.length === 0 && (
              <p className="text-center text-[12px] text-slate-400 py-8">
                Noch keine Kommentare.
              </p>
            )}
            {rootComments.map((c) => (
              <div key={c.id} className={`border rounded-xl p-2.5 ${c.status === 'resolved' ? 'bg-slate-50 border-slate-100 opacity-60' : 'border-slate-200'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-slate-800 truncate">{c.authorName}</span>
                  <span className="text-[10px] text-slate-400">{relativeTime(c.createdAt)}</span>
                  {c.status === 'resolved' && <Check size={10} className="text-emerald-600" />}
                </div>
                <p className="text-[12px] text-slate-700 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            ))}
          </div>

          {/* Eingabe */}
          {canComment && (
            <div className="p-3 border-t border-slate-100 space-y-2">
              {currentPage && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
                  <FileText size={11} className="flex-shrink-0" />
                  <span className="truncate">
                    Kommentar zu: <strong className="text-slate-700">{currentPage.name}</strong>
                  </span>
                </div>
              )}
              {reviewer && (
                <p className="text-[10px] text-slate-400">
                  Als <strong>{reviewer.name}</strong>{' '}
                  <button
                    className="underline hover:text-violet-700"
                    onClick={() => { setAskIdentity(true); setIdentityName(reviewer.name); }}
                  >
                    ändern
                  </button>
                </p>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Dein Feedback…"
                rows={3}
                className="w-full text-[12px] text-slate-700 px-2 py-1.5 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || submitting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <><Loader2 size={12} className="animate-spin" /> Sende…</> : <><Send size={12} /> Senden</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Identity Modal */}
      {askIdentity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAskIdentity(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Wer bist du?</h2>
            <p className="text-[11px] text-slate-500 mb-3">Damit das Team weiß, von wem das Feedback kommt.</p>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Name</label>
                <input
                  type="text"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  className="w-full text-[12px] text-slate-700 px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmIdentity(); } }}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setAskIdentity(false)}
                  className="px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={confirmIdentity}
                  disabled={!identityName.trim()}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
