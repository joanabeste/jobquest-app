'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, ImageIcon, Upload, Crop } from 'lucide-react';
import MediaLibraryPicker from '../MediaLibraryPicker';
import ImageCropModal from '@/components/shared/ImageCropModal';
import { uploadToMediaLibrary } from '@/components/shared/MediaLibrary';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

export function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field text-sm" />
    </Field>
  );
}

export function ImageUploadField({ label, value, onChange, cropAspect, cropTitle }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** When set, shows an "Ausschnitt anpassen" button under the preview that
   *  opens a crop modal locked to this pixel aspect ratio (e.g. 1 = square,
   *  16/9 = landscape). Without it, the field stays a plain media picker. */
  cropAspect?: number;
  cropTitle?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cropping, setCropping] = useState<{ src: string } | null>(null);

  async function handleCropConfirm(base64: string) {
    setCropping(null);
    try {
      const blob = await (await fetch(base64)).blob();
      const asset = await uploadToMediaLibrary(blob, { filename: 'crop.png' });
      onChange(asset.url);
    } catch (e) {
      // Fallback to the raw data URL so the user does not lose their crop.
      console.error('[ImageUploadField] cropped upload failed, using data URL', e);
      onChange(base64);
    }
  }

  return (
    <Field label={label}>
      {value && (
        <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 mb-1.5">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 p-1 bg-white rounded-lg shadow text-slate-500 hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 hover:bg-slate-50 hover:border-violet-400 transition-colors"
      >
        {value ? <Upload size={12} /> : <ImageIcon size={12} />}
        {value ? 'Bild ändern' : 'Bild aus Mediathek wählen'}
      </button>
      {cropAspect && value && (
        <button
          type="button"
          onClick={() => setCropping({ src: value })}
          className="w-full flex items-center justify-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 hover:bg-slate-50 hover:border-violet-400 transition-colors"
        >
          <Crop size={11} /> Ausschnitt anpassen
        </button>
      )}
      <MediaLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => onChange(url)}
      />
      {cropping && (
        <ImageCropModal
          src={cropping.src}
          aspect={cropAspect}
          title={cropTitle ?? 'Ausschnitt anpassen'}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropping(null)}
        />
      )}
    </Field>
  );
}

export function Section({ label, children, collapsible, defaultOpen = true }: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (collapsible) {
    return (
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
          {open ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
        </button>
        {open && <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100">{children}</div>}
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}
