'use client';

import { Plus, X, RotateCcw } from 'lucide-react';
import { Field, ImageUploadField } from './shared';
import { VarInput, VarTextarea } from '@/components/funnel-editor/VarInput';
import type { VariableDef } from '@/lib/funnel-variables';
import { slugifyVar } from '@/lib/funnel-variables';
import type { SpeakerOverride } from '@/lib/funnel-types';
import { collectSpeakersInBlock } from '@/lib/speaker-ops';

type DialogLineDef = { id: string; speaker: string; text: string; imageUrl?: string; avatarUrl?: string; position?: 'left' | 'right' | 'center' };

export function DialogEditor({ props, onChange, variables = [], speakers, onSpeakersChange }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  variables?: VariableDef[];
  speakers?: Record<string, SpeakerOverride>;
  onSpeakersChange?: (patch: Record<string, SpeakerOverride | null>) => void;
}) {
  const lines = (props.lines as DialogLineDef[]) ?? [];
  const choices = (props.choices as { id: string; text: string; reaction?: string }[]) ?? [];
  const input = (props.input as { placeholder?: string; captures?: string; followUpText?: string } | undefined) ?? null;
  const hasChoices = choices.length > 0;
  const hasInput = !!input;
  const blockSpeakers = collectSpeakersInBlock({ lines });

  // Returns the most recent avatarUrl used for a given speaker name in this
  // block. Used to auto-fill the avatar when the user types a known speaker.
  function previousAvatarFor(speaker: string, excludeId: string): string | undefined {
    if (!speaker) return undefined;
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (l.id !== excludeId && l.speaker === speaker && l.avatarUrl) return l.avatarUrl;
    }
    return undefined;
  }

  function updateLine(id: string, patch: Partial<DialogLineDef>) {
    onChange({
      lines: lines.map((l) => {
        if (l.id !== id) return l;
        const merged = { ...l, ...patch };
        // When the speaker name changes and no own avatar is set yet, inherit
        // the avatar from the most recent line with the same speaker.
        if (patch.speaker !== undefined && !merged.avatarUrl) {
          const inherited = previousAvatarFor(merged.speaker, id);
          if (inherited) merged.avatarUrl = inherited;
        }
        return merged;
      }),
    });
  }
  function updateChoice(i: number, patch: Partial<{ text: string; reaction: string }>) {
    onChange({ choices: choices.map((c, j) => j === i ? { ...c, ...patch } : c) });
  }

  // Findet das erste vorkommende per-Line avatarUrl eines Speakers im
  // aktuellen Block — als Vorschau-Fallback, bevor ein globales Avatar gesetzt
  // wurde. So sieht die Nutzerin sofort etwas, statt eines leeren Slots.
  function firstPerLineAvatarFor(speaker: string): string | undefined {
    for (const l of lines) {
      if (l.speaker === speaker && l.avatarUrl) return l.avatarUrl;
    }
    return undefined;
  }

  function patchSpeaker(speaker: string, patch: SpeakerOverride | null) {
    if (!onSpeakersChange) return;
    onSpeakersChange({ [speaker]: patch });
  }

  return (
    <div className="space-y-3">
      <Field label="Titel (optional)"><VarInput value={(props.title as string) ?? ''} onChange={(v) => onChange({ title: v })} variables={variables} /></Field>

      {onSpeakersChange && blockSpeakers.length > 0 && (
        <div className="border border-ci bg-ci-soft/40 rounded-xl p-2.5 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-ci-ink">Sprecher in dieser Quest</p>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">Anzeigename und Profilbild wirken in <strong>allen Chats</strong> der ganzen Quest.</p>
          <div className="space-y-2">
            {blockSpeakers.map((s) => {
              const ov = speakers?.[s];
              const previewAvatar = ov?.avatarUrl ?? firstPerLineAvatarFor(s);
              const initial = (ov?.displayName?.trim() || s).charAt(0).toUpperCase();
              const hasOverride = !!(ov && (ov.displayName?.trim() || ov.avatarUrl));
              return (
                <div key={s} className="bg-white rounded-lg p-2 border border-ci/70 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {previewAvatar ? (
                      <img src={previewAvatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-ci-soft flex items-center justify-center text-[11px] font-semibold text-ci-ink flex-shrink-0">{initial || '?'}</div>
                    )}
                    <p className="flex-1 text-[12px] font-medium text-slate-700 truncate" title={s}>{s}</p>
                    {hasOverride && (
                      <button
                        onClick={() => patchSpeaker(s, null)}
                        title="Override entfernen"
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                      >
                        <RotateCcw size={11} />
                      </button>
                    )}
                  </div>
                  <input
                    value={ov?.displayName ?? ''}
                    onChange={(e) => patchSpeaker(s, { ...(ov ?? {}), displayName: e.target.value })}
                    placeholder="Anzeigename überschreiben (optional)"
                    className="w-full mini-input"
                  />
                  <ImageUploadField
                    label="Profilbild (global)"
                    value={ov?.avatarUrl ?? ''}
                    onChange={(url) => patchSpeaker(s, { ...(ov ?? {}), avatarUrl: url || undefined })}
                    cropAspect={1}
                    cropTitle="Profilbild-Ausschnitt"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Zeilen</p>
          <button onClick={() => {
            // Inherit avatar from the most recent line of the same speaker
            // when a new line is added. Default speaker name "Sprecher" only
            // matches if a previous line was already named "Sprecher".
            const newSpeaker = 'Sprecher';
            const inherited = previousAvatarFor(newSpeaker, '');
            onChange({
              lines: [
                ...lines,
                { id: crypto.randomUUID(), speaker: newSpeaker, text: '', imageUrl: '', avatarUrl: inherited ?? '' },
              ],
            });
          }}
            className="flex items-center gap-1 text-[10px] text-ci-ink hover:text-ci-ink font-medium">
            <Plus size={11} /> Zeile
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={l.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                {l.avatarUrl ? (
                  <img src={l.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-500 flex-shrink-0">
                    {l.speaker?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <input value={l.speaker} onChange={(e) => updateLine(l.id, { speaker: e.target.value })}
                  className="flex-1 mini-input" placeholder="Sprecher" />
                <button onClick={() => onChange({ lines: lines.filter((_, idx) => idx !== i) })}
                  disabled={lines.length <= 1} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 disabled:opacity-30">
                  <X size={12} />
                </button>
              </div>
              <VarTextarea value={l.text} onChange={(v) => updateLine(l.id, { text: v })}
                rows={2} className="w-full mini-input resize-none" placeholder="Text…" variables={variables} />
              <ImageUploadField
                label="Profilbild (optional)"
                value={l.avatarUrl ?? ''}
                onChange={(v) => updateLine(l.id, { avatarUrl: v })}
                cropAspect={1}
                cropTitle="Profilbild-Ausschnitt"
              />
              <ImageUploadField label="Bild im Chat (optional)" value={l.imageUrl ?? ''} onChange={(v) => updateLine(l.id, { imageUrl: v })} />
            </div>
          ))}
        </div>
      </div>

      {!hasInput && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Antwortoptionen</p>
            <button onClick={() => onChange({ choices: [...choices, { id: crypto.randomUUID(), text: '', reaction: '' }] })}
              className="flex items-center gap-1 text-[10px] text-ci-ink hover:text-ci-ink font-medium">
              <Plus size={11} /> Option
            </button>
          </div>
          {hasChoices && (
            <div className="space-y-2">
              {choices.map((c, i) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-2 space-y-1.5">
                  <div className="flex gap-1">
                    <input value={c.text} onChange={(e) => updateChoice(i, { text: e.target.value })}
                      className="flex-1 mini-input" placeholder="Antworttext" />
                    <button onClick={() => onChange({ choices: choices.filter((_, j) => j !== i) })}
                      className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"><X size={12} /></button>
                  </div>
                  <VarInput value={c.reaction ?? ''} onChange={(v) => updateChoice(i, { reaction: v })}
                    className="w-full mini-input" placeholder="Reaktion des Sprechers (optional)" variables={variables} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasChoices && (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Eingabefeld</p>
            <button
              onClick={() => hasInput
                ? onChange({ input: undefined })
                : onChange({ input: { placeholder: 'Vorname', captures: 'vorname', followUpText: '' } })}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${hasInput ? 'bg-ci-soft text-ci-ink hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:text-ci-ink'}`}
            >
              {hasInput ? '× Entfernen' : '+ Hinzufügen'}
            </button>
          </div>
          {hasInput && (
            <div className="space-y-1.5">
              <input
                value={input?.placeholder ?? ''}
                onChange={(e) => {
                  const ph = e.target.value;
                  const key = slugifyVar(ph) || undefined;
                  onChange({ input: { ...input, placeholder: ph, captures: key } });
                }}
                className="w-full mini-input"
                placeholder="Platzhalter…"
              />
              {input?.captures && (
                <p className="text-[10px] text-ci-ink pl-0.5">Antwort wird als <span className="font-mono">@{input.captures}</span> verfügbar</p>
              )}
              <VarTextarea value={input?.followUpText ?? ''} onChange={(v) => onChange({ input: { ...input, followUpText: v } })}
                rows={2} className="w-full mini-input resize-none" placeholder="Reaktion des Sprechers nach Eingabe (optional)…" variables={variables} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
