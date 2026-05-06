'use client';

import { useRef, useState } from 'react';

/**
 * Generic image crop modal: draggable + resizable rectangle, outputs the
 * cropped region as a PNG data URL at the source's natural pixel size.
 *
 * `aspect` (pixel ratio of the cropped region, e.g. 1 = square, 16/9 =
 * landscape) optionally locks the rectangle. When omitted, the user can
 * resize freely on both axes.
 */
export default function ImageCropModal({
  src,
  onConfirm,
  onCancel,
  title = 'Bild zuschneiden',
  aspect,
}: {
  src: string;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
  title?: string;
  aspect?: number;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [crop, setCrop] = useState({ left: 0, top: 0, right: 100, bottom: 100 });

  type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move';
  const drag = useRef<{ handle: Handle; startX: number; startY: number; start: typeof crop } | null>(null);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const MIN = 5;

  // Crop coords are stored in *percent of container*. Aspect is given in
  // *pixel* terms, so we convert by the image's natural aspect to keep the
  // rectangle visually correct on non-square images.
  function pctRatio(): number | undefined {
    if (!aspect) return undefined;
    const imgAspect = natW / natH;
    if (!imgAspect || !isFinite(imgAspect)) return undefined;
    return aspect / imgAspect; // (right-left)/(bottom-top) in pct units
  }

  function onLoad() {
    const img = imgRef.current!;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatW(w);
    setNatH(h);
    if (aspect) {
      // Init with the largest centered aspect-locked rectangle.
      const imgAspect = w / h;
      const r = aspect / imgAspect; // pct width / pct height target
      let pw = 100;
      let ph = pw / r;
      if (ph > 100) { ph = 100; pw = ph * r; }
      const left = (100 - pw) / 2;
      const top = (100 - ph) / 2;
      setCrop({ left, top, right: left + pw, bottom: top + ph });
    }
  }

  function startDrag(handle: Handle, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { handle, startX: e.clientX, startY: e.clientY, start: crop };
    function onMove(me: MouseEvent) {
      if (!drag.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((me.clientX - drag.current.startX) / rect.width) * 100;
      const dy = ((me.clientY - drag.current.startY) / rect.height) * 100;
      const s = drag.current.start;
      let { left, top, right, bottom } = s;
      if (drag.current.handle === 'move') {
        const w = s.right - s.left, h = s.bottom - s.top;
        left = clamp(s.left + dx, 0, 100 - w);
        top = clamp(s.top + dy, 0, 100 - h);
        right = left + w;
        bottom = top + h;
      } else {
        if (drag.current.handle === 'nw' || drag.current.handle === 'sw') left = clamp(s.left + dx, 0, s.right - MIN);
        if (drag.current.handle === 'ne' || drag.current.handle === 'se') right = clamp(s.right + dx, s.left + MIN, 100);
        if (drag.current.handle === 'nw' || drag.current.handle === 'ne') top = clamp(s.top + dy, 0, s.bottom - MIN);
        if (drag.current.handle === 'sw' || drag.current.handle === 'se') bottom = clamp(s.bottom + dy, s.top + MIN, 100);

        const r = pctRatio();
        if (r) {
          // x-axis is master (gives a stable feel when dragging diagonally on
          // a non-square image). Recompute the y-axis off the x-extent and
          // anchor it to the opposite corner of the dragged handle.
          const w = right - left;
          const targetH = w / r;
          const handle = drag.current.handle;
          const goesUp = handle === 'nw' || handle === 'ne';
          if (goesUp) {
            top = bottom - targetH;
          } else {
            bottom = top + targetH;
          }
          // If the new height blows past the canvas, shrink back to the
          // largest aspect-locked rect that still fits at the cursor's anchor.
          if (top < 0 || bottom > 100) {
            const overflow = top < 0 ? -top : bottom - 100;
            const scale = (targetH - overflow) / targetH;
            const newW = w * scale;
            // keep the anchor (opposite corner of dragged handle) fixed
            if (handle === 'nw') { left = right - newW; top = bottom - newW / r; }
            if (handle === 'ne') { right = left + newW; top = bottom - newW / r; }
            if (handle === 'sw') { left = right - newW; bottom = top + newW / r; }
            if (handle === 'se') { right = left + newW; bottom = top + newW / r; }
          }
        }
      }
      setCrop({ left, top, right, bottom });
    }
    function onUp() {
      drag.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natW || !natH) return;
    const sx = (crop.left / 100) * natW;
    const sy = (crop.top / 100) * natH;
    const sw = ((crop.right - crop.left) / 100) * natW;
    const sh = ((crop.bottom - crop.top) / 100) * natH;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onConfirm(canvas.toDataURL('image/png'));
  }

  const hCls = 'absolute w-3 h-3 bg-white border-2 border-violet-600 rounded-sm z-20 -translate-x-1/2 -translate-y-1/2';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl">
        <h3 className="font-semibold text-slate-900 mb-4 text-center text-base">{title}</h3>

        <div
          ref={containerRef}
          className="relative overflow-hidden mx-auto rounded-xl select-none bg-slate-100"
          style={{ touchAction: 'none' }}
        >

          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onLoad}
            draggable={false}
            crossOrigin="anonymous"
            className="w-full block pointer-events-none"
          />
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
          />
          <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.left}%`, top: `${crop.top}%` }} onMouseDown={(e) => startDrag('nw', e)} />
          <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.right}%`, top: `${crop.top}%` }} onMouseDown={(e) => startDrag('ne', e)} />
          <div className={`${hCls} cursor-nesw-resize`} style={{ left: `${crop.left}%`, top: `${crop.bottom}%` }} onMouseDown={(e) => startDrag('sw', e)} />
          <div className={`${hCls} cursor-nwse-resize`} style={{ left: `${crop.right}%`, top: `${crop.bottom}%` }} onMouseDown={(e) => startDrag('se', e)} />
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-3">Rechteck verschieben oder an den Ecken anpassen</p>

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            Abbrechen
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
