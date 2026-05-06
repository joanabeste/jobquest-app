import type { BlockNode, FunnelNode, FunnelPage, LayoutNode, VisibilityCondition } from './funnel-types';
import type { Dimension } from './types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChangeId = string;

export type BlockPath =
  | { kind: 'page' }
  | { kind: 'layout'; layoutId: string; columnId: string };

export type BlockChange =
  | { id: ChangeId; kind: 'added'; pageId: string; node: FunnelNode; parentPath: BlockPath; index: number }
  | { id: ChangeId; kind: 'removed'; pageId: string; node: FunnelNode; parentPath: BlockPath }
  | { id: ChangeId; kind: 'modified'; pageId: string; before: FunnelNode; after: FunnelNode; fields: string[]; parentPath: BlockPath };

export type PageChange =
  | { id: ChangeId; kind: 'added'; page: FunnelPage; index: number }
  | { id: ChangeId; kind: 'removed'; page: FunnelPage }
  | {
      id: ChangeId;
      kind: 'modified';
      pageId: string;
      before: FunnelPage;
      after: FunnelPage;
      metaFields: string[];
      orderChanged: boolean;
      blocks: BlockChange[];
      metaChangeId: ChangeId | null;
    };

export type DimensionChange =
  | { id: ChangeId; kind: 'added'; dimension: Dimension }
  | { id: ChangeId; kind: 'removed'; dimension: Dimension }
  | { id: ChangeId; kind: 'modified'; before: Dimension; after: Dimension; fields: string[] };

export interface FunnelDiff {
  pages: PageChange[];
  dimensions: DimensionChange[];
  unchangedPageCount: number;
  unchangedBlockCount: number;
}

export type Selection = Set<ChangeId>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
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

interface FlatNodeEntry {
  node: FunnelNode;
  pageId: string;
  parentPath: BlockPath;
  index: number; // index within direct parent (page.nodes or column.nodes)
}

function flattenPageNodes(page: FunnelPage): FlatNodeEntry[] {
  const out: FlatNodeEntry[] = [];
  page.nodes.forEach((n, idx) => {
    out.push({ node: n, pageId: page.id, parentPath: { kind: 'page' }, index: idx });
    if (n.kind === 'layout') {
      n.columns.forEach((col) => {
        col.nodes.forEach((cn, cidx) => {
          out.push({
            node: cn,
            pageId: page.id,
            parentPath: { kind: 'layout', layoutId: n.id, columnId: col.id },
            index: cidx,
          });
        });
      });
    }
  });
  return out;
}

function nodePropFields(before: FunnelNode, after: FunnelNode): string[] {
  if (before.kind !== after.kind) return ['kind'];
  if (before.kind === 'block' && after.kind === 'block') {
    const fields: string[] = [];
    if (before.type !== after.type) fields.push('type');
    if (!deepEqual(before.style, after.style)) fields.push('style');
    const bp = before.props ?? {};
    const ap = after.props ?? {};
    const allKeys = new Set([...Object.keys(bp), ...Object.keys(ap)]);
    for (const k of allKeys) {
      if (!deepEqual(bp[k], ap[k])) fields.push(k);
    }
    return fields;
  }
  if (before.kind === 'layout' && after.kind === 'layout') {
    const fields: string[] = [];
    if (!deepEqual(before.style, after.style)) fields.push('style');
    // Column contents are tracked per descendant block via the flat
    // traversal — emitting a redundant 'columns' field here would surface the
    // same change twice (once on the layout, once on each child).
    return fields;
  }
  return ['kind'];
}

function pageMetaFields(before: FunnelPage, after: FunnelPage): string[] {
  const fields: string[] = [];
  if (before.name !== after.name) fields.push('name');
  if (before.nextPageId !== after.nextPageId) fields.push('nextPageId');
  if (!deepEqual(before.visibleIf, after.visibleIf)) fields.push('visibleIf');
  if ((before.hideLocationHint ?? false) !== (after.hideLocationHint ?? false)) {
    fields.push('hideLocationHint');
  }
  return fields;
}

function topLevelOrder(page: FunnelPage): string[] {
  return page.nodes.map((n) => n.id);
}

// ─── Block label rendering ──────────────────────────────────────────────────

