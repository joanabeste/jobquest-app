'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage, careerCheckStorage } from '@/lib/storage';
import {
  JobQuest, CareerCheck, ShowcaseConfig, DEFAULT_SHOWCASE,
} from '@/lib/types';
import { slugify } from '@/lib/utils';
import { getPublicUrl } from '@/lib/url';
import {
  Globe, Save, ExternalLink, ChevronUp, ChevronDown,
  Trash2, Plus, CheckCircle, Copy, Check, Image as ImageIcon, X,
} from 'lucide-react';
import MediaLibrary from '@/components/shared/MediaLibrary';
import ShareButton from '@/components/dashboard/ShareButton';

export default function UebersichtPage() {
  const { company, updateCompany } = useAuth();
  const [quests, setQuests] = useState<JobQuest[]>([]);
  const [checks, setChecks] = useState<CareerCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<ShowcaseConfig>(DEFAULT_SHOWCASE);
  const [slug, setSlug] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Load company data + content
  useEffect(() => {
    if (!company) return;
    setConfig({ ...DEFAULT_SHOWCASE, ...(company.showcase ?? {}) });
    setSlug(company.slug ?? '');
    let cancelled = false;
    Promise.all([
      questStorage.getByCompany(company.id),
      careerCheckStorage.getByCompany(company.id),
    ]).then(([qs, cs]) => {
      if (cancelled) return;
      setQuests(qs);
      setChecks(cs);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  // Debounced live slug-availability check.
  useEffect(() => {
    const normalized = slugify(slug);
    if (!normalized) { setSlugStatus('idle'); return; }
    if (normalized === company?.slug) { setSlugStatus('available'); return; }
    if (normalized.length < 3) { setSlugStatus('invalid'); return; }
    setSlugStatus('checking');
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/slug-available?slug=${encodeURIComponent(normalized)}`);
        const json = await res.json();
        setSlugStatus(json.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, company?.slug]);

  const itemMeta = useMemo(() => {
    const map = new Map<string, { title: string; published: boolean; cardImage?: string }>();
    quests.forEach((q) => map.set(`jobquest:${q.id}`, { title: q.title, published: q.status === 'published', cardImage: q.cardImage }));
    checks.forEach((c) => map.set(`berufscheck:${c.id}`, { title: c.title, published: c.status === 'published', cardImage: c.cardImage }));
    return map;
  }, [quests, checks]);

  // Card image state (stored on quest/check, not on showcase item)
  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  useEffect(() => {
    const imgs: Record<string, string> = {};
    quests.forEach((q) => { if (q.cardImage) imgs[q.id] = q.cardImage; });
    checks.forEach((c) => { if (c.cardImage) imgs[c.id] = c.cardImage; });
    setCardImages(imgs);
  }, [quests, checks]);

  async function updateCardImage(type: 'jobquest' | 'berufscheck', contentId: string, imageUrl: string) {
    setCardImages((prev) => ({ ...prev, [contentId]: imageUrl }));
    const endpoint = type === 'jobquest' ? 'quests' : 'career-checks';
    try {
      await fetch(`/api/${endpoint}/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardImage: imageUrl || null }),
      });
    } catch { /* silent */ }
  }

  const [mediaPickerFor, setMediaPickerFor] = useState<{ type: 'jobquest' | 'berufscheck'; contentId: string } | null>(null);

  // Items not yet on the showcase, available to add
  const availableQuests = quests.filter(
    (q) => !config.items.some((it) => it.type === 'jobquest' && it.contentId === q.id),
  );
  const availableChecks = checks.filter(
    (c) => !config.items.some((it) => it.type === 'berufscheck' && it.contentId === c.id),
  );

  function addItem(type: 'jobquest' | 'berufscheck', contentId: string) {
    const id = (typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    setConfig((c) => ({ ...c, items: [...c.items, { id, type, contentId }] }));
  }
  function removeItem(itemId: string) {
    setConfig((c) => ({ ...c, items: c.items.filter((it) => it.id !== itemId) }));
  }
  function moveItem(itemId: string, dir: -1 | 1) {
    setConfig((c) => {
      const idx = c.items.findIndex((it) => it.id === itemId);
      if (idx < 0) return c;
      const j = idx + dir;
      if (j < 0 || j >= c.items.length) return c;
      const next = [...c.items];
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...c, items: next };
    });
  }

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      // Save company showcase config + slug. Server validates uniqueness
      // and returns a 409 if the slug is already taken.
      const normalized = slug ? slugify(slug) : '';
      await updateCompany({
        ...company,
        slug: normalized || undefined,
        showcase: config,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  // Public URL reflects the *saved* slug on the company, not the input field —
  // so it always matches what visitors actually see.
  const publicUrl = company?.slug
    ? getPublicUrl(`/c/${company.slug}`, company)
    : null;
  const isLive = !!(company?.showcase?.enabled && publicUrl);
  // Base-URL (alles bis /c/) für die Inline-Slug-Edit-Zeile
  const urlBase = company ? getPublicUrl('/c/', company) : '/c/';
  const slugDirty = !!company?.slug && slug.trim() !== company.slug;

  function handleCopy() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!company) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Übersichtsseite</h1>
          <p className="text-slate-500 text-sm mt-0.5">Eine öffentliche Seite mit allen JobQuests und Berufschecks deiner Wahl.</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && publicUrl && company?.slug && (
            <>
              <ShareButton path={`/c/${company.slug}`} title={`${company.name} – Übersicht`} />
              <Link href={publicUrl} target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                <ExternalLink size={14} /> Vorschau
              </Link>
            </>
          )}
          <button onClick={handleSave} disabled={saving || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-colors">
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Gespeichert' : saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Status card — Toggle + Live-URL */}
      <div className={`mb-6 rounded-2xl border shadow-sm p-5 transition-colors ${
        config.enabled
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {config.enabled ? (
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
              )}
              <span className={`text-sm font-semibold ${config.enabled ? 'text-emerald-900' : 'text-slate-700'}`}>
                {config.enabled ? 'Übersichtsseite ist live' : 'Übersichtsseite ist offline'}
              </span>
            </div>
            <p className={`text-xs ${config.enabled ? 'text-emerald-700' : 'text-slate-500'}`}>
              {config.enabled
                ? 'Die Seite ist öffentlich erreichbar.'
                : 'Niemand kann die Seite aktuell aufrufen.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              config.enabled ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                config.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Inline URL + Slug-Eingabe */}
        <div className={`mt-4 flex items-center gap-2 bg-white rounded-xl border px-3 py-2 ${
          config.enabled ? 'border-emerald-200' : 'border-slate-200'
        }`}>
          <Globe size={14} className={`flex-shrink-0 ${config.enabled ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-sm font-mono text-slate-400 truncate">{urlBase}</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="meine-firma"
            className={`flex-1 min-w-0 text-sm font-mono bg-transparent border-0 border-b border-dashed px-0 py-0 focus:outline-none focus:ring-0 ${
              slugStatus === 'taken' || slugStatus === 'invalid'
                ? 'border-red-300 text-red-700 focus:border-red-500'
                : slugStatus === 'available'
                ? 'border-emerald-300 text-slate-800 focus:border-emerald-500'
                : 'border-slate-300 text-slate-800 focus:border-violet-500'
            }`}
          />
          {slugStatus === 'checking' && <span className="text-[11px] text-slate-400 flex-shrink-0">prüfe…</span>}
          {slugStatus === 'available' && <Check size={13} className="text-emerald-600 flex-shrink-0" />}
          {slugStatus === 'taken' && <span className="text-[11px] text-red-600 flex-shrink-0">vergeben</span>}
          {slugStatus === 'invalid' && <span className="text-[11px] text-red-600 flex-shrink-0">zu kurz</span>}

          {config.enabled && publicUrl && !slugDirty && (
            <>
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex-shrink-0">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
              <Link href={publicUrl} target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex-shrink-0">
                <ExternalLink size={12} /> Öffnen
              </Link>
            </>
          )}
        </div>

        {/* Helper-Hinweise unter der URL-Zeile */}
        {(slugDirty || slugStatus === 'invalid' || slugStatus === 'taken') && (
          <p className="text-[11px] text-slate-500 mt-2">
            {slugStatus === 'invalid' && 'Mindestens 3 Zeichen.'}
            {slugStatus === 'taken' && 'Dieser Slug ist bereits vergeben.'}
            {slugDirty && slugStatus !== 'invalid' && slugStatus !== 'taken' && 'Änderung noch nicht gespeichert.'}
          </p>
        )}
      </div>

      {/* General settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Globe size={16} className="text-violet-600" /> Inhalt
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Überschrift (optional)</label>
            <input value={config.headline ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, headline: e.target.value }))}
              placeholder={`Willkommen bei ${company.name}`}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Untertext (optional)</label>
            <textarea value={config.subtext ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, subtext: e.target.value }))}
              rows={2}
              placeholder="Entdecke unsere Berufe spielerisch."
              className="input-field text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Headerbild (optional)</label>
            {config.imageUrl ? (
              <div className="flex items-center gap-3 mt-1">
                <img src={config.imageUrl} alt="" className="h-16 w-28 object-cover rounded-lg border border-slate-200" />
                <button type="button" onClick={() => setConfig((c) => ({ ...c, imageUrl: undefined }))}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <button type="button"
                onClick={() => setMediaPickerFor({ type: 'jobquest', contentId: '__header__' })}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg hover:border-violet-300 hover:text-violet-600 transition-colors">
                <ImageIcon size={12} /> Bild aus Mediathek wahlen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Per-section texts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-1">Sektionstexte</h2>
        <p className="text-xs text-slate-400 mb-4">JobQuests und Berufschecks erscheinen in getrennten Bereichen mit eigenen Texten.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">JobQuests</p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Überschrift</label>
              <input value={config.questsHeadline ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, questsHeadline: e.target.value }))}
                placeholder="JobQuests"
                className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Untertext</label>
              <textarea value={config.questsSubtext ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, questsSubtext: e.target.value }))}
                rows={2}
                placeholder="Spielerisch unsere Berufe erleben."
                className="input-field text-sm w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Berufschecks</p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Überschrift</label>
              <input value={config.checksHeadline ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, checksHeadline: e.target.value }))}
                placeholder="Berufschecks"
                className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Untertext</label>
              <textarea value={config.checksSubtext ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, checksSubtext: e.target.value }))}
                rows={2}
                placeholder="Finde heraus, welcher Beruf zu dir passt."
                className="input-field text-sm w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Inhalte auf der Übersicht</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Laden…</p>
        ) : config.items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Noch keine Inhalte ausgewählt – füge unten welche hinzu.</p>
        ) : null}
        {!loading && config.items.length > 0 && (
          <ul className="space-y-2">
            {config.items.map((item, idx) => {
              const meta = itemMeta.get(`${item.type}:${item.contentId}`);
              return (
                <li key={item.id}
                  className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    {cardImages[item.contentId] && (
                      <img src={cardImages[item.contentId]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {meta?.title ?? '— geloscht —'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.type === 'jobquest' ? 'JobQuest' : 'Berufscheck'}
                        {meta && !meta.published && ' · nicht veroffentlicht'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveItem(item.id, -1)} disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveItem(item.id, 1)} disabled={idx === config.items.length - 1}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    {cardImages[item.contentId] ? (
                      <div className="flex items-center gap-2">
                        <img src={cardImages[item.contentId]} alt="" className="h-8 w-14 object-cover rounded" />
                        <span className="text-[11px] text-slate-500 truncate flex-1">{cardImages[item.contentId].split('/').pop()}</span>
                        <button type="button" onClick={() => updateCardImage(item.type, item.contentId, '')}
                          className="p-1 text-slate-400 hover:text-red-500"><X size={12} /></button>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => setMediaPickerFor({ type: item.type, contentId: item.contentId })}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg hover:border-violet-300 hover:text-violet-600 transition-colors">
                        <ImageIcon size={12} /> Titelbild wahlen
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Add picker — inline under the items list */}
        {!loading && (availableQuests.length > 0 || availableChecks.length > 0) && (
          <div className={config.items.length > 0 ? 'mt-5 pt-5 border-t border-slate-100' : ''}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Hinzufügen</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {availableQuests.map((q) => (
                <button key={q.id} type="button" onClick={() => addItem('jobquest', q.id)}
                  className="flex items-center gap-2 p-2 text-left border border-slate-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors">
                  <Plus size={14} className="text-violet-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{q.title}</span>
                  <span className="text-[10px] text-slate-400">JobQuest</span>
                </button>
              ))}
              {availableChecks.map((c) => (
                <button key={c.id} type="button" onClick={() => addItem('berufscheck', c.id)}
                  className="flex items-center gap-2 p-2 text-left border border-slate-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors">
                  <Plus size={14} className="text-violet-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{c.title}</span>
                  <span className="text-[10px] text-slate-400">Berufscheck</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <MediaLibrary
        open={!!mediaPickerFor}
        onClose={() => setMediaPickerFor(null)}
        onSelect={(url) => {
          if (mediaPickerFor) {
            if (mediaPickerFor.contentId === '__header__') {
              setConfig((c) => ({ ...c, imageUrl: url }));
            } else {
              updateCardImage(mediaPickerFor.type, mediaPickerFor.contentId, url);
            }
            setMediaPickerFor(null);
          }
        }}
      />
    </div>
  );
}
