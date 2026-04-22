'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link as LinkIcon, Copy, Check, Download, X, QrCode } from 'lucide-react';

interface Props {
  url: string;
  title?: string;
  logoUrl?: string;
  onClose: () => void;
}

export default function ShareModal({ url, title, logoUrl, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    const svg = qrWrapperRef.current?.querySelector('svg');
    if (!svg) return;

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Render to canvas at high resolution
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1) Draw the QR itself. The <image>-Element, das qrcode.react per
    //    imageSettings ins SVG packt, wird beim Laden des SVG als Blob-URL
    //    NICHT mitgerendert (Browser-Sandboxing external images) — deshalb
    //    overlayen wir das Logo unten separat.
    const qrImg = new Image();
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = reject;
      qrImg.src = svgUrl;
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(qrImg, 0, 0, size, size);
    URL.revokeObjectURL(svgUrl);

    // 2) Logo separat in die Mitte zeichnen, damit es auch im PNG landet.
    //    Level=H verträgt ~30% Verlust → 18% Logo-Breite ist sicher.
    if (logoUrl) {
      try {
        const logoImg = new Image();
        // crossOrigin für externe Logos (Supabase Storage etc.) — Data-URLs
        // ignorieren den Flag. Bei CORS-Fehler wird der catch unten aktiv.
        logoImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject(new Error('logo_load_failed'));
          logoImg.src = logoUrl;
        });
        const logoBoxSize = Math.round(size * 0.22);
        const logoDrawSize = Math.round(size * 0.18);
        const boxX = (size - logoBoxSize) / 2;
        const boxY = (size - logoBoxSize) / 2;
        const drawX = (size - logoDrawSize) / 2;
        const drawY = (size - logoDrawSize) / 2;
        // Weißer Hintergrund unter dem Logo für sauberen Kontrast zum QR.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(boxX, boxY, logoBoxSize, logoBoxSize);
        // Logo proportional (contain) in das Zentrum der Box zeichnen.
        const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
        let drawW = logoDrawSize;
        let drawH = logoDrawSize;
        if (ratio > 1) drawH = Math.round(logoDrawSize / ratio);
        else if (ratio < 1) drawW = Math.round(logoDrawSize * ratio);
        const offsetX = drawX + (logoDrawSize - drawW) / 2;
        const offsetY = drawY + (logoDrawSize - drawH) / 2;
        ctx.drawImage(logoImg, offsetX, offsetY, drawW, drawH);
      } catch (err) {
        console.warn('[ShareModal] Logo konnte nicht in den Download eingebettet werden:', err);
      }
    }

    // 3) Trigger download
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${title?.replace(/[^a-zA-Z0-9-_]/g, '_') ?? 'qr-code'}.png`;
    a.click();
  }

  // Logo image settings for the QR code center
  const imageSettings = logoUrl ? {
    src: logoUrl,
    height: 48,
    width: 48,
    excavate: true,
  } : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">Teilen</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {title && (
          <p className="text-sm text-slate-500 mb-4 truncate">{title}</p>
        )}

        {/* QR-Code */}
        <div className="flex justify-center mb-5">
          <div ref={qrWrapperRef} className="p-4 bg-white rounded-2xl border border-slate-200">
            <QRCodeSVG
              value={url}
              size={220}
              level="H"
              imageSettings={imageSettings}
            />
          </div>
        </div>

        {/* URL */}
        <div className="bg-slate-50 rounded-xl p-3 mb-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Link</p>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-slate-700 flex-1 truncate">{url}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            {copied ? 'Kopiert!' : 'Link kopieren'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
          >
            <Download size={15} />
            QR herunterladen
          </button>
        </div>

        <button
          onClick={() => window.open(url, '_blank')}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs text-slate-500 hover:text-violet-600 transition-colors"
        >
          <LinkIcon size={12} /> In neuem Tab öffnen
        </button>
      </div>
    </div>
  );
}
