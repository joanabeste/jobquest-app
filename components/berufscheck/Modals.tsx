'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight, Plus, Trash2, CheckCircle, X, Link as LinkIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dimension, DIMENSION_COLORS } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicUrl } from '@/lib/url';

function uid() { return crypto.randomUUID(); }

// ── Setup wizard ──────────────────────────────────────────────────────────────
export function SetupWizard({ onComplete }: { onComplete: (dims: Dimension[]) => void }) {
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
                  <button onClick={() => deleteDim(dim.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={addDim} className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium px-2 py-1 transition-colors">
            <Plus size={13} />
            Weiteres Berufsfeld hinzufügen
          </button>
        </div>

        <div className="px-8 pb-7">
          <button
            onClick={() => onComplete(dims.map((d) => ({ ...d, name: d.name.trim() })))}
            disabled={!canFinish}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Berufscheck erstellen <ArrowRight size={16} />
          </button>
          {!canFinish && (
            <p className="text-center text-xs text-slate-400 mt-2">Bitte gib mindestens 2 Berufsfelder an.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Publish modal ─────────────────────────────────────────────────────────────
export function PublishModal({ slug, onShowQR, onClose }: {
  slug: string; onShowQR: () => void; onClose: () => void;
}) {
  const { company } = useAuth();
  const publicUrl = getPublicUrl(`/berufscheck/${slug}`, company);

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
            <button onClick={() => navigator.clipboard.writeText(publicUrl)} className="text-violet-600 hover:text-violet-700 flex-shrink-0" title="Link kopieren">
              <LinkIcon size={14} />
            </button>
          </div>
        </div>
        <button onClick={onShowQR} className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
          QR-Code anzeigen
        </button>
        <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors">
          Fertig
        </button>
      </div>
    </div>
  );
}

// ── QR modal ──────────────────────────────────────────────────────────────────
export function QRModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { company } = useAuth();
  const publicUrl = getPublicUrl(`/berufscheck/${slug}`, company);

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
        <button onClick={() => navigator.clipboard.writeText(publicUrl)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
          <LinkIcon size={14} /> Link kopieren
        </button>
      </div>
    </div>
  );
}
