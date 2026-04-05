'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Plus, MapPin, Smile } from 'lucide-react';
import { Field } from './shared';
import type { VariableDef } from '@/lib/funnel-variables';
import { DECISION_ICONS, isIconName, isEmoji } from '@/lib/decision-icons';
import { IconEmojiPicker } from './IconEmojiPicker';

interface HotspotDef {
  id: string;
  x: number;
  y: number;
  label: string;
  description: string;
  icon?: string;
}

export function HotspotEditor({ props, onChange, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
}) {
  const imageUrl = (props.imageUrl as string) ?? '';
  const hotspots = (props.hotspots as HotspotDef[]) ?? [];
  const requireAll = (props.requireAll as boolean) ?? true;
  const doneText = (props.doneText as string) ?? 'Weiter erkunden';

  const [selectedId, setSelectedId] = useState<string | null>(hotspots[0]?.id ?? null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // track which hotspot is being dragged
  const draggingId = useRef<string | null>(null);

  const selected = hotspots.find((h) => h.id === selectedId) ?? null;

  function updateHotspot(id: string, patch: Partial<HotspotDef>) {
    onChange({ hotspots: hotspots.map((h) => h.id === id ? { ...h, ...patch } : h) });
  }

  function removeHotspot(id: string) {
    const next = hotspots.filter((h) => h.id !== id);
    onChange({ hotspots: next });
    setSelectedId(next[0]?.id ?? null);
  }

  function getImageXY(e: React.MouseEvent): { x: number; y: number } | null {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    return { x, y };
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    // If a drag just finished, don't add a new hotspot
    if (draggingId.current) return;
    const pos = getImageXY(e);
    if (!pos) return;
    const newSpot: HotspotDef = { id: crypto.randomUUID(), x: pos.x, y: pos.y, label: 'Neuer Punkt', description: '', icon: '' };
    onChange({ hotspots: [...hotspots, newSpot] });
    setSelectedId(newSpot.id);
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handlePinMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent image click
    e.preventDefault();
    draggingId.current = id;
    setSelectedId(id);

    function onMouseMove(ev: MouseEvent) {
      const img = imgRef.current;
      if (!img || !draggingId.current) return;
      const rect = img.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, Math.round(((ev.clientX - rect.left) / rect.width) * 100)));
      const y = Math.min(100, Math.max(0, Math.round(((ev.clientY - rect.top) / rect.height) * 100)));
      // Update in place without re-setting selectedId so the editor panel stays open
      onChange({ hotspots: hotspots.map((h) => h.id === draggingId.current ? { ...h, x, y } : h) });
    }

    function onMouseUp() {
      draggingId.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [hotspots, onChange]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {/* Image upload */}
      <Field label="Bild">
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="block text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 cursor-pointer"
        />
      </Field>

      {/* Image with hotspot placement */}
      {imageUrl ? (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Hotspots platzieren</p>
          <p className="text-[10px] text-slate-400 mb-2">Klick auf Bild → neuer Hotspot. Punkte ziehen zum Verschieben.</p>
          <div className="relative rounded-xl overflow-hidden border border-slate-200 select-none">
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="w-full object-cover cursor-crosshair"
              style={{ maxHeight: 220, display: 'block' }}
              onClick={handleImageClick}
              draggable={false}
            />
            {hotspots.map((h, i) => {
              const isActive = selectedId === h.id;
              return (
                <div
                  key={h.id}
                  className="absolute"
                  style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)', zIndex: isActive ? 20 : 10 }}
                >
                  {/* Delete button */}
                  {isActive && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeHotspot(h.id); }}
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center z-30 shadow"
                      style={{ zIndex: 30 }}
                    >
                      <X size={8} />
                    </button>
                  )}
                  {/* Pin button — draggable */}
                  <button
                    type="button"
                    onMouseDown={(e) => handlePinMouseDown(e, h.id)}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(h.id); }}
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shadow-md border-2 transition-colors cursor-grab active:cursor-grabbing ${
                      isActive
                        ? 'bg-rose-500 border-rose-600 text-white'
                        : 'bg-white border-rose-400 text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`${h.label} – ziehen zum Verschieben`}
                  >
                    {i + 1}
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onChange({ imageUrl: '' })}
            className="mt-1.5 text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"
          >
            <X size={10} /> Bild entfernen
          </button>
        </div>
      ) : (
        <div className="w-full h-28 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5 text-slate-400">
          <MapPin size={20} />
          <span className="text-[11px]">Erst Bild hochladen</span>
        </div>
      )}

      {/* Selected hotspot editor */}
      {selected && (
        <div className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Hotspot {hotspots.findIndex((h) => h.id === selected.id) + 1} bearbeiten
            </p>
            <button
              type="button"
              onClick={() => removeHotspot(selected.id)}
              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <Field label="Label (kurz)">
            <input
              value={selected.label}
              onChange={(e) => updateHotspot(selected.id, { label: e.target.value })}
              className="input-field text-sm w-full"
              placeholder="z.B. Pausenraum"
            />
          </Field>

          <Field label="Beschreibung">
            <textarea
              value={selected.description}
              onChange={(e) => updateHotspot(selected.id, { description: e.target.value })}
              className="input-field text-sm w-full resize-none"
              rows={3}
              placeholder="Was gibt es hier zu entdecken?"
            />
          </Field>

          {/* Icon/emoji picker */}
          <Field label="Icon oder Emoji (optional)">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIconPickerOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 hover:border-violet-300 transition-colors"
              >
                {isIconName(selected.icon)
                  ? (() => { const Ic = DECISION_ICONS[selected.icon!]; return <Ic size={13} className="text-violet-500" />; })()
                  : isEmoji(selected.icon)
                    ? <span className="text-base leading-none">{selected.icon}</span>
                    : <Smile size={13} className="text-slate-400" />
                }
                <span>{selected.icon && (isIconName(selected.icon) || isEmoji(selected.icon)) ? selected.icon : 'Wählen…'}</span>
              </button>
              {selected.icon && (
                <button type="button" onClick={() => updateHotspot(selected.id, { icon: '' })} className="text-[10px] text-slate-400 hover:text-red-500">
                  <X size={10} />
                </button>
              )}
            </div>
            {iconPickerOpen && (
              <div className="mt-1.5">
                <IconEmojiPicker
                  value={selected.icon}
                  onChange={(v) => updateHotspot(selected.id, { icon: v })}
                  onClose={() => setIconPickerOpen(false)}
                />
              </div>
            )}
          </Field>
        </div>
      )}

      {!selected && imageUrl && (
        <p className="text-[11px] text-slate-400 text-center">Klicke auf das Bild um den ersten Hotspot zu platzieren</p>
      )}

      {imageUrl && (
        <button
          type="button"
          onClick={() => {
            const newSpot: HotspotDef = { id: crypto.randomUUID(), x: 50, y: 50, label: 'Neuer Punkt', description: '', icon: '' };
            onChange({ hotspots: [...hotspots, newSpot] });
            setSelectedId(newSpot.id);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-slate-200 text-xs text-slate-400 font-medium hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/40 transition-all rounded-xl"
        >
          <Plus size={11} /> Hotspot hinzufügen
        </button>
      )}

      <div className="h-px bg-slate-100" />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requireAll"
          checked={requireAll}
          onChange={(e) => onChange({ requireAll: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="requireAll" className="text-[11px] text-slate-600 cursor-pointer">
          Alle Hotspots müssen entdeckt werden
        </label>
      </div>

      <Field label="Button-Text">
        <input
          value={doneText}
          onChange={(e) => onChange({ doneText: e.target.value })}
          className="input-field text-sm w-full"
          placeholder="Weiter erkunden"
        />
      </Field>
    </div>
  );
}
