import { FunnelDoc, FunnelNode, FunnelPage, FunnelStyle, InsertTarget, Column, BlockNode, LayoutNode } from './funnel-types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return crypto.randomUUID(); }

function insertAfter<T extends { id: string }>(list: T[], item: T, afterId: string | null): T[] {
  if (afterId === null) return [item, ...list];
  const i = list.findIndex((x) => x.id === afterId);
  if (i === -1) return [...list, item];
  return [...list.slice(0, i + 1), item, ...list.slice(i + 1)];
}

function mapNodesDeep(nodes: FunnelNode[], fn: (n: FunnelNode) => FunnelNode): FunnelNode[] {
  return nodes.map((n) => {
    const mapped = fn(n);
    if (mapped.kind === 'layout') {
      return { ...mapped, columns: mapped.columns.map((col) => ({ ...col, nodes: mapNodesDeep(col.nodes, fn) })) };
    }
    return mapped;
  });
}

function filterNodesDeep(nodes: FunnelNode[], predicate: (n: FunnelNode) => boolean): FunnelNode[] {
  return nodes
    .filter(predicate)
    .map((n) => {
      if (n.kind === 'layout') {
        return { ...n, columns: n.columns.map((col) => ({ ...col, nodes: filterNodesDeep(col.nodes, predicate) })) };
      }
      return n;
    });
}

function withPage(doc: FunnelDoc, pageId: string, fn: (p: FunnelPage) => FunnelPage): FunnelDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

// ─── Node locate ─────────────────────────────────────────────────────────────
export interface NodeLocation {
  node: FunnelNode;
  container: 'root' | string; // 'root' or columnId
}

export function findNodeLocation(page: FunnelPage, nodeId: string): NodeLocation | null {
  for (const n of page.nodes) {
    if (n.id === nodeId) return { node: n, container: 'root' };
    if (n.kind === 'layout') {
      for (const col of n.columns) {
        for (const cn of col.nodes) {
          if (cn.id === nodeId) return { node: cn, container: col.id };
        }
      }
    }
  }
  return null;
}