function clip(s: string | undefined, len = 60): string {
  if (!s) return '';
  const t = String(s).trim();
  return t.length > len ? `${t.slice(0, len - 1)}…` : t;
}

export function summarizeBlockLabel(node: FunnelNode): string {
  if (node.kind === 'layout') {
    const cols = node.columns?.length ?? 0;
    return `Layout (${cols} ${cols === 1 ? 'Spalte' : 'Spalten'})`;
  }
  const p = node.props ?? {};
  const pick = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : undefined);
  switch (node.type) {
    case 'heading':            return `Überschrift: „${clip(pick('text'))}"`;
    case 'paragraph':          return `Text: „${clip(pick('text'))}"`;
    case 'button':             return `Button: „${clip(pick('label'))}"`;
    case 'image':              return `Bild${pick('alt') ? `: „${clip(pick('alt'))}"` : ''}`;
    case 'video':              return 'Video';
    case 'spacer':             return 'Abstand';
    case 'check_intro':        return `Intro: „${clip(pick('title'))}"`;
    case 'check_vorname':      return 'Vorname-Eingabe';
    case 'check_frage':        return `Frage: „${clip(pick('question'))}"`;
    case 'check_ergebnisfrage':return `Ergebnis-Frage: „${clip(pick('question'))}"`;
    case 'check_selbst':       return `Selbsteinschätzung: „${clip(pick('question') ?? pick('label'))}"`;
    case 'check_statements':   return `Aussagen-Block (${Array.isArray(p.statements) ? (p.statements as unknown[]).length : 0})`;
    case 'check_lead':         return 'Lead-Formular';
    case 'check_ergebnis':     return 'Ergebnis-Anzeige';
    case 'check_swipe_deck':   return `Swipe-Deck (${Array.isArray(p.cards) ? (p.cards as unknown[]).length : 0} Karten)`;
    case 'check_this_or_that': return `This-or-That: „${clip(pick('question'))}"`;
    case 'quest_scene':        return `Szene: „${clip(pick('title'))}"`;
    case 'quest_dialog':       return `Dialog: „${clip(pick('text'))}"`;
    case 'quest_decision':     return `Entscheidung: „${clip(pick('text'))}"`;
    case 'quest_quiz':         return `Quiz: „${clip(pick('question'))}"`;
    case 'quest_info':         return `Info: „${clip(pick('text'))}"`;
    case 'quest_freetext':     return `Freitext: „${clip(pick('label'))}"`;
    case 'quest_file':         return 'Datei-Upload';
    case 'quest_lead':         return 'Lead-Formular';
    case 'quest_spinner':      return 'Spinner';
    case 'quest_rating':       return `Rating: „${clip(pick('question'))}"`;
    case 'quest_hotspot':      return 'Hotspot';
    case 'quest_zuordnung':    return 'Zuordnung';
    case 'form_hero':          return `Hero: „${clip(pick('title'))}"`;
    case 'form_text':          return `Formular-Text: „${clip(pick('text'))}"`;
    case 'form_image':         return 'Formular-Bild';
    case 'form_step':          return `Formular-Schritt: „${clip(pick('label'))}"`;
    case 'form_config':        return 'Formular-Konfiguration';
    default:                   return node.type;
  }
}

// ─── Dimension references in a block ────────────────────────────────────────

/**
 * Returns all dimension IDs referenced by a block (via scores, sliderDimensionId,
 * statements[].dimensionId). Used to compute auto-lock dependencies between
 * block changes and dimension changes.
 */
