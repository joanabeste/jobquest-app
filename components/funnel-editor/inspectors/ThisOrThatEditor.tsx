'use client';

import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { Field } from './shared';
import { VarInput } from '@/components/funnel-editor/VarInput';
import { DimensionScoresEditor } from './FrageEditor';
import MediaLibrary, { uploadToMediaLibrary } from '@/components/shared/MediaLibrary';
import type { VariableDef } from '@/lib/funnel-variables';

interface Option {
  id: string;
  imageUrl?: string;
  label: string;
  scores: Record<string, number>;
}

export function ThisOrThatEditor({ props, onChange, variables = [] }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
}) {
  const optionA = (props.optionA as Option | undefined) ?? { id: 'A', imageUrl: '', label: 'Option A', scores: {} };
  const optionB = (props.optionB as Option | undefined) ?? { id: 'B', imageUrl: '', label: 'Option B', scores: {} };
  const allowSkip = props.allowSkip === true;

  const missingImages = !optionA.imageUrl && !optionB.imageUrl;

  function patchA(patch: Partial<Option>) { onChange({ optionA: { ...optionA, ...patch } }); }
  function patchB(patch: Partial<Option>) { onChange({ optionB: { ...optionB, ...patch } }); }

  return (
    <div className="space-y-3">
      <Field label="Frage">
        <VarInput
          value={(props.question as string) ?? ''}
          onChange={(v) => onChange({ question: v })}
          variables={variables}
        />
      </Field>

      <Field label="Beschreibung (optional)">
        <input
          value={(props.description as string) ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="input-field text-sm w-full"
          placeholder="Kurzer Untertitel unter der Frage"
        />
      </Field>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allowSkip}
          onChange={(e) => onChange({ allowSkip: e.target.checked })}
          className="accent-violet-600"
        />
        <span className="text-xs text-slate-700">„Überspringen"-Button anzeigen</span>
      </label>

      {missingImages && (
        <div className="flex items-start gap-2 px-2.5 py-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>Beide Optionen brauchen Bilder — ohne Bilder zeigt der Player nur den Anfangsbuchstaben.</span>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100">
        <OptionColumn side="A" option={optionA} onPatch={patchA} />
      </div>
      <div className="pt-2 border-t border-slate-100">
        <OptionColumn side="B" option={optionB} onPatch={patchB} />
      </div>
    </div>
  );
}

// ─── Option column (A or B) ─────────────────────────────────────────────────

function OptionColumn({ side, option, onPatch }: {
  side: 'A' | 'B';
  option: Option;
  onPatch: (patch: Partial<Option>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const asset = await uploadToMediaLibrary(file, { preserveFormat: false });
      onPatch({ imageUrl: asset.url });
    } catch (err) {
      console.error('[ThisOrThatEditor upload]', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Option {side}</p>
      </div>

      {/* Image preview + upload */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-50">
        {option.imageUrl ? (
          <>
            <img src={option.imageUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onPatch({ imageUrl: '' })}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 shadow text-slate-500 hover:text-red-600 flex items-center justify-center"
              aria-label="Bild entfernen"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
            Kein Bild
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-600 hover:bg-slate-50 hover:border-violet-400 disabled:opacity-60"
        >
          <Upload size={11} /> {uploading ? 'Lädt…' : 'Hochladen'}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-600 hover:bg-slate-50 hover:border-violet-400"
        >
          <ImageIcon size={11} /> Mediathek
        </button>
      </div>

      <MediaLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(url) => { onPatch({ imageUrl: url }); setLibraryOpen(false); }}
      />

      <Field label="Label auf dem Bild">
        <input
          value={option.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          className="input-field text-xs w-full"
          placeholder={`Kurztext Option ${side}`}
        />
      </Field>

      <div className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Punkte bei dieser Wahl</p>
        <DimensionScoresEditor
          scores={option.scores ?? {}}
          onChange={(scores) => onPatch({ scores })}
        />
      </div>
    </div>
  );
}
