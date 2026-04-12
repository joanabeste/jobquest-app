'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Upload, Trash2, Image as ImageIcon, ArrowDownToLine, Wand2 } from 'lucide-react';
import { FunnelPage } from '@/lib/funnel-types';
import type { MediaAsset } from '@/lib/types';
import MediaLibrary, { uploadToMediaLibrary } from '@/components/shared/MediaLibrary';

type Tab = 'generate' | 'import' | 'refine';

interface Props {
  onGenerate: (pages: FunnelPage[], title: string) => void;
  onClose: () => void;
  showHeyflowImport?: boolean;
  currentPages?: FunnelPage[];
}

const LOADING_STEPS = [
  'Story-Konzept wird entwickelt…',
  'Charaktere und Szenen werden erstellt…',
  'Dialoge werden verfasst…',
  'Entscheidungen und Quiz werden generiert…',
  'Kontaktformular wird hinzugefügt…',
  'Letzte Feinheiten werden angepasst…',
];

export default function GenerateQuestModal({ onGenerate, onClose, showHeyflowImport, currentPages }: Props) {
  const hasExistingContent = !!currentPages && currentPages.length > 0;
  const [tab, setTab] = useState<Tab>(hasExistingContent ? 'refine' : 'generate');
  const [beruf, setBeruf] = useState('');
  const [notes, setNotes] = useState('');
  const [heyflowUrl, setHeyflowUrl] = useState('');
  const [refineInstructions, setRefineInstructions] = useState('');
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError('');
    try {
      const asset = await uploadToMediaLibrary(file);
      setImages((prev) => [...prev, asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploadingImage(false);
    }
  }

  function pickFromLibrary(url: string) {
    // The picker returns a public URL — synthesise a minimal MediaAsset
    // so the existing rendering / dedupe logic keeps working.
    setImages((prev) => prev.some((i) => i.url === url)
      ? prev
      : [...prev, { id: url, companyId: '', url, filename: url.split('/').pop() ?? 'asset', createdAt: '' }]);
    setLibraryOpen(false);
  }

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    setLoadingProgress(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 3500);

    const progressInterval = setInterval(() => {
      setLoadingProgress((p) => {
        // Slow down as it approaches 90% – actual completion sets it to 100
        if (p >= 90) return p;
        const increment = p < 40 ? 4 : p < 70 ? 2 : 0.8;
        return Math.min(p + increment, 90);
      });
    }, 300);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  async function handleGenerate() {
    if (!beruf.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beruf: beruf.trim(),
          notes: notes.trim(),
          imageUrls: images.map((img) => img.url),
        }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length) throw new Error('Keine Seiten generiert');
      setLoadingProgress(100);
      setTimeout(() => onGenerate(data.pages!, beruf.trim()), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren');
      setLoading(false);
    }
  }

  async function handleRefine() {
    if (!refineInstructions.trim() || !currentPages?.length || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/refine-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: currentPages, instructions: refineInstructions.trim() }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length) throw new Error('Keine Seiten generiert');
      setLoadingProgress(100);
      setTimeout(() => onGenerate(data.pages!, ''), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anpassen');
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!heyflowUrl.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/import-heyflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: heyflowUrl.trim() }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; beruf?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length) throw new Error('Keine Seiten generiert');
      setLoadingProgress(100);
      setTimeout(() => onGenerate(data.pages!, data.beruf || 'Importierte Quest'), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Import');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={!loading ? onClose : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-4 pb-0 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <h2 className="text-base font-semibold text-slate-900">KI JobQuest</h2>
            </div>
            {!loading && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          {(showHeyflowImport || hasExistingContent) && !loading && (
            <div className="flex gap-0.5">
              {hasExistingContent && (
                <button
                  onClick={() => { setTab('refine'); setError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'refine' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <Wand2 size={12} /> Anpassen
                </button>
              )}
              <button
                onClick={() => { setTab('generate'); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'generate' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Sparkles size={12} /> Neu generieren
              </button>
              {showHeyflowImport && (
                <button
                  onClick={() => { setTab('import'); setError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'import' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  <ArrowDownToLine size={12} /> Prototyp importieren
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          /* ── Loading screen ──────────────────────────────────────────────── */
          <div className="px-6 py-8 flex flex-col items-center gap-6">
            {/* Animated icon */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-violet-100 animate-ping opacity-40" />
              <div className="relative w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center">
                <Sparkles size={32} className="text-violet-500" style={{ animation: 'spin 3s linear infinite' }} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 text-right mt-1">{Math.round(loadingProgress)}%</p>
            </div>

            {/* Step text */}
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 transition-all duration-500">
                {LOADING_STEPS[loadingStep]}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {tab === 'refine' ? 'Quest wird angepasst…' : tab === 'import' ? 'Prototyp wird konvertiert…' : <>Fur <span className="font-medium text-slate-600">{beruf}</span></>}
              </p>
            </div>

            {/* Dots */}
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: i <= loadingStep ? '#7c3aed' : '#e2e8f0' }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────────────── */
          <>
            {tab === 'refine' ? (
              /* ── Refine tab ──────────────────────────────────────────────── */
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Was soll angepasst werden? <span className="text-red-400">*</span></label>
                  <textarea
                    value={refineInstructions}
                    onChange={(e) => setRefineInstructions(e.target.value)}
                    placeholder="z.B. Fuege eine Szene im Labor hinzu, mache den Dialog mit Sarah laenger, aendere das Quiz zur Medikamentengabe..."
                    rows={5}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none resize-none transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Die KI passt die bestehende Quest nach deinen Wunschen an. Alles, was du nicht erwahnst, bleibt unverandert.</p>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              </div>
            ) : tab === 'import' ? (
              /* ── Import tab ──────────────────────────────────────────────── */
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Prototyp-URL <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    value={heyflowUrl}
                    onChange={(e) => setHeyflowUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                    placeholder="https://beispiel.de/mein-prototyp"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Die KI liest den Prototyp-Inhalt und konvertiert ihn in eine interaktive JobQuest mit Dialogen, Quiz und Entscheidungen.</p>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              </div>
            ) : (
              /* ── Generate tab ────────────────────────────────────────────── */
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Beruf <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={beruf}
                    onChange={(e) => setBeruf(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="z.B. Pflegefachkraft, Softwareentwickler, Lagerist…"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Zusätzliche Hinweise <span className="text-slate-300">(optional)</span></label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="z.B. Story soll in einem Krankenhaus spielen, Fokus auf Teamarbeit, 8 Seiten…"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Bilder vom Unternehmen <span className="text-slate-300">(optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">Die KI analysiert die Bilder und baut sie passend in die JobQuest ein.</p>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {images.map((img) => (
                        <div key={img.id} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group">
                          <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                            className="absolute top-1 right-1 p-1 rounded bg-white/90 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 hover:bg-slate-50 hover:border-violet-400 transition-colors disabled:opacity-60"
                    >
                      {uploadingImage ? <Sparkles size={13} className="animate-spin" /> : <Upload size={13} />}
                      {uploadingImage ? 'Wird hochgeladen…' : 'Hochladen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLibraryOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 hover:bg-slate-50 hover:border-violet-400 transition-colors"
                    >
                      <ImageIcon size={13} />
                      Aus Mediathek
                    </button>
                  </div>
                </div>

                <MediaLibrary
                  open={libraryOpen}
                  onClose={() => setLibraryOpen(false)}
                  onSelect={pickFromLibrary}
                />

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>
            )}

            <div className="px-6 pb-5 flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Abbrechen
              </button>
              {tab === 'refine' ? (
                <button
                  onClick={handleRefine}
                  disabled={!refineInstructions.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Wand2 size={14} /> Anpassen
                </button>
              ) : tab === 'import' ? (
                <button
                  onClick={handleImport}
                  disabled={!heyflowUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDownToLine size={14} /> Importieren
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!beruf.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles size={14} /> Generieren
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