export function extractDimensionRefs(node: FunnelNode): string[] {
  if (node.kind !== 'block') return [];
  const out = new Set<string>();
  const p = node.props ?? {};
  const addScores = (s: unknown) => {
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      for (const k of Object.keys(s as Record<string, unknown>)) {
        if (k) out.add(k);
      }
    }
  };
  const addStr = (v: unknown) => { if (typeof v === 'string' && v) out.add(v); };

  switch (node.type) {
    case 'check_frage':
    case 'check_ergebnisfrage': {
      addStr(p.sliderDimensionId);
      const opts = Array.isArray(p.options) ? (p.options as Array<Record<string, unknown>>) : [];
      opts.forEach((o) => addScores(o.scores));
      break;
    }
    case 'check_selbst':
      addStr(p.sliderDimensionId);
      break;
    case 'check_statements': {
      const stmts = Array.isArray(p.statements) ? (p.statements as Array<Record<string, unknown>>) : [];
      stmts.forEach((s) => addStr(s.dimensionId));
      break;
    }
    case 'check_swipe_deck': {
      const cards = Array.isArray(p.cards) ? (p.cards as Array<Record<string, unknown>>) : [];
      cards.forEach((c) => {
        addScores((c.optionPositive as Record<string, unknown> | undefined)?.scores);
        addScores((c.optionNeutral as Record<string, unknown> | undefined)?.scores);
        addScores((c.optionNegative as Record<string, unknown> | undefined)?.scores);
      });
      break;
    }
    case 'check_this_or_that': {
      addScores((p.optionA as Record<string, unknown> | undefined)?.scores);
      addScores((p.optionB as Record<string, unknown> | undefined)?.scores);
      break;
    }
    default: break;
  }
  return Array.from(out);
}

/** Returns the source block ID a page's `visibleIf` depends on, or null. */
function visibleIfSource(page: FunnelPage): string | null {
  const v = page.visibleIf;
  return v && typeof v.sourceBlockId === 'string' && v.sourceBlockId ? v.sourceBlockId : null;
}

// ─── Diff ───────────────────────────────────────────────────────────────────

export function diffFunnelDoc(
  prev: { pages: FunnelPage[]; dimensions: Dimension[] },
  next: { pages: FunnelPage[]; dimensions: Dimension[] },
): FunnelDiff {
  const prevPages = new Map(prev.pages.map((p) => [p.id, p]));
  const nextPages = new Map(next.pages.map((p) => [p.id, p]));

  const pageChanges: PageChange[] = [];
  let unchangedPageCount = 0;
  let unchangedBlockCount = 0;

  // Removed pages
  prev.pages.forEach((p) => {
    if (!nextPages.has(p.id)) {
      pageChanges.push({ id: `page:${p.id}`, kind: 'removed', page: p });
    }
  });

  // Added pages
  next.pages.forEach((p, idx) => {
    if (!prevPages.has(p.id)) {
      pageChanges.push({ id: `page:${p.id}`, kind: 'added', page: p, index: idx });
    }
  });

  // Modified pages
  next.pages.forEach((nextPage) => {
    const prevPage = prevPages.get(nextPage.id);
    if (!prevPage) return; // already covered as 'added'

    const prevFlat = flattenPageNodes(prevPage);
    const nextFlat = flattenPageNodes(nextPage);
    const prevById = new Map(prevFlat.map((e) => [e.node.id, e]));
    const nextById = new Map(nextFlat.map((e) => [e.node.id, e]));

    const blockChanges: BlockChange[] = [];

    // Removed blocks
    prevFlat.forEach((e) => {
      if (!nextById.has(e.node.id)) {
        blockChanges.push({
          id: `block:${e.node.id}`,
          kind: 'removed',
          pageId: nextPage.id,
          node: e.node,
          parentPath: e.parentPath,
        });
      }
    });

    // Added + modified blocks
    nextFlat.forEach((e) => {
      const prevEntry = prevById.get(e.node.id);
      if (!prevEntry) {
        blockChanges.push({
          id: `block:${e.node.id}`,
          kind: 'added',
          pageId: nextPage.id,
          node: e.node,
          parentPath: e.parentPath,
          index: e.index,
        });
      } else {
        const fields = nodePropFields(prevEntry.node, e.node);
        if (fields.length > 0) {
          blockChanges.push({
            id: `block:${e.node.id}`,
            kind: 'modified',
            pageId: nextPage.id,
            before: prevEntry.node,
            after: e.node,
            fields,
            parentPath: e.parentPath,
          });
        } else {
          unchangedBlockCount += 1;
        }
      }
    });

    const metaFields = pageMetaFields(prevPage, nextPage);
    const orderChanged = !deepEqual(topLevelOrder(prevPage), topLevelOrder(nextPage));

    if (blockChanges.length === 0 && metaFields.length === 0 && !orderChanged) {
      unchangedPageCount += 1;
      return;
    }

    const hasMeta = metaFields.length > 0 || orderChanged;
    pageChanges.push({
      id: `page:${nextPage.id}`,
      kind: 'modified',
      pageId: nextPage.id,
      before: prevPage,
      after: nextPage,
      metaFields,
      orderChanged,
      blocks: blockChanges,
      metaChangeId: hasMeta ? `pagemeta:${nextPage.id}` : null,
    });
  });

  // Dimensions
  const prevDims = new Map(prev.dimensions.map((d) => [d.id, d]));
  const nextDims = new Map(next.dimensions.map((d) => [d.id, d]));
  const dimensionChanges: DimensionChange[] = [];

  prev.dimensions.forEach((d) => {
    if (!nextDims.has(d.id)) {
      dimensionChanges.push({ id: `dim:${d.id}`, kind: 'removed', dimension: d });
    }
  });
  next.dimensions.forEach((d) => {
    const prior = prevDims.get(d.id);
    if (!prior) {
      dimensionChanges.push({ id: `dim:${d.id}`, kind: 'added', dimension: d });
      return;
    }
    const fields: string[] = [];
    if (prior.name !== d.name) fields.push('name');
    if ((prior.description ?? '') !== (d.description ?? '')) fields.push('description');
    if ((prior.color ?? '') !== (d.color ?? '')) fields.push('color');
    if (fields.length > 0) {
      dimensionChanges.push({ id: `dim:${d.id}`, kind: 'modified', before: prior, after: d, fields });
    }
  });

  return {
    pages: pageChanges,
    dimensions: dimensionChanges,
    unchangedPageCount,
    unchangedBlockCount,
  };
}

