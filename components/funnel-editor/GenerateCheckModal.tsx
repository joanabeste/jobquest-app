'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Plus, Globe, Loader2, ArrowDownToLine, Wand2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import type { FunnelPage } from '@/lib/funnel-types';
import type { Dimension, MediaAsset } from '@/lib/types';
import MediaLibrary, { uploadToMediaLibrary } from '@/components/shared/MediaLibrary';

type Tab = 'generate' | 'import' | 'refine';

interface CompanyJobInput {
  title: string;
  group?: string;
}

interface Props {
  onGenerate: (pages: FunnelPage[], dimensions: Dimension[], title: string) => void;
  onClose: () => void;
  showHeyflowImport?: boolean;
  currentPages?: FunnelPage[];
  currentDimensions?: Dimension[];
  companyJobs?: CompanyJobInput[];
}

const LOADING_STEPS = [
  'Berufsfelder werden abgeleitet…',
  'Filterfrage wird formuliert…',
  'Swipe-Karten werden generiert…',
  'Selbsteinschätzungs-Slider werden erstellt…',
  'Ergebnis-Gruppen werden zusammengestellt…',
  'Letzte Feinheiten werden angepasst…',
];

export default function GenerateCheckModal({ onGenerate, onClose, showHeyflowImport, currentPages, currentDimensions, companyJobs }: Props) {
  const hasExistingContent = !!currentPages && currentPages.length > 0;
  const [tab, setTab] = useState<Tab>(hasExistingContent ? 'refine' : 'generate');
  const [berufe, setBerufe] = useState<string[]>([]);
  const [studiengaenge, setStudiengaenge] = useState<string[]>([]);
  const [berufInput, setBerufInput] = useState('');
  const [studiumInput, setStudiumInput] = useState('');
  const [notes, setNotes] = useState('');
  const [heyflowUrl, setHeyflowUrl] = useState('');
  const [refineInstructions, setRefineInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError('');
    try {
      const asset = await uploadToMediaLibrary(file, { preserveFormat: true });
      setImages((prev) => [...prev, asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
    } finally {
      setUploadingImage(false);
    }
  }

  function pickFromLibrary(url: string) {
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
        if (p >= 90) return p;
        const inc = p < 40 ? 4 : p < 70 ? 2 : 0.8;
        return Math.min(p + inc, 90);
      });
    }, 300);
    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, [loading]);

  function commitBeruf() {
    const v = berufInput.trim();
    if (!v) return;
    if (!berufe.includes(v)) setBerufe([...berufe, v]);
    setBerufInput('');
  }
  function commitStudium() {
    const v = studiumInput.trim();
    if (!v) return;
    if (!studiengaenge.includes(v)) setStudiengaenge([...studiengaenge, v]);
    setStudiumInput('');
  }

  async function handleImportFromWebsite() {
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    setError('');
    setImportInfo(null);
    try {
      const res = await fetch('/api/companies/extract-jobs-from-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json() as { berufe?: string[]; studiengaenge?: string[]; pagesCrawled?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import fehlgeschlagen');

      const newBerufe = (data.berufe ?? []).filter((b) => !berufe.includes(b));
      const newStudium = (data.studiengaenge ?? []).filter((s) => !studiengaenge.includes(s));
      if (newBerufe.length > 0) setBerufe([...berufe, ...newBerufe]);
      if (newStudium.length > 0) setStudiengaenge([...studiengaenge, ...newStudium]);

      const totalNew = newBerufe.length + newStudium.length;
      if (totalNew === 0) {
        setImportInfo('Keine neuen Berufe oder Studiengänge gefunden.');
      } else {
        setImportInfo(`${newBerufe.length} Berufe, ${newStudium.length} Studiengänge übernommen.`);
        setImportOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  }

  async function handleRefine() {
    if (!refineInstructions.trim() || !currentPages?.length || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/refine-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: currentPages, dimensions: currentDimensions, instructions: refineInstructions.trim() }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; dimensions?: Dimension[]; title?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length) throw new Error('KI hat keinen vollstandigen Check generiert.');
      setLoadingProgress(100);
      setTimeout(() => onGenerate(data.pages!, data.dimensions ?? currentDimensions ?? [], data.title ?? 'Berufscheck'), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Anpassen');
      setLoading(false);
    }
  }

  async function handleImportHeyflow() {
    if (!heyflowUrl.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/import-heyflow-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: heyflowUrl.trim() }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; dimensions?: Dimension[]; title?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length || !data.dimensions?.length) throw new Error('KI hat keinen vollstandigen Check generiert.');
      setLoadingProgress(100);
      setTimeout(() => onGenerate(data.pages!, data.dimensions!, data.title ?? 'Berufscheck'), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Import');
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if ((berufe.length === 0 && images.length === 0) || loading) return;
    setLoading(true);
    setError('');
    try {
      // Wenn Firmen-Berufe mit Gruppen vorliegen UND der User mindestens
      // einen davon als Beruf ausgewählt hat, leiten wir daraus verbindliche
      // Dimensionen (Gruppennamen) inkl. Beruf→Dimension-Mapping ab. Die KI
      // soll diese Gruppen exakt übernehmen statt eigene zu erfinden.
      const predefinedDimensions = (() => {
        if (!companyJobs || companyJobs.length === 0) return undefined;
        const selected = companyJobs.filter((j) => j.group && berufe.includes(j.title));
        if (selected.length === 0) return undefined;
        const map = new Map<string, string[]>();
        for (const j of selected) {
          const arr = map.get(j.group!) ?? [];
          arr.push(j.title);
          map.set(j.group!, arr);
        }
        return Array.from(map.entries()).map(([name, jobs]) => ({ name, berufe: jobs }));
      })();
      const res = await fetch('/api/generate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          berufe,
          studiengaenge: studiengaenge.length > 0 ? studiengaenge : undefined,
          notes: notes.trim() || undefined,
          imageUrls: images.length > 0 ? images.map((img) => img.url) : undefined,
          predefinedDimensions,
        }),
      });
      const data = await res.json() as { pages?: FunnelPage[]; dimensions?: Dimension[]; title?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler');
      if (!data.pages?.length || !data.dimensions?.length) throw new Error('KI hat keinen vollständigen Check generiert.');
      setLoadingProgress(100);
      const title = data.title ?? 'Berufscheck';
      setTimeout(() => onGenerate(data.pages!, data.dimensions!, title), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Generieren');
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
              <h2 className="text-base font-semibold text-slate-900">KI Berufscheck</h2>
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
          <div className="px-6 py-8 flex flex-col items-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-violet-100 animate-ping opacity-40" />
              <div className="relative w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center">
                <Sparkles size={32} className="text-violet-500" style={{ animation: 'spin 3s linear infinite' }} />
              </div>
            </div>
            <div className="w-full">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 text-right mt-1">{Math.round(loadingProgress)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700 transition-all duration-500">{LOADING_STEPS[loadingStep]}</p>
              <p className="text-xs text-slate-400 mt-1">
                {tab === 'refine' ? 'Check wird angepasst…' : tab === 'import' ? 'Prototyp wird konvertiert…' : `${berufe.length} Berufe · ${studiengaenge.length} Studiengange${images.length > 0 ? ` · ${images.length} Bild${images.length === 1 ? '' : 'er'}` : ''}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: i <= loadingStep ? '#7c3aed' : '#e2e8f0' }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {tab === 'refine' ? (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Was soll angepasst werden? <span className="text-red-400">*</span></label>
                  <textarea
                    value={refineInstructions}
                    onChange={(e) => setRefineInstructions(e.target.value)}
                    placeholder="z.B. Fuege mehr Swipe-Karten hinzu, aendere die Dimensionen, passe die Berufsvorschlage an..."
                    rows={5}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none resize-none transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Die KI passt den bestehenden Berufscheck nach deinen Wunschen an. Alles, was du nicht erwahnst, bleibt unverandert.</p>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              </div>
            ) : tab === 'import' ? (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Prototyp-URL <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    value={heyflowUrl}
                    onChange={(e) => setHeyflowUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImportHeyflow()}
                    placeholder="https://beispiel.de/mein-berufscheck"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none transition-colors"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">Die KI liest den Prototyp-Inhalt und konvertiert ihn in einen interaktiven Berufscheck mit Swipe-Karten, Selbsteinschatzung und Ergebnis.</p>
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              </div>
            ) : (
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Website import */}
              {!importOpen ? (
                <button
                  type="button"
                  onClick={() => { setImportOpen(true); setImportInfo(null); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl border border-dashed border-violet-300 text-violet-700 bg-violet-50/40 hover:bg-violet-50 transition-colors"
                >
                  <Globe size={13} /> Berufe & Studiengänge von Website importieren
                </button>
              ) : (
                <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                      <Globe size={12} /> Von Website importieren
                    </p>
                    <button
                      type="button"
                      onClick={() => { setImportOpen(false); setImportUrl(''); setImportInfo(null); }}
                      className="text-violet-400 hover:text-violet-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImportFromWebsite(); } }}
                      placeholder="https://www.firma.de/karriere"
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-violet-400 focus:outline-none"
                      disabled={importing}
                    />
                    <button
                      type="button"
                      onClick={handleImportFromWebsite}
                      disabled={!importUrl.trim() || importing}
                      className="px-3 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {importing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {importing ? 'Lädt…' : 'Importieren'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Die KI crawlt deine Website (inkl. Karriere-/Ausbildungs-Unterseiten) und füllt die Berufe-Felder unten automatisch.
                  </p>
                  {importInfo && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-2 py-1">{importInfo}</p>
                  )}
                </div>
              )}

              {/* Berufe */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Berufe <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Pflichtfeld. Drucke Enter oder klicke + nach jedem Beruf.</p>
                {companyJobs && companyJobs.length > 0 && berufe.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setBerufe(companyJobs.map((j) => j.title).filter((t) => !berufe.includes(t)))}
                    className="w-full mb-2 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-dashed border-violet-300 text-violet-600 bg-violet-50/40 hover:bg-violet-50 transition-colors"
                  >
                    <Sparkles size={12} /> {companyJobs.length} Berufe aus Firmenprofil übernehmen
                    {(() => {
                      const groups = new Set(companyJobs.map((j) => j.group).filter(Boolean) as string[]);
                      return groups.size > 0 ? <span className="text-violet-400">({groups.size} Gruppen)</span> : null;
                    })()}
                  </button>
                )}
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={berufInput}
                    onChange={(e) => setBerufInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitBeruf(); } }}
                    placeholder="z.B. Industriemechaniker"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none"
                  />
                  <button onClick={commitBeruf}
                    className="px-3 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                {berufe.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {berufe.map((b) => (
                      <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {b}
                        <button onClick={() => setBerufe(berufe.filter((x) => x !== b))} className="hover:text-violet-900">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Studiengänge */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Duale Studiengänge <span className="text-slate-300">(optional)</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Wenn vorhanden, fügt die KI eine Filterfrage zum Schulabschluss hinzu.</p>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={studiumInput}
                    onChange={(e) => setStudiumInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitStudium(); } }}
                    placeholder="z.B. B.Eng. Mechatronik"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none"
                  />
                  <button onClick={commitStudium}
                    className="px-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                {studiengaenge.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {studiengaenge.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {s}
                        <button onClick={() => setStudiengaenge(studiengaenge.filter((x) => x !== s))} className="hover:text-blue-900">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Hinweise <span className="text-slate-300">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="z.B. Fokus auf Praxis, Standort Espelkamp, eher jüngere Zielgruppe…"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-violet-400 focus:outline-none resize-none"
                />
              </div>

              {/* Bilder / Anhänge */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Bilder & Vorlagen <span className="text-slate-300">(optional)</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Die KI liest die Bilder (z.B. Excel-Screenshots mit Berufen, Frage-Vorlagen) und übernimmt Berufe, Studiengänge und weitere Vorgaben daraus.
                </p>

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
                    {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
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

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>
            )}

            <div className="px-6 pb-5 flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
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
                  onClick={handleImportHeyflow}
                  disabled={!heyflowUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDownToLine size={14} /> Importieren
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={berufe.length === 0 && images.length === 0}
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
