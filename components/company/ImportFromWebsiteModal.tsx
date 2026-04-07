'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, Globe, Loader2, AlertCircle } from 'lucide-react';

export interface ExtractedProfile {
  name?: string;
  description?: string;
  industry?: string;
  location?: string;
  privacyUrl?: string;
  imprintUrl?: string;
  careerPageUrl?: string;
  logo?: string;
  design?: {
    primaryColor?: string;
    accentColor?: string;
    headingFontName?: string;
    bodyFontName?: string;
    faviconUrl?: string;
  };
}

interface Props {
  onClose: () => void;
  onApply: (selected: ExtractedProfile) => void;
}

type Field = {
  key: string;
  label: string;
  value: string | undefined;
  preview?: 'text' | 'logo' | 'color' | 'favicon';
};

export default function ImportFromWebsiteModal({ onClose, onApply }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedProfile | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleAnalyze() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/companies/extract-from-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analyse fehlgeschlagen.');
      setResult(data.extracted as ExtractedProfile);
      // Pre-select every non-empty field
      const init: Record<string, boolean> = {};
      const ex = data.extracted as ExtractedProfile;
      (['name', 'description', 'industry', 'location', 'privacyUrl', 'imprintUrl', 'careerPageUrl', 'logo'] as const).forEach((k) => {
        if (ex[k]) init[k] = true;
      });
      if (ex.design) {
        (['primaryColor', 'accentColor', 'headingFontName', 'bodyFontName', 'faviconUrl'] as const).forEach((k) => {
          if (ex.design?.[k]) init[`design.${k}`] = true;
        });
      }
      setSelected(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  const fields: Field[] = useMemo(() => {
    if (!result) return [];
    const list: Field[] = [
      { key: 'name', label: 'Firmenname', value: result.name, preview: 'text' },
      { key: 'description', label: 'Beschreibung', value: result.description, preview: 'text' },
      { key: 'industry', label: 'Branche', value: result.industry, preview: 'text' },
      { key: 'location', label: 'Standort', value: result.location, preview: 'text' },
      { key: 'logo', label: 'Logo', value: result.logo, preview: 'logo' },
      { key: 'privacyUrl', label: 'Datenschutz-URL', value: result.privacyUrl, preview: 'text' },
      { key: 'imprintUrl', label: 'Impressum-URL', value: result.imprintUrl, preview: 'text' },
      { key: 'careerPageUrl', label: 'Karriere-URL', value: result.careerPageUrl, preview: 'text' },
      { key: 'design.primaryColor', label: 'Primärfarbe', value: result.design?.primaryColor, preview: 'color' },
      { key: 'design.accentColor', label: 'Akzentfarbe', value: result.design?.accentColor, preview: 'color' },
      { key: 'design.headingFontName', label: 'Schrift Überschriften', value: result.design?.headingFontName, preview: 'text' },
      { key: 'design.bodyFontName', label: 'Schrift Fließtext', value: result.design?.bodyFontName, preview: 'text' },
      { key: 'design.faviconUrl', label: 'Favicon', value: result.design?.faviconUrl, preview: 'favicon' },
    ];
    return list.filter((f) => f.value);
  }, [result]);

  function toggle(key: string) {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  }

  function handleApply() {
    if (!result) return;
    const out: ExtractedProfile = {};
    const design: NonNullable<ExtractedProfile['design']> = {};
    for (const f of fields) {
      if (!selected[f.key as string]) continue;
      if (typeof f.key === 'string' && f.key.startsWith('design.')) {
        const k = f.key.slice('design.'.length) as keyof NonNullable<ExtractedProfile['design']>;
        (design as Record<string, unknown>)[k] = f.value;
      } else {
        (out as Record<string, unknown>)[f.key as string] = f.value;
      }
    }
    if (Object.keys(design).length > 0) out.design = design;
    onApply(out);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-900">Von Website importieren</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-sm text-slate-500 mb-3">
            Gib die URL eurer Firmenwebsite ein. Die KI extrahiert automatisch Beschreibung, Logo, Farben, Schriften, sowie Datenschutz- und Impressum-Links.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://www.firma.de"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAnalyze(); } }}
                className="input-field pl-9"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="btn-primary whitespace-nowrap flex items-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? 'Analysiere…' : 'Analysieren'}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && fields.length === 0 && (
            <div className="mt-4 text-sm text-slate-500">Keine verwertbaren Daten gefunden.</div>
          )}

          {fields.length > 0 && (
            <div className="mt-5 space-y-2">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Gefundene Daten — wähle aus, was übernommen werden soll</div>
              {fields.map((f) => {
                const key = f.key as string;
                const isSelected = !!selected[key];
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      isSelected ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(key)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-500 mb-0.5">{f.label}</div>
                      {f.preview === 'logo' && f.value && (
                        <img src={f.value} alt="Logo" className="h-12 w-auto max-w-[160px] rounded border border-slate-200 bg-white p-1 object-contain" />
                      )}
                      {f.preview === 'favicon' && f.value && (
                        <img src={f.value} alt="Favicon" className="h-8 w-8 rounded border border-slate-200 bg-white p-0.5 object-contain" />
                      )}
                      {f.preview === 'color' && f.value && (
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 h-6 rounded border border-slate-200" style={{ background: f.value }} />
                          <span className="font-mono text-xs text-slate-700">{f.value}</span>
                        </div>
                      )}
                      {f.preview === 'text' && (
                        <div className="text-sm text-slate-800 break-words line-clamp-3">{f.value}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!result || fields.length === 0 || Object.values(selected).every((v) => !v)}
            className="btn-primary"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
