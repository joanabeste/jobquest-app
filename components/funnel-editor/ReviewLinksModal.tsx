'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Check, Link2, Trash2, Plus, Loader2 } from 'lucide-react';
import type { ReviewLink } from '@/lib/types';
import { reviewLinksStorage } from '@/lib/review-links-storage';

interface ReviewLinksModalProps {
  funnelDocId: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS: { value: number | null; label: string }[] = [
  { value: 7, label: '7 Tage' },
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
  { value: null, label: 'Kein Ablauf' },
];

function buildUrl(token: string): string {
  if (typeof window === 'undefined') return `/review/${token}`;
  return `${window.location.origin}/review/${token}`;
}

function isExpired(link: ReviewLink): boolean {
  if (link.revokedAt) return true;
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return true;
  return false;
}

function statusLabel(link: ReviewLink): { text: string; color: string } {
  if (link.revokedAt) return { text: 'Widerrufen', color: 'text-slate-500 bg-slate-100' };
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return { text: 'Abgelaufen', color: 'text-slate-500 bg-slate-100' };
  }
  return { text: 'Aktiv', color: 'text-emerald-700 bg-emerald-50' };
}

export default function ReviewLinksModal({ funnelDocId, onClose }: ReviewLinksModalProps) {
  const [links, setLinks] = useState<ReviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [canComment, setCanComment] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(30);
  const [creating, setCreating] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    reviewLinksStorage.list(funnelDocId)
      .then((list) => { if (!cancelled) setLinks(list); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [funnelDocId]);

  async function handleCreate() {
    if (!label.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await reviewLinksStorage.create({
        funnelDocId,
        label: label.trim(),
        canComment,
        expiresInDays,
      });
      setLinks((prev) => [created, ...prev]);
      setLabel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(link: ReviewLink) {
    try {
      await navigator.clipboard.writeText(buildUrl(link.token));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((v) => v === link.id ? null : v), 1500);
    } catch {
      // ignore
    }
  }

  async function handleRevoke(link: ReviewLink) {
    if (!confirm('Diesen Link wirklich widerrufen? Er kann danach nicht mehr aufgerufen werden.')) return;
    try {
      const updated = await reviewLinksStorage.revoke(link.id);
      setLinks((prev) => prev.map((l) => l.id === link.id ? updated : l));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(link: ReviewLink) {
    if (!confirm('Diesen Link komplett löschen?')) return;
    try {
      await reviewLinksStorage.remove(link.id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-800">Externe Review-Links</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        {/* Create form */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bezeichnung</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z.B. Externe Agentur · Stakeholder XYZ"
              className="w-full text-[12px] text-slate-700 px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gültigkeit</label>
              <select
                value={expiresInDays === null ? 'none' : String(expiresInDays)}
                onChange={(e) => setExpiresInDays(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                className="w-full text-[12px] text-slate-700 px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              >
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={String(o.value)} value={o.value === null ? 'none' : String(o.value)}>{o.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-[12px] text-slate-700 mt-5">
              <input
                type="checkbox"
                checked={canComment}
                onChange={(e) => setCanComment(e.target.checked)}
                className="accent-violet-600"
              />
              Darf kommentieren
            </label>
          </div>
          <button
            onClick={handleCreate}
            disabled={!label.trim() || creating}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? <><Loader2 size={12} className="animate-spin" /> Erstelle…</> : <><Plus size={12} /> Link erstellen</>}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
            {error}
          </div>
        )}

        {/* Existing links */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-[12px] text-slate-400">
              <Loader2 size={16} className="animate-spin mx-auto mb-1" />
              Laden…
            </div>
          ) : links.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-slate-400">
              Noch keine Links erstellt.
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => {
                const status = statusLabel(link);
                const expired = isExpired(link);
                const url = buildUrl(link.token);
                return (
                  <div
                    key={link.id}
                    className={`border rounded-xl p-3 ${expired ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">
                          {link.label || 'Ohne Bezeichnung'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${status.color}`}>{status.text}</span>
                          <span>{link.canComment ? 'Kommentar' : 'Nur ansehen'}</span>
                          {link.expiresAt && (
                            <span>Bis {new Date(link.expiresAt).toLocaleDateString('de-DE')}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(link)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 flex-shrink-0"
                        title="Löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={url}
                        readOnly
                        className="flex-1 min-w-0 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded px-2 py-1 font-mono truncate"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => handleCopy(link)}
                        disabled={expired}
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {copiedId === link.id ? <><Check size={11} /> Kopiert</> : <><Copy size={11} /> Kopieren</>}
                      </button>
                      {!expired && (
                        <button
                          onClick={() => handleRevoke(link)}
                          className="px-2 py-1 text-[11px] font-medium rounded text-slate-500 hover:text-red-600"
                          title="Widerrufen"
                        >
                          Widerrufen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
