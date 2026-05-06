'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, Pencil, Sparkles, Wand2, ArrowLeft, ArrowRight, X, AlertTriangle } from 'lucide-react';
import {
  applyDiffSelection,
  dependencies,
  dependents,
  selectableChangeIds,
  summarizeBlockLabel,
  type ChangeId,
  type FunnelDiff,
  type PageChange,
  type BlockChange,
  type DimensionChange,
} from '@/lib/funnel-diff';
import { wordDiff } from '@/lib/text-diff';
import type { FunnelNode, FunnelPage } from '@/lib/funnel-types';
import type { Dimension } from '@/lib/types';

interface Props {
  prev: { pages: FunnelPage[]; dimensions: Dimension[] };
  next: { pages: FunnelPage[]; dimensions: Dimension[] };
  instructions: string;
  changesSummary: string[];
  diff: FunnelDiff;
  onApply: (merged: { pages: FunnelPage[]; dimensions: Dimension[]; warnings: string[] }) => void;
  onBack: () => void;
  onClose: () => void;
}

export default function RefinePreviewModal({
  prev,
  next,
  instructions,
  changesSummary,
  diff,
  onApply,
  onBack,
  onClose,
}: Props) {
  const allIds = useMemo(() => selectableChangeIds(diff), [diff]);
  const [selection, setSelection] = useState<Set<ChangeId>>(() => new Set(allIds));
  const [expandedPages, setExpandedPages] = useState<Set<string>>(() => new Set(diff.pages.map((p) => p.id)));
  const [expandedFields, setExpandedFields] = useState<Set<string>>(() => {
    // Auto-expand all modified blocks so the inline diff is visible without
    // an extra click. User can collapse if it gets too noisy.
    const ids = new Set<string>();
    for (const pc of diff.pages) {
      if (pc.kind !== 'modified') continue;
      for (const bc of pc.blocks) if (bc.kind === 'modified') ids.add(bc.id);
      if (pc.metaChangeId) ids.add(pc.metaChangeId);
    }
    return ids;
  });

  const totalChanges = allIds.length;
  const selectedCount = selection.size;
  const hasNoChanges = totalChanges === 0;

  function toggle(id: ChangeId) {
    setSelection((prevSel) => {
      const sel = new Set(prevSel);
      if (sel.has(id)) {
        // Deselect: also drop dependents (changes that needed this one).
        sel.delete(id);
        for (const depId of dependents(diff, id)) sel.delete(depId);
      } else {
        // Select: also pull in dependencies.
        sel.add(id);
        for (const depId of dependencies(diff, id)) sel.add(depId);
      }
      return sel;
    });
  }

  function togglePageExpansion(id: string) {
    setExpandedPages((prevSet) => {
      const next = new Set(prevSet);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleFieldExpansion(id: string) {
    setExpandedFields((prevSet) => {
      const next = new Set(prevSet);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelection(new Set(allIds)); }
  function selectNone() { setSelection(new Set()); }

  function handleApply() {
    const merged = applyDiffSelection(prev, next, diff, selection);
    onApply(merged);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <h2 className="text-base font-semibold text-slate-900">KI-Vorschlag prüfen</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Wähle aus, welche Änderungen übernommen werden sollen. Nicht angehakte Punkte bleiben wie vorher.
          </p>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Anweisung (collapsible note) */}
          <details className="group rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
              Deine Anweisung
            </summary>
            <p className="mt-2 text-xs text-slate-600 italic whitespace-pre-wrap">{instructions}</p>
          </details>

          {/* changesSummary aus KI-Antwort */}
          <section>
            <h3 className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Wand2 size={12} className="text-violet-500" />
              Was die KI sagt, dass sie geändert hat
            </h3>
            {changesSummary.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                Die KI hat keine Selbstauskunft mitgeschickt. Prüfe die tatsächlichen Änderungen unten.
              </p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-600 pl-2">
                {changesSummary.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-violet-400">•</span><span>{s}</span></li>
                ))}
              </ul>
            )}
          </section>

          {/* No-change shortcut */}
          {hasNoChanges && (
            <div className="text-center py-6 text-sm text-slate-500">
              Keine Änderungen erkannt — das Modell hat den Check unverändert zurückgegeben.
            </div>
          )}

          {/* Page changes */}
          {diff.pages.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-700">Tatsächliche Änderungen</h3>
                <div className="flex gap-2 text-[11px]">
                  <button onClick={selectAll} className="text-violet-600 hover:underline">Alle</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={selectNone} className="text-slate-500 hover:underline">Keine</button>
                </div>
              </div>
              <div className="space-y-2">
                {diff.pages.map((pc) => (
                  <PageChangeCard
                    key={pc.id}
                    change={pc}
                    selection={selection}
                    onToggle={toggle}
                    expanded={expandedPages.has(pc.id)}
                    onExpand={() => togglePageExpansion(pc.id)}
                    expandedFields={expandedFields}
                    onToggleField={toggleFieldExpansion}
                  />
                ))}
              </div>
              {(diff.unchangedPageCount > 0 || diff.unchangedBlockCount > 0) && (
                <p className="text-[11px] text-slate-400 mt-2">
                  Unverändert: {diff.unchangedPageCount} Seiten, {diff.unchangedBlockCount} Blöcke.
                </p>
              )}
            </section>
          )}

          {/* Dimension changes */}
          {diff.dimensions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-700 mb-2">Dimensionen</h3>
              <div className="space-y-1.5">
                {diff.dimensions.map((dc) => (
                  <DimensionRow key={dc.id} change={dc} selected={selection.has(dc.id)} onToggle={() => toggle(dc.id)} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {selectedCount} von {totalChanges} Änderungen ausgewählt
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={14} /> Anweisung anpassen
            </button>
            <button
              onClick={handleApply}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles size={14} /> Übernehmen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page change card ───────────────────────────────────────────────────────

function PageChangeCard({
  change,
  selection,
  onToggle,
  expanded,
  onExpand,
  expandedFields,
  onToggleField,
}: {
  change: PageChange;
  selection: Set<ChangeId>;
  onToggle: (id: ChangeId) => void;
  expanded: boolean;
  onExpand: () => void;
  expandedFields: Set<string>;
  onToggleField: (id: string) => void;
}) {
  const symbol =
    change.kind === 'added' ? <Plus size={14} className="text-violet-500" /> :
    change.kind === 'removed' ? <Minus size={14} className="text-red-500" /> :
    <Pencil size={14} className="text-amber-500" />;

  if (change.kind === 'added' || change.kind === 'removed') {
    const pageName = change.kind === 'added' ? change.page.name : change.page.name;
    const blockCount = change.kind === 'added' ? change.page.nodes.length : change.page.nodes.length;
    const colorClass = change.kind === 'added' ? 'border-violet-200 bg-violet-50/30' : 'border-red-200 bg-red-50/30';
    return (
      <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${colorClass} cursor-pointer hover:bg-opacity-50`}>
        <input
          type="checkbox"
          checked={selection.has(change.id)}
          onChange={() => onToggle(change.id)}
          className="w-3.5 h-3.5 accent-violet-600"
        />
        {symbol}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            Seite {change.kind === 'added' ? 'hinzufügen' : 'entfernen'}: {pageName || '(unbenannt)'}
          </p>
          <p className="text-[11px] text-slate-500">{blockCount} {blockCount === 1 ? 'Block' : 'Blöcke'}</p>
        </div>
      </label>
    );
  }

  // modified
  const blockChangeCount = change.blocks.length;
  const totalChanges = blockChangeCount + (change.metaChangeId ? 1 : 0);
  const selectedHere =
    change.blocks.filter((b) => selection.has(b.id)).length +
    (change.metaChangeId && selection.has(change.metaChangeId) ? 1 : 0);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
      <button
        onClick={onExpand}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {symbol}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            Seite ändern: {change.after.name || '(unbenannt)'}
          </p>
          <p className="text-[11px] text-slate-500">
            {selectedHere}/{totalChanges} Änderungen aktiv
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 pt-1 space-y-1 border-t border-amber-100">
          {change.metaChangeId && (
            <div className="rounded">
              <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selection.has(change.metaChangeId)}
                  onChange={() => onToggle(change.metaChangeId!)}
                  className="mt-0.5 w-3.5 h-3.5 accent-violet-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">Seiten-Eigenschaften</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {change.metaFields.map((f) => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{f}</span>
                    ))}
                    {change.orderChanged && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Reihenfolge</span>
                    )}
                  </div>
                </div>
              </label>
              <div className="px-2 pb-2 pl-9 space-y-1.5">
                {change.metaFields.map((f) => (
                  <FieldDiff key={f} field={f} beforeVal={readPageField(change.before, f)} afterVal={readPageField(change.after, f)} />
                ))}
                {change.orderChanged && (
                  <ReorderDiff before={change.before} after={change.after} />
                )}
              </div>
            </div>
          )}
          {change.blocks.map((bc) => (
            <BlockChangeRow
              key={bc.id}
              change={bc}
              selected={selection.has(bc.id)}
              onToggle={() => onToggle(bc.id)}
              expanded={expandedFields.has(bc.id)}
              onExpand={() => onToggleField(bc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block change row ───────────────────────────────────────────────────────

function BlockChangeRow({
  change,
  selected,
  onToggle,
  expanded,
  onExpand,
}: {
  change: BlockChange;
  selected: boolean;
  onToggle: () => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const symbol =
    change.kind === 'added' ? <Plus size={12} className="text-violet-500" /> :
    change.kind === 'removed' ? <Minus size={12} className="text-red-500" /> :
    <Pencil size={12} className="text-amber-500" />;
  const labelNode = change.kind === 'added' ? change.node : change.kind === 'removed' ? change.node : change.after;
  const label = summarizeBlockLabel(labelNode);

  return (
    <div className="rounded hover:bg-white/70">
      <div className="flex items-start gap-2 px-2 py-1.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 w-3.5 h-3.5 accent-violet-600 shrink-0"
        />
        <button
          onClick={change.kind === 'modified' ? onExpand : undefined}
          className="flex-1 min-w-0 text-left flex items-start gap-2"
          disabled={change.kind !== 'modified'}
        >
          <span className="mt-0.5 shrink-0">{symbol}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-700 truncate">{label}</p>
            {change.kind === 'modified' && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {change.fields.slice(0, 5).map((f) => (
                  <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{f}</span>
                ))}
                {change.fields.length > 5 && (
                  <span className="text-[10px] text-slate-400">+{change.fields.length - 5}</span>
                )}
              </div>
            )}
          </div>
          {change.kind === 'modified' && (
            <span className="text-slate-400 mt-0.5 shrink-0">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
        </button>
      </div>

      {change.kind === 'modified' && expanded && (
        <div className="px-2 pb-2 pl-9 space-y-1.5">
          {change.fields.map((f) => (
            <FieldDiff
              key={f}
              field={f}
              beforeVal={readBlockField(change.before, f)}
              afterVal={readBlockField(change.after, f)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field-level before/after rendering ─────────────────────────────────────

const STRING_INLINE_DIFF_LIMIT = 800;

function FieldDiff({ field, beforeVal, afterVal }: { field: string; beforeVal: unknown; afterVal: unknown }) {
  if (deepEqual(beforeVal, afterVal)) return null;

  return (
    <div className="text-[11px]">
      <p className="font-medium text-slate-600 mb-0.5">{prettyFieldName(field)}</p>
      <FieldDiffBody beforeVal={beforeVal} afterVal={afterVal} />
    </div>
  );
}

function FieldDiffBody({ beforeVal, afterVal }: { beforeVal: unknown; afterVal: unknown }) {
  // 1. Both strings → inline word diff (fallback to two-box for long ones).
  if (typeof beforeVal === 'string' && typeof afterVal === 'string') {
    if (beforeVal.length > STRING_INLINE_DIFF_LIMIT || afterVal.length > STRING_INLINE_DIFF_LIMIT) {
      return <TwoBoxDiff before={beforeVal} after={afterVal} />;
    }
    return <InlineTextDiff before={beforeVal} after={afterVal} />;
  }

  // 2. One side string (added/cleared) → inline rendering with a single side.
  if (typeof beforeVal === 'string' || typeof afterVal === 'string') {
    return <InlineTextDiff before={typeof beforeVal === 'string' ? beforeVal : ''} after={typeof afterVal === 'string' ? afterVal : ''} />;
  }

  // 3. Both arrays → item-level diff.
  if (Array.isArray(beforeVal) && Array.isArray(afterVal)) {
    return <ListDiff before={beforeVal} after={afterVal} />;
  }

  // 4. Primitive → compact "X → Y".
  if (isPrimitive(beforeVal) && isPrimitive(afterVal)) {
    return <PrimitiveDiff before={beforeVal} after={afterVal} />;
  }

  // 5. Fallback: pretty JSON in two boxes.
  return <TwoBoxDiff before={prettyJson(beforeVal)} after={prettyJson(afterVal)} />;
}

function InlineTextDiff({ before, after }: { before: string; after: string }) {
  const tokens = wordDiff(before, after);
  return (
    <p className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700 whitespace-pre-wrap break-words leading-snug">
      {tokens.map((t, i) => {
        if (t.type === 'common') return <span key={i}>{t.text}</span>;
        if (t.type === 'remove') {
          return <span key={i} className="bg-red-100 text-red-800 line-through decoration-red-400/60 rounded px-0.5">{t.text}</span>;
        }
        return <span key={i} className="bg-emerald-100 text-emerald-800 rounded px-0.5">{t.text}</span>;
      })}
    </p>
  );
}

interface IdLike { id?: unknown }
function hasIds(arr: unknown[]): arr is Array<Record<string, unknown> & IdLike> {
  if (arr.length === 0) return false;
  return arr.every((x) => x && typeof x === 'object' && !Array.isArray(x) && typeof (x as IdLike).id === 'string');
}

function ListDiff({ before, after }: { before: unknown[]; after: unknown[] }) {
  // ID-based matching when possible (options, statements, cards, …).
  if (hasIds(before) && hasIds(after)) {
    const byId = new Map<string, { before?: Record<string, unknown>; after?: Record<string, unknown> }>();
    for (const item of before) {
      const id = String(item.id);
      byId.set(id, { ...(byId.get(id) ?? {}), before: item });
    }
    for (const item of after) {
      const id = String(item.id);
      byId.set(id, { ...(byId.get(id) ?? {}), after: item });
    }

    type Row = { id: string; status: 'added' | 'removed' | 'modified' | 'unchanged'; label: string };
    const rows: Row[] = [];
    for (const [id, entry] of byId) {
      if (entry.before && !entry.after) rows.push({ id, status: 'removed', label: itemLabel(entry.before) });
      else if (!entry.before && entry.after) rows.push({ id, status: 'added', label: itemLabel(entry.after) });
      else if (entry.before && entry.after) {
        const same = deepEqual(entry.before, entry.after);
        rows.push({ id, status: same ? 'unchanged' : 'modified', label: itemLabel(entry.after) });
      }
    }
    const changed = rows.filter((r): r is Row & { status: 'added' | 'removed' | 'modified' } => r.status !== 'unchanged');
    const unchanged = rows.length - changed.length;

    return (
      <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 space-y-1">
        {changed.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Reihenfolge oder Inhalt geändert (keine ID-Änderungen erkannt).</p>
        ) : (
          changed.map((row) => (
            <ListDiffRow
              key={row.id}
              status={row.status}
              label={row.label}
              before={row.status === 'modified' ? byId.get(row.id)?.before : undefined}
              after={row.status === 'modified' ? byId.get(row.id)?.after : undefined}
            />
          ))
        )}
        {unchanged > 0 && (
          <p className="text-[10px] text-slate-400">… und {unchanged} {unchanged === 1 ? 'Eintrag' : 'Einträge'} unverändert</p>
        )}
      </div>
    );
  }

  // Position-based fallback for primitive arrays.
  const max = Math.max(before.length, after.length);
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 space-y-0.5">
      {Array.from({ length: max }, (_, i) => {
        const b = before[i];
        const a = after[i];
        if (deepEqual(b, a)) return null;
        return (
          <div key={i} className="flex items-baseline gap-1.5 text-[11px]">
            <span className="text-slate-400 font-mono w-6 shrink-0">[{i}]</span>
            <FieldDiffBody beforeVal={b} afterVal={a} />
          </div>
        );
      })}
    </div>
  );
}

function ListDiffRow({ status, label, before, after }: {
  status: 'added' | 'removed' | 'modified';
  label: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  const symbol =
    status === 'added' ? <Plus size={10} className="text-violet-500" /> :
    status === 'removed' ? <Minus size={10} className="text-red-500" /> :
    <Pencil size={10} className="text-amber-500" />;
  const colorClass =
    status === 'added' ? 'text-violet-700' :
    status === 'removed' ? 'text-red-700 line-through decoration-red-300' :
    'text-amber-800';

  if (status === 'modified' && before && after) {
    const changedKeys = diffObjectKeys(before, after);
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-[11px]">
          <span>{symbol}</span>
          <span className={colorClass}>{label}</span>
        </div>
        <div className="pl-4 space-y-0.5">
          {changedKeys.map((k) => (
            <FieldDiff key={k} field={k} beforeVal={before[k]} afterVal={after[k]} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span>{symbol}</span>
      <span className={colorClass}>{label}</span>
    </div>
  );
}

function PrimitiveDiff({ before, after }: { before: unknown; after: unknown }) {
  const fmt = (v: unknown) => v === undefined ? '—' : String(v);
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="rounded bg-red-100 text-red-800 px-1.5 py-0.5 line-through decoration-red-400/60">{fmt(before)}</span>
      <ArrowRight size={10} className="text-slate-400 shrink-0" />
      <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5">{fmt(after)}</span>
    </div>
  );
}

function TwoBoxDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="rounded bg-red-50 border border-red-100 px-2 py-1 text-slate-600 whitespace-pre-wrap break-words">{before || '—'}</div>
      <div className="rounded bg-emerald-50 border border-emerald-100 px-2 py-1 text-slate-700 whitespace-pre-wrap break-words">{after || '—'}</div>
    </div>
  );
}

// ─── Order/reorder visualization for page-level meta changes ────────────────

function ReorderDiff({ before, after }: { before: FunnelPage; after: FunnelPage }) {
  const renderRow = (page: FunnelPage, label: string) => (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <ol className="text-[11px] text-slate-700 space-y-0.5">
        {page.nodes.map((n, i) => (
          <li key={n.id} className="flex gap-1.5">
            <span className="text-slate-400 font-mono w-5 shrink-0">{i + 1}.</span>
            <span className="truncate">{summarizeBlockLabel(n)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 grid grid-cols-2 gap-2">
      {renderRow(before, 'Reihenfolge vorher')}
      {renderRow(after, 'Reihenfolge nachher')}
    </div>
  );
}

// ─── Read helpers ───────────────────────────────────────────────────────────

function readBlockField(node: FunnelNode, field: string): unknown {
  if (field === 'style') return node.style;
  if (field === 'kind') return node.kind;
  if (field === 'type' && node.kind === 'block') return node.type;
  if (node.kind === 'block') return (node.props as Record<string, unknown>)?.[field];
  return undefined;
}

function readPageField(page: FunnelPage, field: string): unknown {
  switch (field) {
    case 'name': return page.name;
    case 'nextPageId': return page.nextPageId;
    case 'visibleIf': return page.visibleIf;
    case 'hideLocationHint': return page.hideLocationHint;
    default: return (page as unknown as Record<string, unknown>)[field];
  }
}

// ─── Misc helpers ───────────────────────────────────────────────────────────

function isPrimitive(v: unknown): v is string | number | boolean | null | undefined {
  return v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

function diffObjectKeys(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  // Hide internal id from the per-field detail (the id was used to match items).
  keys.delete('id');
  return Array.from(keys).filter((k) => !deepEqual(a[k], b[k]));
}

function itemLabel(item: Record<string, unknown>): string {
  for (const k of ['text', 'label', 'title', 'name', 'question']) {
    const v = item[k];
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.length > 60 ? `${v.slice(0, 60)}…` : v;
    }
  }
  const id = item.id;
  return typeof id === 'string' ? id : '(unbenannt)';
}

function prettyJson(v: unknown): string {
  if (v === undefined) return '—';
  try {
    const json = JSON.stringify(v, null, 2);
    return json.length > 800 ? `${json.slice(0, 800)}…` : json;
  } catch {
    return String(v);
  }
}

function prettyFieldName(f: string): string {
  // Slight nicety: friendlier German label for the most common fields.
  const map: Record<string, string> = {
    name: 'Name',
    text: 'Text',
    title: 'Titel',
    question: 'Frage',
    label: 'Beschriftung',
    options: 'Optionen',
    statements: 'Aussagen',
    cards: 'Karten',
    style: 'Stil',
    nextPageId: 'Nächste Seite',
    visibleIf: 'Sichtbarkeits-Bedingung',
    hideLocationHint: 'Ortshinweis verbergen',
    sliderDimensionId: 'Slider-Dimension',
    optionA: 'Option A',
    optionB: 'Option B',
    optionPositive: 'Option Ja',
    optionNeutral: 'Option Vielleicht',
    optionNegative: 'Option Nein',
  };
  return map[f] ?? f;
}

// ─── Dimension row ──────────────────────────────────────────────────────────

function DimensionRow({ change, selected, onToggle }: { change: DimensionChange; selected: boolean; onToggle: () => void }) {
  const symbol =
    change.kind === 'added' ? <Plus size={12} className="text-violet-500" /> :
    change.kind === 'removed' ? <Minus size={12} className="text-red-500" /> :
    <Pencil size={12} className="text-amber-500" />;
  const name =
    change.kind === 'added' ? change.dimension.name :
    change.kind === 'removed' ? change.dimension.name :
    change.after.name;
  const colorClass =
    change.kind === 'added' ? 'border-violet-100 bg-violet-50/30' :
    change.kind === 'removed' ? 'border-red-100 bg-red-50/30' :
    'border-amber-100 bg-amber-50/30';
  return (
    <label className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${colorClass} cursor-pointer hover:bg-opacity-50`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="w-3.5 h-3.5 accent-violet-600" />
      {symbol}
      <span className="flex-1 min-w-0 text-xs text-slate-700 truncate">
        {change.kind === 'added' ? 'neu' : change.kind === 'removed' ? 'entfernen' : 'ändern'}: {name || '(unbenannt)'}
      </span>
      {change.kind === 'modified' && (
        <span className="flex gap-1">
          {change.fields.map((f) => (
            <span key={f} className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800">{f}</span>
          ))}
        </span>
      )}
    </label>
  );
}

// ─── Warnings strip (used by parent after apply) ────────────────────────────
// Exported so the integrator can render warnings inline instead of a confirm.
export function RefineWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
      <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="text-[11px] text-amber-900 space-y-1">
        <p className="font-medium">Konsistenz-Hinweise nach dem Übernehmen:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    </div>
  );
}