// ─── Selectable change index ────────────────────────────────────────────────

/**
 * Returns every ChangeId the user can toggle in the UI. Block-level changes
 * inside `removed`/`added` pages are *not* included (they are implied by the
 * page-level toggle).
 */
export function selectableChangeIds(diff: FunnelDiff): ChangeId[] {
  const ids: ChangeId[] = [];
  for (const pc of diff.pages) {
    if (pc.kind === 'modified') {
      if (pc.metaChangeId) ids.push(pc.metaChangeId);
      for (const bc of pc.blocks) ids.push(bc.id);
    } else {
      ids.push(pc.id);
    }
  }
  for (const dc of diff.dimensions) ids.push(dc.id);
  return ids;
}

// ─── Dependencies (auto-lock) ───────────────────────────────────────────────

interface IndexedDiff {
  blocksByChangeId: Map<ChangeId, BlockChange>;
  pagesByChangeId: Map<ChangeId, PageChange>;
  dimsByChangeId: Map<ChangeId, DimensionChange>;
  newDimChangeIdByDimId: Map<string, ChangeId>;
  removedDimChangeIdByDimId: Map<string, ChangeId>;
  modifiedDimChangeIdByDimId: Map<string, ChangeId>;
  pageChangeIdByPageId: Map<string, ChangeId>;
}

function indexDiff(diff: FunnelDiff): IndexedDiff {
  const idx: IndexedDiff = {
    blocksByChangeId: new Map(),
    pagesByChangeId: new Map(),
    dimsByChangeId: new Map(),
    newDimChangeIdByDimId: new Map(),
    removedDimChangeIdByDimId: new Map(),
    modifiedDimChangeIdByDimId: new Map(),
    pageChangeIdByPageId: new Map(),
  };
  for (const pc of diff.pages) {
    idx.pagesByChangeId.set(pc.id, pc);
    if (pc.kind === 'added') idx.pageChangeIdByPageId.set(pc.page.id, pc.id);
    if (pc.kind === 'removed') idx.pageChangeIdByPageId.set(pc.page.id, pc.id);
    if (pc.kind === 'modified') {
      for (const bc of pc.blocks) idx.blocksByChangeId.set(bc.id, bc);
    }
  }
  for (const dc of diff.dimensions) {
    idx.dimsByChangeId.set(dc.id, dc);
    if (dc.kind === 'added') idx.newDimChangeIdByDimId.set(dc.dimension.id, dc.id);
    if (dc.kind === 'removed') idx.removedDimChangeIdByDimId.set(dc.dimension.id, dc.id);
    if (dc.kind === 'modified') idx.modifiedDimChangeIdByDimId.set(dc.before.id, dc.id);
  }
  return idx;
}

