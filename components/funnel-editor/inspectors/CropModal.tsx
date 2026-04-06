'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Crop } from 'lucide-react';
import { Field, ImageUploadField, Section } from './shared';

// ─── CropBox type ─────────────────────────────────────────────────────────────
export type CropBox = { left: number; top: number; right: number; bottom: number };

const ASPECT_PRESETS = [
  { label: 'S', ratio: 1 },
  { label: 'M', ratio: 4 / 3 },
  { label: 'L', ratio: 16 / 9 },
  { label: 'XL', ratio: 21 / 9 },
];

// ─── Crop modal ───────────────────────────────────────────────────────────────
export function CropModal({ src, initial, onSave, onClose }: {
  src: string;
  initial: CropBox;
  onSave: (crop: CropBox) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState<CropBox>(initial);
  const [activeAspect, setActiveAspect] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  type DragHandle = 'nw' | 'ne' | 'sw' | 'se' | 'move' | 'draw';
  const drag = useRef<{ handle: DragHandle; startX: number; startY: number; startCrop: CropBox } | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const MIN = 5;

  const applyAspect = useCallback((box: CropBox, ratio: number | null): CropBox => {
    if (!ratio) return box;
    const w = box.right - box.left;
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    const newH = w / ratio;
    return {
      left: clamp(cx - w / 2, 0, 100 - w),
      top: clamp(cy - newH / 2, 0, 100 - newH),
      right: clamp(cx + w / 2, w, 100),
      bottom: clamp(cy + newH / 2, newH, 100),
    };
  }, []);

  function startDrag(handle: DragHandle, e: React.MouseEvent, customStartCrop?: CropBox) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: customStartCrop ?? crop };

    function onMove(me: MouseEvent) {
      if (!drag.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((me.clientX - drag.current.startX) / rect.width) * 100;
      const dy = ((me.clientY - drag.current.startY) / rect.height) * 100;
      const s = drag.current.startCrop;
      let { left, top, right, bottom } = s;

      if (drag.current.handle === 'draw') {
        const ox = s.left, oy = s.top;
        const cx = clamp(ox + dx, 0, 100);
        const cy = clamp(oy + dy, 0, 100);
        left   = Math.min(ox, cx);
        top    = Math.min(oy, cy);
        right  = Math.max(ox, cx);
        bottom = Math.max(oy, cy);
      } else if (drag.current.handle === 'move') {
        const w = s.right - s.left, h = s.bottom - s.top;
        left   = clamp(s.left  + dx, 0, 100 - w);
        top    = clamp(s.top   + dy, 0, 100 - h);
        right  = left + w;
        bottom = top + h;
      } else {
        if (drag.current.handle === 'nw' || drag.current.handle === 'sw') left   = clamp(s.left   + dx, 0, s.right  - MIN);
        if (drag.current.handle === 'ne' || drag.current.handle === 'se') right  = clamp(s.right  + dx, s.left   + MIN, 100);
        if (drag.current.handle === 'nw' || drag.current.handle === 'ne') top    = clamp(s.top    + dy, 0, s.bottom - MIN);
        if (drag.current.handle === 'sw' || drag.current.handle === 'se') bottom = clamp(s.bottom + dy, s.top    + MIN, 100);
      }

      let next: CropBox = {
        left:   Math.round(left),
        top:    Math.round(top),
        right:  Math.round(right),
        bottom: Math.round(bottom),
      };
      const ratio = ASPECT_PRESETS.find((a) => a.label === activeAspect)?.ratio ?? null;
      if (ratio && drag.current.handle !== 'move') next = applyAspect(next, ratio);
      setCrop(next);
    }
    function onUp() {
      drag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startDrawFromContainer(e: React.MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ox = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const oy = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const origin: CropBox = { left: ox, top: oy, right: ox, bottom: oy };
    startDrag('draw', e, origin);
  }

  function selectAspect(label: string) {
    const ratio = ASPECT_PRESETS.find((a) => a.label === label)!.ratio;
    setActiveAspect(label);
    setCrop((prev) => applyAspect(prev, ratio));
  }

  const hCls = 'absolute w-3 h-3 bg-white border-2 border-blue-600 rounded-sm z-20 -translate-x-1/2 -translate-y-1/2';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Bild zuschneiden</h2>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">Abbrechen</button>
            <button onClick={() => onSave(crop)} className="px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">Speichern</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-6 pb-4">
          {ASPECT_PRESETS.map((a) => (
            <button key={a.label} onClick={() => selectAspect(a.label)}
              className={`py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${activeAspect === a.label ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 overflow-auto">
          <div ref={containerRef} className="relative select-none overflow-hidden rounded-xl bg-slate-100"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startDrawFromContainer}
          >
            <img src={src} alt="" className="w-full block pointer-events-none" draggable={false} />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-x-0 top-0 bg-black/45" style={{ height: `${crop.top}%` }} />
              <div className="absolute inset-x-0 bottom-0 bg-black/45" style={{ height: `${100 - crop.bottom}%` }} />
              <div className="absolute bg-black/45" style={{ top: `${crop.top}%`, bottom: `${100 - crop.bottom}%`, left: 0, width: `${crop.left}%` }} />
              <div className="absolute bg-black/45" style={{ top: `${crop.top}%`, bottom: `${100 - crop.bottom}%`, right: 0, width: `${100 - crop.right}%` }} />
            </div>

            <div
              className="absolute border-2 border-white"
              style={{ left: `${crop.left}%`, top: `${crop.top}%`, right: `${100 - crop.right}%`, bottom: `${100 - crop.bottom}%`, cursor: 'move' }}
              onMouseDown={(e) => startDrag('move', e)}
            >
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.25) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.25) 1px,transparent 1px)',
                backgroundSize: '33.33% 33.33%',
              }} />
              <div className="absolute inset-0 pointer-events-none" style={{ border: '1.5px dashed rgba(255,255,255,0.6)' }} />
            </div>

            <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.left}%`, top: `${crop.top}%` }}       onMouseDown={(e) => startDrag('nw', e)} />
            <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.right}%`, top: `${crop.top}%` }}      onMouseDown={(e) => startDrag('ne', e)} />
            <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.left}%`, top: `${crop.bottom}%` }}    onMouseDown={(e) => startDrag('sw', e)} />
            <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.right}%`, top: `${crop.bottom}%` }}   onMouseDown={(e) => startDrag('se', e)} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Image block editor ───────────────────────────────────────────────────────
const IMAGE_SIZES = [
  { label: 'Voll', val: 'full' },
  { label: 'L', val: 'l' },
  { label: 'M', val: 'm' },
  { label: 'S', val: 's' },
  { label: 'XS', val: 'xs' },
];

export function ImageBlockEditor({ props, onChange }: {
  props: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [cropOpen, setCropOpen] = useState(false);
  const imgSize = (props.size as string) ?? 'full';
  const cropBox = props.cropBox as CropBox | undefined;
  const hasCrop = cropBox && (cropBox.left !== 0 || cropBox.top !== 0 || cropBox.right !== 100 || cropBox.bottom !== 100);

  return (
    <div className="space-y-3">
      <ImageUploadField value={(props.src as string) ?? ''} onChange={(v) => onChange({ src: v })} label="Bild" />
      <Field label="Größe">
        <div className="flex gap-1.5 flex-wrap">
          {IMAGE_SIZES.map((sz) => (
            <button key={sz.val} type="button" onClick={() => onChange({ size: sz.val })}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${imgSize === sz.val ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {sz.label}
            </button>
          ))}
        </div>
      </Field>
      {(props.src as string) && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCropOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:border-violet-400 hover:text-violet-600 transition-colors">
            <Crop size={11} /> Bild zuschneiden
          </button>
          {hasCrop && (
            <button type="button" onClick={() => onChange({ cropBox: undefined })}
              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">
              Zurücksetzen
            </button>
          )}
        </div>
      )}
      {cropOpen && (props.src as string) && (
        <CropModal
          src={props.src as string}
          initial={cropBox ?? { left: 0, top: 0, right: 100, bottom: 100 }}
          onSave={(box) => { onChange({ cropBox: box }); setCropOpen(false); }}
          onClose={() => setCropOpen(false)}
        />
      )}
      <Section label="Erweitert" collapsible defaultOpen={false}>
        <Field label="Alt-Text">
          <input value={(props.alt as string) ?? ''} onChange={(e) => onChange({ alt: e.target.value })}
            className="input-field text-sm" />
        </Field>
        <Field label="Bildunterschrift">
          <input value={(props.caption as string) ?? ''} onChange={(e) => onChange({ caption: e.target.value })}
            className="input-field text-sm" />
        </Field>
        <Field label="Höhe (px)">
          <input type="number" value={(props.height as number) ?? ''} onChange={(e) => onChange({ height: e.target.value ? Number(e.target.value) : undefined })}
            className="input-field text-sm" placeholder="auto" />
        </Field>
        <Field label="Darstellung">
          <select value={(props.objectFit as string) ?? 'cover'} onChange={(e) => onChange({ objectFit: e.target.value })}
            className="input-field text-sm">
            <option value="cover">Cover (füllt aus)</option>
            <option value="contain">Contain (ganzes Bild)</option>
            <option value="none">Original</option>
          </select>
        </Field>
      </Section>
    </div>
  );
}
