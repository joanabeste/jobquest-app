'use client';

import { Plus, X } from 'lucide-react';
import { Field, Section } from './shared';
import { useFunnelEditorCtx } from '../FunnelEditorContext';
import type { FunnelPage } from '@/lib/funnel-types';

interface Link { id: string; label: string; url: string; icon?: 'video' | 'doc' | 'apply' | 'link' }
interface Suggestion {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  requiresDimensionIds?: string[];
  links?: Link[];
}
interface Group {
  id: string;
  label: string;
  visibleIf?: { sourceBlockId: string; equals: string[] };
  dimensionIds: string[];
  showBars: boolean;
  topN?: number;
  suggestions: Suggestion[];
}

function uid() { return crypto.randomUUID(); }

export function ErgebnisGroupsEditor({ props, onChange, pages }: {
  props: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  pages?: FunnelPage[];
}) {
  const layout = ((props.layout as string) || 'simple') as 'simple' | 'groups';
  const groups = (props.groups as Group[]) ?? [];
  const { dimensions } = useFunnelEditorCtx();

  function patchGroup(id: string, patch: Partial<Group>) {
    onChange({ groups: groups.map((g) => g.id === id ? { ...g, ...patch } : g) });
  }
  function addGroup() {
    onChange({
      groups: [...groups, {
        id: uid(),
        label: `Gruppe ${groups.length + 1}`,
        dimensionIds: [],
        showBars: true,
        topN: 3,
        suggestions: [],
      }],
    });
  }
  function removeGroup(id: string) {
    onChange({ groups: groups.filter((g) => g.id !== id) });
  }

  // Find candidate "filter" blocks on previous pages — currently any check_frage / quest_decision.
  const filterBlocks: Array<{ id: string; label: string; options: Array<{ id: string; text: string }> }> = [];
  if (pages) {
    pages.forEach((page) => {
      page.nodes.forEach((node) => {
        if (node.kind !== 'block') return;
        if (node.type === 'check_frage' || node.type === 'quest_decision') {
          const opts = (node.props.options as Array<{ id: string; text: string }>) ?? [];
          filterBlocks.push({
            id: node.id,
            label: (node.props.question as string) || page.name || 'Frage',
            options: opts,
          });
        }
      });
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Layout">
        <select
          value={layout}
          onChange={(e) => onChange({ layout: e.target.value })}
          className="input-field text-sm"
        >
          <option value="simple">Einfach – Dimensions-Balken</option>
          <option value="groups">Gruppen – Tabs / Spalten mit Vorschlägen</option>
        </select>
      </Field>

      {layout === 'simple' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.showDimensionBars !== false}
            onChange={(e) => onChange({ showDimensionBars: e.target.checked })}
            className="accent-violet-600"
          />
          <span className="text-xs text-slate-700">Dimensions-Balken anzeigen</span>
        </label>
      ) : (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Gruppen ({groups.length})</p>
            <button onClick={addGroup} className="flex items-center gap-1 text-[10px] text-violet-600 font-medium">
              <Plus size={11} /> Gruppe
            </button>
          </div>
          <div className="space-y-2">
            {groups.map((g, idx) => (
              <details key={g.id} className="border border-slate-200 rounded-lg bg-slate-50/50" open={idx === groups.length - 1}>
                <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span className="truncate">{g.label || `Gruppe ${idx + 1}`}</span>
                  <button onClick={(e) => { e.preventDefault(); removeGroup(g.id); }} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500">
                    <X size={11} />
                  </button>
                </summary>
                <div className="p-3 pt-2 space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Beschriftung</label>
                    <input
                      value={g.label}
                      onChange={(e) => patchGroup(g.id, { label: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Dimensionen in dieser Gruppe</label>
                    <div className="space-y-1">
                      {dimensions.length === 0 && (
                        <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Keine Berufsfelder definiert.
                        </p>
                      )}
                      {dimensions.map((dim) => {
                        const checked = g.dimensionIds.includes(dim.id);
                        return (
                          <label key={dim.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...g.dimensionIds, dim.id]
                                  : g.dimensionIds.filter((d) => d !== dim.id);
                                patchGroup(g.id, { dimensionIds: next });
                              }}
                              className="accent-violet-600"
                            />
                            <span style={{ color: dim.color }}>{dim.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={g.showBars}
                      onChange={(e) => patchGroup(g.id, { showBars: e.target.checked })}
                      className="accent-violet-600"
                    />
                    <span className="text-xs text-slate-700">Balken anzeigen</span>
                  </label>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Top-N für Filterung</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={g.topN ?? 3}
                      onChange={(e) => patchGroup(g.id, { topN: parseInt(e.target.value) || 3 })}
                      className="input-field text-xs w-20"
                    />
                  </div>

                  <Section label="Sichtbar wenn …" collapsible defaultOpen={!!g.visibleIf}>
                    {filterBlocks.length === 0 ? (
                      <p className="text-[10px] text-slate-400">Keine Filterfragen vorhanden. Lege auf einer früheren Seite eine Frage an.</p>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={g.visibleIf?.sourceBlockId ?? ''}
                          onChange={(e) => {
                            const sourceBlockId = e.target.value;
                            if (!sourceBlockId) {
                              patchGroup(g.id, { visibleIf: undefined });
                            } else {
                              patchGroup(g.id, { visibleIf: { sourceBlockId, equals: g.visibleIf?.equals ?? [] } });
                            }
                          }}
                          className="input-field text-xs w-full"
                        >
                          <option value="">— Immer sichtbar —</option>
                          {filterBlocks.map((b) => (
                            <option key={b.id} value={b.id}>{b.label.slice(0, 40)}</option>
                          ))}
                        </select>
                        {g.visibleIf && (
                          <div className="space-y-1 pl-2 border-l-2 border-violet-200">
                            <p className="text-[10px] font-semibold text-slate-500">Wenn Antwort eine von:</p>
                            {(filterBlocks.find((b) => b.id === g.visibleIf!.sourceBlockId)?.options ?? []).map((opt) => {
                              const checked = g.visibleIf!.equals.includes(opt.id);
                              return (
                                <label key={opt.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...g.visibleIf!.equals, opt.id]
                                        : g.visibleIf!.equals.filter((v) => v !== opt.id);
                                      patchGroup(g.id, { visibleIf: { ...g.visibleIf!, equals: next } });
                                    }}
                                    className="accent-violet-600"
                                  />
                                  <span>{opt.text}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </Section>

                  <Section label={`Vorschläge (${g.suggestions.length})`} collapsible defaultOpen={false}>
                    <SuggestionList
                      group={g}
                      onChange={(suggestions) => patchGroup(g.id, { suggestions })}
                    />
                  </Section>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionList({ group, onChange }: { group: Group; onChange: (s: Suggestion[]) => void }) {
  const { dimensions } = useFunnelEditorCtx();
  function add() {
    onChange([...group.suggestions, { id: uid(), title: 'Neuer Vorschlag', links: [] }]);
  }
  function patch(id: string, p: Partial<Suggestion>) {
    onChange(group.suggestions.map((s) => s.id === id ? { ...s, ...p } : s));
  }
  function remove(id: string) {
    onChange(group.suggestions.filter((s) => s.id !== id));
  }
  return (
    <div className="space-y-2">
      {group.suggestions.map((sug, idx) => (
        <details key={sug.id} className="border border-slate-200 rounded bg-white" open={idx === group.suggestions.length - 1}>
          <summary className="px-2 py-1.5 text-xs font-medium cursor-pointer flex items-center justify-between">
            <span className="truncate">{sug.title || '(Ohne Titel)'}</span>
            <button onClick={(e) => { e.preventDefault(); remove(sug.id); }} className="text-slate-400 hover:text-red-500"><X size={10} /></button>
          </summary>
          <div className="p-2 pt-1 space-y-1.5">
            <input
              value={sug.title}
              onChange={(e) => patch(sug.id, { title: e.target.value })}
              className="input-field text-xs"
              placeholder="Titel"
            />
            <textarea
              value={sug.description ?? ''}
              onChange={(e) => patch(sug.id, { description: e.target.value || undefined })}
              className="input-field text-xs resize-none"
              rows={2}
              placeholder="Beschreibung (optional)"
            />
            <input
              value={sug.imageUrl ?? ''}
              onChange={(e) => patch(sug.id, { imageUrl: e.target.value || undefined })}
              className="input-field text-xs"
              placeholder="Bild-URL"
            />

            <div className="border-t border-slate-100 pt-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Erscheint nur, wenn diese Dimensionen Top sind</p>
              <div className="flex flex-wrap gap-1">
                {dimensions.filter((d) => group.dimensionIds.includes(d.id)).map((dim) => {
                  const active = (sug.requiresDimensionIds ?? []).includes(dim.id);
                  return (
                    <button
                      key={dim.id}
                      onClick={() => {
                        const cur = sug.requiresDimensionIds ?? [];
                        const next = active ? cur.filter((d) => d !== dim.id) : [...cur, dim.id];
                        patch(sug.id, { requiresDimensionIds: next.length > 0 ? next : undefined });
                      }}
                      className="text-[10px] px-1.5 py-0.5 rounded border"
                      style={active
                        ? { background: dim.color, color: 'white', borderColor: dim.color }
                        : { color: dim.color, borderColor: (dim.color || '#cbd5e1') + '80' }}
                    >
                      {dim.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Links</p>
              <div className="space-y-1">
                {(sug.links ?? []).map((l) => (
                  <div key={l.id} className="flex gap-1">
                    <select
                      value={l.icon ?? 'link'}
                      onChange={(e) => patch(sug.id, { links: (sug.links ?? []).map((x) => x.id === l.id ? { ...x, icon: e.target.value as Link['icon'] } : x) })}
                      className="text-[10px] bg-white border border-slate-200 rounded px-1"
                    >
                      <option value="link">🔗</option>
                      <option value="video">🎬</option>
                      <option value="doc">📄</option>
                      <option value="apply">📨</option>
                    </select>
                    <input
                      value={l.label}
                      onChange={(e) => patch(sug.id, { links: (sug.links ?? []).map((x) => x.id === l.id ? { ...x, label: e.target.value } : x) })}
                      placeholder="Label"
                      className="flex-1 mini-input text-[10px]"
                    />
                    <input
                      value={l.url}
                      onChange={(e) => patch(sug.id, { links: (sug.links ?? []).map((x) => x.id === l.id ? { ...x, url: e.target.value } : x) })}
                      placeholder="URL"
                      className="flex-1 mini-input text-[10px]"
                    />
                    <button onClick={() => patch(sug.id, { links: (sug.links ?? []).filter((x) => x.id !== l.id) })} className="text-slate-300 hover:text-red-500"><X size={9} /></button>
                  </div>
                ))}
                <button
                  onClick={() => patch(sug.id, { links: [...(sug.links ?? []), { id: uid(), label: 'Link', url: '', icon: 'link' }] })}
                  className="text-[10px] text-violet-600 font-medium flex items-center gap-1"
                >
                  <Plus size={9} /> Link
                </button>
              </div>
            </div>
          </div>
        </details>
      ))}
      <button onClick={add} className="text-[10px] text-violet-600 font-medium flex items-center gap-1">
        <Plus size={11} /> Vorschlag hinzufügen
      </button>
    </div>
  );
}