/**
 * Direct dependencies: when this change is selected, these change IDs must
 * also be selected for the merged document to stay consistent.
 */
function directDependencies(idx: IndexedDiff, changeId: ChangeId): ChangeId[] {
  const out = new Set<ChangeId>();

  const block = idx.blocksByChangeId.get(changeId);
  if (block && (block.kind === 'added' || block.kind === 'modified')) {
    const node = block.kind === 'added' ? block.node : block.after;
    const refs = extractDimensionRefs(node);
    for (const dimId of refs) {
      // If the referenced dimension is *new* in `next`, we must include its
      // `dim:added` change. Otherwise the dimension already exists in `prev`.
      const dimAddedId = idx.newDimChangeIdByDimId.get(dimId);
      if (dimAddedId) out.add(dimAddedId);
    }
  }

  return Array.from(out);
}

/**
 * Reverse dependencies: when this change is *deselected*, these change IDs
 * must also be deselected (they depend on the deselected one).
 */
function reverseDependencies(idx: IndexedDiff, changeId: ChangeId): ChangeId[] {
  const out = new Set<ChangeId>();
  // Iterate all selectable IDs, ask: does it directly depend on `changeId`?
  for (const otherId of idx.blocksByChangeId.keys()) {
    if (otherId === changeId) continue;
    if (directDependencies(idx, otherId).includes(changeId)) {
      out.add(otherId);
    }
  }
  return Array.from(out);
}

/**
 * Transitive closure of {@link directDependencies}. Used by the UI so that
 * checking one box pulls in everything required.
 */
export function dependencies(diff: FunnelDiff, changeId: ChangeId): ChangeId[] {
  const idx = indexDiff(diff);
  const seen = new Set<ChangeId>();
  const stack = [changeId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const dep of directDependencies(idx, cur)) {
      if (!seen.has(dep)) {
        seen.add(dep);
        stack.push(dep);
      }
    }
  }
  seen.delete(changeId);
  return Array.from(seen);
}

/**
 * Transitive closure of {@link reverseDependencies}. Used by the UI so that
 * unchecking one box drops dependents that would otherwise become orphans.
 */
export function dependents(diff: FunnelDiff, changeId: ChangeId): ChangeId[] {
  const idx = indexDiff(diff);
  const seen = new Set<ChangeId>();
  const stack = [changeId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const dep of reverseDependencies(idx, cur)) {
      if (!seen.has(dep)) {
        seen.add(dep);
        stack.push(dep);
      }
    }
  }
  seen.delete(changeId);
  return Array.from(seen);
}

// ─── Apply selection ────────────────────────────────────────────────────────

