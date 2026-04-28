'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Pencil, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { validateSlug, type EntityType } from '@/lib/slug-validation';

interface SlugEditorProps {
  slug: string;
  entityId: string;
  entityType: EntityType;
  /** URL path prefix, e.g. "/jobquest" */
  pathPrefix: string;
  /** Called after a successful slug update with the new slug */
  onSlugChanged: (newSlug: string) => void;
  /** Per-content domain preference */
  useCustomDomain?: boolean;
  /** Called when user toggles domain selection */
  onDomainToggle?: (useCustomDomain: boolean) => void;
  /** Company's custom domain, e.g. "karriere.acme.de" */
  customDomain?: string;
  /** Whether the custom domain is verified */
  domainVerified?: boolean;
}

export default function SlugEditor({
  slug, entityId, entityType, pathPrefix, onSlugChanged,
  useCustomDomain, onDomainToggle, customDomain, domainVerified,
}: SlugEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slug);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const saasOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const hasCustomDomain = !!(customDomain && domainVerified);
  const isCustom = !!(useCustomDomain && hasCustomDomain);
  const _displayOrigin = isCustom ? `https://${customDomain}` : saasOrigin;
  const saasHostname = typeof window !== 'undefined' ? window.location.hostname : 'app.jobquest-ausbildung.de';

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(slug);
  }, [slug, editing]);

  const checkAvailability = useCallback((raw: string) => {
    const validation = validateSlug(raw);
    if (!validation.valid) {
      setError(validation.reason ?? 'Ungültiger Slug');
      setAvailable(null);
      setChecking(false);
      return;
    }
    if (validation.sanitized === slug) {
      setError(null);
      setAvailable(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setError(null);
    setAvailable(null);

    fetch(`/api/slugs/available?slug=${encodeURIComponent(validation.sanitized)}&type=${entityType}&excludeId=${entityId}`)
      .then((r) => r.json())
      .then((data: { available: boolean; reason?: string; sanitized?: string }) => {
        if (data.available) {
          setAvailable(true);
          setError(null);
        } else {
          setAvailable(false);
          setError(data.reason ?? 'Nicht verfügbar');
        }
      })
      .catch(() => setError('Prüfung fehlgeschlagen'))
      .finally(() => setChecking(false));
  }, [slug, entityId, entityType]);

  function handleChange(raw: string) {
    setValue(raw);
    setAvailable(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(raw), 350);
  }

  function handleCancel() {
    setEditing(false);
    setValue(slug);
    setError(null);
    setAvailable(null);
  }

  async function handleSave() {
    const validation = validateSlug(value);
    if (!validation.valid) return;
    if (validation.sanitized === slug) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/slugs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, entityType, newSlug: validation.sanitized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Speichern');
        return;
      }
      onSlugChanged(data.slug);
      setEditing(false);
      setError(null);
      setAvailable(null);
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && available) handleSave();
    if (e.key === 'Escape') handleCancel();
  }

  // ── Non-edit mode ──────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
        {hasCustomDomain ? (
          <button
            type="button"
            onClick={() => onDomainToggle?.(!useCustomDomain)}
            className="shrink-0 border-b border-dashed border-slate-300 hover:border-violet-400 hover:text-violet-600 transition-colors cursor-pointer"
            title="Domain wechseln"
          >
            {isCustom ? customDomain : saasHostname}
          </button>
        ) : (
          <span className="shrink-0">{saasHostname}</span>
        )}
        <span className="truncate">{pathPrefix}/{slug}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Slug bearbeiten"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1">
      {/* Domain toggle (only if custom domain available) */}
      {hasCustomDomain && (
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onDomainToggle?.(false)}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors truncate ${
              !isCustom
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {saasHostname}
          </button>
          <button
            type="button"
            onClick={() => onDomainToggle?.(true)}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors truncate ${
              isCustom
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {customDomain}
          </button>
        </div>
      )}

      {/* Slug input */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400 shrink-0">{pathPrefix}/</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xs px-1.5 py-0.5 border rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400 min-w-[120px] flex-1"
          disabled={saving}
        />
        {checking && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
        {!checking && available === false && (
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        )}
        {/* Kein expliziter "verfügbar"-Haken mehr — der Save-Button rechts wird
            automatisch aktiv/farbig, sobald available === true. Zwei nebeneinander
            stehende grüne Haken (Validierung + Speichern) wirkten wie ein Bug. */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !available}
          className="shrink-0 p-0.5 rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Speichern"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="shrink-0 p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 transition-colors"
          title="Abbrechen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
