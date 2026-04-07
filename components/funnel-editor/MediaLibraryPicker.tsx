'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import type { MediaAsset } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function MediaLibraryPicker({ open, onClose, onSelect }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/media')
      .then((r) => r.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .catch(() => setError('Mediathek konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleUpload(file: File) {
    setError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload fehlgeschlagen');
      }
      const asset: MediaAsset = await res.json();
      setAssets((prev) => [asset, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bild wirklich löschen?')) return;
    await fetch(`/api/media/${id}`, { method: 'DELETE' });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">Mediathek</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 border-b border-slate-100">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary disabled:opacity-60"
          >
            <Upload size={16} />
            {uploading ? 'Wird hochgeladen…' : 'Bild hochladen'}
          </button>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center text-sm text-slate-400 py-10">Wird geladen…</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-10">
              <ImageIcon size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Noch keine Bilder. Lade dein erstes Bild hoch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <div key={asset.id} className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-violet-400 transition-colors">
                  <button
                    onClick={() => { onSelect(asset.url); onClose(); }}
                    className="block w-full aspect-square"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="absolute top-1 right-1 p-1 rounded bg-white/90 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="absolute inset-0 bg-violet-600/0 hover:bg-violet-600/10 flex items-center justify-center pointer-events-none transition-colors">
                    <Check size={24} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