function cloneNode<T>(v: T): T {
  if (typeof structuredClone === 'function') return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

interface ApplyResult {
  pages: FunnelPage[];
  dimensions: Dimension[];
  warnings: string[];
}

/**
 * Walks the page node tree and yields each block + a setter to overwrite or
 * remove it. Used by the consistency pass at the end of {@link applyDiffSelection}.
 */
function eachBlock(
  page: FunnelPage,
  visit: (node: BlockNode, parent: { nodes: FunnelNode[]; index: number }) => void,
): void {
  page.nodes.forEach((n, i) => {
    if (n.kind === 'block') visit(n, { nodes: page.nodes, index: i });
    if (n.kind === 'layout') {
      n.columns.forEach((col) => {
        col.nodes.forEach((cn, ci) => {
          if (cn.kind === 'block') visit(cn, { nodes: col.nodes, index: ci });
        });
      });
    }
  });
}

function findContainer(page: FunnelPage, path: BlockPath): FunnelNode[] | null {
  if (path.kind === 'page') return page.nodes;
  const layout = page.nodes.find((n): n is LayoutNode => n.kind === 'layout' && n.id === path.layoutId);
  if (!layout) return null;
  const col = layout.columns.find((c) => c.id === path.columnId);
  return col ? col.nodes : null;
}

export function applyDiffSelection(
  prev: { pages: FunnelPage[]; dimensions: Dimension[] },
  next: { pages: FunnelPage[]; dimensions: Dimension[] },
  diff: FunnelDiff,
  selection: Selection,
): ApplyResult {
  const warnings: string[] = [];
  const result: ApplyResult = {
    pages: prev.pages.map((p) => cloneNode(p)),
    dimensions: prev.dimensions.map((d) => cloneNode(d)),
    warnings,
  };

  // 1. Dimensions first (so block scores can validly reference them).
  for (const dc of diff.dimensions) {
    if (!selection.has(dc.id)) continue;
    if (dc.kind === 'added') {
      result.dimensions.push(cloneNode(dc.dimension));
    } else if (dc.kind === 'removed') {
      result.dimensions = result.dimensions.filter((d) => d.id !== dc.dimension.id);
    } else {
      const idxD = result.dimensions.findIndex((d) => d.id === dc.before.id);
      if (idxD !== -1) result.dimensions[idxD] = cloneNode(dc.after);
    }
  }

  // 2. Page-level removals / additions.
  const pagesById = new Map(result.pages.map((p) => [p.id, p]));
  const removedPageIds = new Set<string>();
  for (const pc of diff.pages) {
    if (!selection.has(pc.id)) continue;
    if (pc.kind === 'removed') {
      removedPageIds.add(pc.page.id);
    }
  }
  if (removedPageIds.size > 0) {
    result.pages = result.pages.filter((p) => !removedPageIds.has(p.id));
    for (const id of removedPageIds) pagesById.delete(id);
  }

  for (const pc of diff.pages) {
    if (pc.kind !== 'added' || !selection.has(pc.id)) continue;
    const cloned = cloneNode(pc.page);
    const targetIndex = Math.min(pc.index, result.pages.length);
    result.pages.splice(targetIndex, 0, cloned);
    pagesById.set(cloned.id, cloned);
  }

  // 3. Page modifications (meta + blocks).
  for (const pc of diff.pages) {
    if (pc.kind !== 'modified') continue;
    const target = pagesById.get(pc.pageId);
    if (!target) continue; // page got removed in this same selection — skip

    // 3a. Meta + ordering.
    if (pc.metaChangeId && selection.has(pc.metaChangeId)) {
      if (pc.metaFields.includes('name')) target.name = pc.after.name;
      if (pc.metaFields.includes('nextPageId')) target.nextPageId = pc.after.nextPageId;
      if (pc.metaFields.includes('visibleIf')) {
        if (pc.after.visibleIf) target.visibleIf = cloneNode(pc.after.visibleIf);
        else delete target.visibleIf;
      }
      if (pc.metaFields.includes('hideLocationHint')) target.hideLocationHint = pc.after.hideLocationHint;
    }

    // 3b. Block changes: removed first, then added/modified.
    for (const bc of pc.blocks) {
      if (!selection.has(bc.id)) continue;
      if (bc.kind === 'removed') {
        const container = findContainer(target, bc.parentPath);
        if (!container) continue;
        const i = container.findIndex((n) => n.id === bc.node.id);
        if (i !== -1) container.splice(i, 1);
      }
    }

    for (const bc of pc.blocks) {
      if (!selection.has(bc.id)) continue;
      if (bc.kind === 'added') {
        const container = findContainer(target, bc.parentPath);
        if (!container) {
          // Layout container doesn't exist — fall back to page nodes so the
          // block is still preserved (warn so the user knows).
          warnings.push(`Layout-Container für neuen Block fehlt — Block wurde am Seitenende eingefügt.`);
          target.nodes.push(cloneNode(bc.node));
          continue;
        }
        const insertAt = Math.min(bc.index, container.length);
        container.splice(insertAt, 0, cloneNode(bc.node));
      } else if (bc.kind === 'modified') {
        const container = findContainer(target, bc.parentPath);
        if (!container) continue;
        const i = container.findIndex((n) => n.id === bc.before.id);
        if (i !== -1) container[i] = cloneNode(bc.after);
      }
    }

    // 3c. Reorder top-level nodes if requested. We map next.nodes (top level
    // only) to the IDs currently present in target — preserving any blocks
    // the user kept from prev that aren't in next.
    if (pc.metaChangeId && selection.has(pc.metaChangeId) && pc.orderChanged) {
      const nextOrder = pc.after.nodes.map((n) => n.id);
      const present = new Map(target.nodes.map((n) => [n.id, n]));
      const reordered: FunnelNode[] = [];
      const seen = new Set<string>();
      for (const id of nextOrder) {
        const node = present.get(id);
        if (node) { reordered.push(node); seen.add(id); }
      }
      // Append any blocks that exist in target but not in next (kept by user).
      for (const node of target.nodes) {
        if (!seen.has(node.id)) reordered.push(node);
      }
      target.nodes = reordered;
    }
  }

  // 4. Consistency pass: strip score entries / visibleIf that reference
  //    things the user did not bring along.
  const dimIds = new Set(result.dimensions.map((d) => d.id));
  const blockIds = new Set<string>();
  for (const p of result.pages) {
    for (const n of p.nodes) {
      blockIds.add(n.id);
      if (n.kind === 'layout') {
        for (const col of n.columns) for (const cn of col.nodes) blockIds.add(cn.id);
      }
    }
  }

  for (const p of result.pages) {
    // visibleIf consistency
    const src = visibleIfSource(p);
    if (src && !blockIds.has(src)) {
      warnings.push(`Sichtbarkeits-Bedingung auf Seite „${p.name}" entfernt, weil der referenzierte Block nicht übernommen wurde.`);
      delete p.visibleIf;
    }

    // score consistency in blocks
    eachBlock(p, (block) => {
      const refs = extractDimensionRefs(block);
      const orphans = refs.filter((r) => !dimIds.has(r));
      if (orphans.length === 0) return;
      stripDimensionRefs(block, new Set(orphans));
      warnings.push(
        `Score-Verweise auf nicht übernommene Dimensionen wurden im Block „${summarizeBlockLabel(block)}" entfernt.`,
      );
    });
  }

  // de-duplicate warnings
  result.warnings = Array.from(new Set(warnings));
  return result;
}

function stripScoresMap(m: unknown, orphans: Set<string>): void {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return;
  const obj = m as Record<string, number>;
  for (const k of Object.keys(obj)) {
    if (orphans.has(k)) delete obj[k];
  }
}

function stripDimensionRefs(node: BlockNode, orphans: Set<string>): void {
  const p = node.props as Record<string, unknown>;
  if (!p) return;

  switch (node.type) {
    case 'check_frage':
    case 'check_ergebnisfrage': {
      if (typeof p.sliderDimensionId === 'string' && orphans.has(p.sliderDimensionId)) {
        p.sliderDimensionId = '';
      }
      if (Array.isArray(p.options)) {
        (p.options as Array<Record<string, unknown>>).forEach((o) => stripScoresMap(o.scores, orphans));
      }
      break;
    }
    case 'check_selbst':
      if (typeof p.sliderDimensionId === 'string' && orphans.has(p.sliderDimensionId)) {
        p.sliderDimensionId = '';
      }
      break;
    case 'check_statements':
      if (Array.isArray(p.statements)) {
        (p.statements as Array<Record<string, unknown>>).forEach((s) => {
          if (typeof s.dimensionId === 'string' && orphans.has(s.dimensionId)) s.dimensionId = '';
        });
      }
      break;
    case 'check_swipe_deck':
      if (Array.isArray(p.cards)) {
        (p.cards as Array<Record<string, unknown>>).forEach((c) => {
          stripScoresMap((c.optionPositive as Record<string, unknown> | undefined)?.scores, orphans);
          stripScoresMap((c.optionNeutral as Record<string, unknown> | undefined)?.scores, orphans);
          stripScoresMap((c.optionNegative as Record<string, unknown> | undefined)?.scores, orphans);
        });
      }
      break;
    case 'check_this_or_that':
      stripScoresMap((p.optionA as Record<string, unknown> | undefined)?.scores, orphans);
      stripScoresMap((p.optionB as Record<string, unknown> | undefined)?.scores, orphans);
      break;
    default: break;
  }
}

// re-exported for tests / callers
export { deepEqual as _deepEqualForTests };

// type check at compile time that VisibilityCondition stays compatible
const _vcTypeCheck: VisibilityCondition | undefined = undefined;
void _vcTypeCheck;