// ─── Insert ───────────────────────────────────────────────────────────────────
export function insertNode(doc: FunnelDoc, pageId: string, node: FunnelNode, target: InsertTarget): FunnelDoc {
  return withPage(doc, pageId, (page) => {
    if (target.location === 'root') {
      return { ...page, nodes: insertAfter(page.nodes, node, target.afterId) };
    }
    // column insert
    return {
      ...page,
      nodes: page.nodes.map((n) => {
        if (n.kind !== 'layout') return n;
        return {
          ...n,
          columns: n.columns.map((col) =>
            col.id === target.columnId
              ? { ...col, nodes: insertAfter(col.nodes, node, target.afterId) }
              : col
          ),
        };
      }),
    };
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export function deleteNode(doc: FunnelDoc, pageId: string, nodeId: string): FunnelDoc {
  return withPage(doc, pageId, (page) => ({
    ...page,
    nodes: filterNodesDeep(page.nodes, (n) => n.id !== nodeId),
  }));
}

// ─── Update ───────────────────────────────────────────────────────────────────
export function updateNode(
  doc: FunnelDoc,
  pageId: string,
  nodeId: string,
  patch: { props?: Record<string, unknown>; style?: Partial<FunnelStyle> }
): FunnelDoc {
  return withPage(doc, pageId, (page) => ({
    ...page,
    nodes: mapNodesDeep(page.nodes, (n) => {
      if (n.id !== nodeId) return n;
      if (n.kind === 'block') {
        return {
          ...n,
          props: patch.props ? { ...n.props, ...patch.props } : n.props,
          style: patch.style ? { ...n.style, ...patch.style } : n.style,
        };
      }
      return { ...n, style: patch.style ? { ...n.style, ...patch.style } : n.style };
    }),
  }));
}

// ─── Clone (deep, new ids) ────────────────────────────────────────────────────
export function cloneNode(node: FunnelNode): FunnelNode {
  if (node.kind === 'block') return { ...node, id: uid() };
  return {
    ...node,
    id: uid(),
    columns: node.columns.map((col) => ({
      ...col,
      id: uid(),
      nodes: col.nodes.map(cloneNode),
    })),
  };
}

// ─── Duplicate ────────────────────────────────────────────────────────────────
export function duplicateNode(doc: FunnelDoc, pageId: string, nodeId: string): FunnelDoc {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return doc;
  const loc = findNodeLocation(page, nodeId);
  if (!loc) return doc;
  const clone = cloneNode(loc.node);
  return insertNode(doc, pageId, clone,
    loc.container === 'root'
      ? { location: 'root', afterId: nodeId }
      : { location: 'column', columnId: loc.container, afterId: nodeId }
  );
}

// ─── Reorder (within same container) ─────────────────────────────────────────
function reorder<T>(list: T[], from: number, to: number): T[] {
  const result = [...list];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function reorderRootNodes(doc: FunnelDoc, pageId: string, fromIdx: number, toIdx: number): FunnelDoc {
  return withPage(doc, pageId, (page) => ({ ...page, nodes: reorder(page.nodes, fromIdx, toIdx) }));
}

export function reorderColumnNodes(doc: FunnelDoc, pageId: string, columnId: string, fromIdx: number, toIdx: number): FunnelDoc {
  return withPage(doc, pageId, (page) => ({
    ...page,
    nodes: page.nodes.map((n) => {
      if (n.kind !== 'layout') return n;
      return {
        ...n,
        columns: n.columns.map((col) =>
          col.id === columnId ? { ...col, nodes: reorder(col.nodes, fromIdx, toIdx) } : col
        ),
      };
    }),
  }));
}

// ─── Move between containers ──────────────────────────────────────────────────
export function moveNodeBetweenContainers(
  doc: FunnelDoc,
  pageId: string,
  nodeId: string,
  targetContainer: 'root' | string, // 'root' or columnId
  afterId: string | null
): FunnelDoc {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return doc;
  const loc = findNodeLocation(page, nodeId);
  if (!loc) return doc;

  // Remove from source
  const docWithout = deleteNode(doc, pageId, nodeId);

  // Insert into target
  const target: InsertTarget =
    targetContainer === 'root'
      ? { location: 'root', afterId }
      : { location: 'column', columnId: targetContainer, afterId };

  return insertNode(docWithout, pageId, loc.node, target);
}

// ─── Create layout node ───────────────────────────────────────────────────────
export function createLayoutNode(numColumns: 2 | 3): LayoutNode {
  const columns: Column[] = Array.from({ length: numColumns }, () => ({ id: uid(), nodes: [] }));
  return { id: uid(), kind: 'layout', columns };
}

export function createBlockNode(type: import('./funnel-types').FunnelBlockType, props: Record<string, unknown>): BlockNode {
  return { id: uid(), kind: 'block', type, props };
}

// ─── Page operations ──────────────────────────────────────────────────────────
export function addPage(doc: FunnelDoc, name?: string): { doc: FunnelDoc; newPageId: string } {
  const id = uid();
  const page: FunnelPage = { id, name: name || `Seite ${doc.pages.length + 1}`, nodes: [] };
  return { doc: { ...doc, pages: [...doc.pages, page] }, newPageId: id };
}

export function deletePage(doc: FunnelDoc, pageId: string): FunnelDoc {
  if (doc.pages.length <= 1) return doc;
  return { ...doc, pages: doc.pages.filter((p) => p.id !== pageId) };
}

export function renamePage(doc: FunnelDoc, pageId: string, name: string): FunnelDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? { ...p, name } : p)) };
}

export function updatePage(doc: FunnelDoc, pageId: string, patch: Partial<FunnelPage>): FunnelDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)) };
}

export function reorderPages(doc: FunnelDoc, fromIdx: number, toIdx: number): FunnelDoc {
  return { ...doc, pages: reorder(doc.pages, fromIdx, toIdx) };
}

export function duplicatePage(doc: FunnelDoc, pageId: string): { doc: FunnelDoc; newPageId: string } {
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) return { doc, newPageId: pageId };
  const newId = uid();
  const newPage: FunnelPage = { ...page, id: newId, name: `${page.name} (Kopie)`, nodes: page.nodes.map(cloneNode), nextPageId: undefined };
  const idx = doc.pages.findIndex((p) => p.id === pageId);
  const pages = [...doc.pages.slice(0, idx + 1), newPage, ...doc.pages.slice(idx + 1)];
  return { doc: { ...doc, pages }, newPageId: newId };
}

// ─── Create empty FunnelDoc ───────────────────────────────────────────────────
export function createFunnelDoc(contentId: string, contentType: import('./funnel-types').FunnelContentType): FunnelDoc {
  const pageId = uid();
  return {
    id: uid(),
    contentId,
    contentType,
    pages: [{ id: pageId, name: 'Seite 1', nodes: [] }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
