'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage, careerCheckStorage } from '@/lib/storage';
import {
  JobQuest, CareerCheck, ShowcaseConfig, ShowcaseItem, DEFAULT_SHOWCASE,
} from '@/lib/types';
import { slugify } from '@/lib/utils';
import {
  Globe, Save, ExternalLink, Image as ImageIcon, ChevronUp, ChevronDown,
  Trash2, Plus, CheckCircle,
} from 'lucide-react';
import ImageCropModal from '@/components/shared/ImageCropModal';

interface CardEdit {
  itemId: string;
  src: string;
}

export default function UebersichtPage() {
  const { company, updateCompany } = useAuth();
  const [quests, setQuests] = useState<JobQuest[]>([]);
  const [checks, setChecks] = useState<CareerCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<ShowcaseConfig>(DEFAULT_SHOWCASE);
  const [slug, setSlug] = useState('');
  const [questCardImages, setQuestCardImages] = useState<Record<string, string | undefined>>({});
  const [checkCardImages, setCheckCardImages] = useState<Record<string, string | undefined>>({});

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropEdit, setCropEdit] = useState<CardEdit | null>(null);

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
      const qm: Record<string, string | undefined> = {};
      qs.forEach((q) => { qm[q.id] = q.cardImage; });
      setQuestCardImages(qm);
      const cm: Record<string, string | undefined> = {};
      cs.forEach((c) => { cm[c.id] = c.cardImage; });
      setCheckCardImages(cm);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [company]);

  const itemMeta = useMemo(() => {
    const map = new Map<string, { title: string; published: boolean }>();
    quests.forEach((q) => map.set(`jobquest:${q.id}`, { title: q.title, published: q.status === 'published' }));
    checks.forEach((c) => map.set(`berufscheck:${c.id}`, { title: c.title, published: c.status === 'published' }));
    return map;
  }, [quests, checks]);

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

  function pickImageFor(item: ShowcaseItem) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setCropEdit({ itemId: item.id, src: reader.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function applyCrop(base64: string) {
    if (!cropEdit) return;
    const item = config.items.find((it) => it.id === cropEdit.itemId);
    if (!item) { setCropEdit(null); return; }
    if (item.type === 'jobquest') {
      setQuestCardImages((m) => ({ ...m, [item.contentId]: base64 }));
    } else {
      setCheckCardImages((m) => ({ ...m, [item.contentId]: base64 }));
    }
    setCropEdit(null);
  }

  function clearImageFor(item: ShowcaseItem) {
    if (item.type === 'jobquest') {
      setQuestCardImages((m) => ({ ...m, [item.contentId]: undefined }));
    } else {
      setCheckCardImages((m) => ({ ...m, [item.contentId]: undefined }));
    }
  }

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      // Persist any changed card images on the underlying quest/check rows
      const questUpdates = quests
        .filter((q) => questCardImages[q.id] !== q.cardImage)
        .map((q) => questStorage.save({ ...q, cardImage: questCardImages[q.id] ?? undefined }));
      const checkUpdates = checks
        .filter((c) => checkCardImages[c.id] !== c.cardImage)
        .map((c) => careerCheckStorage.save({ ...c, cardImage: checkCardImages[c.id] ?? undefined }));
      await Promise.all([...questUpdates, ...checkUpdates]);

      // Save company showcase config + slug
      await updateCompany({
        ...company,
        slug: slug ? slugify(slug) : undefined,
        showcase: config,
      });
      // Mirror local quest objects so subsequent saves don't re-PUT
      setQuests((prev) => prev.map((q) => ({ ...q, cardImage: questCardImages[q.id] ?? undefined })));
      setChecks((prev) => prev.map((c) => ({ ...c, cardImage: checkCardImages[c.id] ?? undefined })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = slug
    ? (typeof window !== 'undefined' ? `${window.location.origin}/c/${slugify(slug)}` : `/c/${slugify(slug)}`)
    : null;

  if (!company) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      {cropEdit && (
        <ImageCropModal
          src={cropEdit.src}
          title="Karten-Bild zuschneiden"
          onConfirm={applyCrop}
          onCancel={() => setCropEdit(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Übersichtsseite</h1>
          <p className="text-slate-500 text-sm mt-0.5">Eine öffentliche Seite mit allen JobQuests und Berufschecks deiner Wahl.</p>
        </div>
        <div className="flex items-center gap-2">
          {publicUrl && config.enabled && (
            <Link href={publicUrl} target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
              <ExternalLink size={14} /> Vorschau
            </Link>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl transition-colors">
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Gespeichert' : saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* General settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Globe size={16} className="text-violet-600" /> Allgemein
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="w-4 h-4 accent-violet-600" />
            <span className="text-sm text-slate-700">Übersichtsseite öffentlich verfügbar machen</span>
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">URL-Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">/c/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="meine-firma"
                className="input-field text-sm flex-1" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Wird automatisch normalisiert ({slug ? slugify(slug) : '–'}).</p>
          </div>

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
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4">Inhalte auf der Übersicht</h2>

        {loading ? (
          <p className="text-sm text-slate-400">Laden…</p>
        ) : config.items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Noch keine Inhalte ausgewählt – füge unten welche hinzu.</p>
        ) : (
          <ul className="space-y-2">
            {config.items.map((item, idx) => {
              const meta = itemMeta.get(`${item.type}:${item.contentId}`);
              const cardImage = item.type === 'jobquest'
                ? questCardImages[item.contentId]
                : checkCardImages[item.contentId];
              return (
                <li key={item.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {cardImage ? (

                      <img src={cardImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {meta?.title ?? '— gelöscht —'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.type === 'jobquest' ? 'JobQuest' : 'Berufscheck'}
                      {meta && !meta.published && ' · nicht veröffentlicht'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => pickImageFor(item)}
                      className="text-xs px-2 py-1 text-slate-600 hover:text-violet-600">
                      Bild
                    </button>
                    {cardImage && (
                      <button type="button" onClick={() => clearImageFor(item)}
                        className="text-xs text-slate-300 hover:text-red-500" title="Bild entfernen">
                        ✕
                      </button>
                    )}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add picker */}
      {!loading && (availableQuests.length > 0 || availableChecks.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-3 text-sm">Hinzufügen</h2>
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
  );
}
