import {
  insertNode, deleteNode, updateNode, duplicateNode,
  findNodeLocation,
  reorderRootNodes, moveNodeBetweenContainers,
  addPage, deletePage, renamePage, duplicatePage, reorderPages,
} from '../funnel-ops';
import type { FunnelDoc, BlockNode, FunnelPage } from '../funnel-types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeBlock(id: string, type = 'text'): BlockNode {
  return { kind: 'block', id, type: type as BlockNode['type'], props: { text: 'hello' } };
}

function makeDoc(pageNodes: BlockNode[] = []): FunnelDoc {
  return {
    id: 'doc1',
    contentId: 'c1',
    contentType: 'quest',
    pages: [{ id: 'p1', name: 'Page 1', nodes: pageNodes }],
    createdAt: '',
    updatedAt: '',
  };
}

function firstPage(doc: FunnelDoc): FunnelPage {
  return doc.pages[0];
}

// ─── insertNode ───────────────────────────────────────────────────────────────

describe('insertNode', () => {
  test('inserts at root when afterId is null (prepend)', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1]);
    const result = insertNode(doc, 'p1', b2, { location: 'root', afterId: null });
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b2', 'b1']);
  });

  test('inserts after a specific node', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const b3 = makeBlock('b3');
    const doc = makeDoc([b1, b2]);
    const result = insertNode(doc, 'p1', b3, { location: 'root', afterId: 'b1' });
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b1', 'b3', 'b2']);
  });

  test('appends to end when afterId does not exist', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1]);
    const result = insertNode(doc, 'p1', b2, { location: 'root', afterId: 'nonexistent' });
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b1', 'b2']);
  });

  test('does not mutate the original doc', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1]);
    insertNode(doc, 'p1', b2, { location: 'root', afterId: null });
    expect(firstPage(doc).nodes).toHaveLength(1);
  });
});

// ─── deleteNode ───────────────────────────────────────────────────────────────

describe('deleteNode', () => {
  test('removes a node by id', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1, b2]);
    const result = deleteNode(doc, 'p1', 'b1');
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b2']);
  });

  test('returns doc unchanged when node not found', () => {
    const b1 = makeBlock('b1');
    const doc = makeDoc([b1]);
    const result = deleteNode(doc, 'p1', 'nonexistent');
    expect(firstPage(result).nodes).toHaveLength(1);
  });

  test('does not mutate the original doc', () => {
    const b1 = makeBlock('b1');
    const doc = makeDoc([b1]);
    deleteNode(doc, 'p1', 'b1');
    expect(firstPage(doc).nodes).toHaveLength(1);
  });
});

// ─── updateNode ───────────────────────────────────────────────────────────────

describe('updateNode', () => {
  test('merges props patch', () => {
    const b1 = makeBlock('b1');
    const doc = makeDoc([b1]);
    const result = updateNode(doc, 'p1', 'b1', { props: { text: 'updated', extra: 42 } });
    const node = firstPage(result).nodes[0] as BlockNode;
    expect(node.props.text).toBe('updated');
    expect(node.props.extra).toBe(42);
  });

  test('does not affect other nodes', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1, b2]);
    const result = updateNode(doc, 'p1', 'b1', { props: { text: 'changed' } });
    const b2After = firstPage(result).nodes.find((n) => n.id === 'b2') as BlockNode;
    expect(b2After.props.text).toBe('hello');
  });

  test('does not mutate the original node', () => {
    const b1 = makeBlock('b1');
    const doc = makeDoc([b1]);
    updateNode(doc, 'p1', 'b1', { props: { text: 'changed' } });
    expect((firstPage(doc).nodes[0] as BlockNode).props.text).toBe('hello');
  });
});

// ─── duplicateNode ────────────────────────────────────────────────────────────

describe('duplicateNode', () => {
  test('inserts a copy with a different id after the original', () => {
    const b1 = makeBlock('b1');
    const b2 = makeBlock('b2');
    const doc = makeDoc([b1, b2]);
    const result = duplicateNode(doc, 'p1', 'b1');
    const ids = firstPage(result).nodes.map((n) => n.id);
    expect(ids[0]).toBe('b1');
    expect(ids[1]).not.toBe('b1'); // new id
    expect(ids[2]).toBe('b2');
  });

  test('duplicate has the same type and props', () => {
    const b1 = makeBlock('b1', 'heading');
    const doc = makeDoc([b1]);
    const result = duplicateNode(doc, 'p1', 'b1');
    const clone = firstPage(result).nodes[1] as BlockNode;
    expect(clone.type).toBe('heading');
    expect(clone.props).toEqual(b1.props);
  });

  test('returns doc unchanged for unknown node id', () => {
    const b1 = makeBlock('b1');
    const doc = makeDoc([b1]);
    const result = duplicateNode(doc, 'p1', 'unknown');
    expect(firstPage(result).nodes).toHaveLength(1);
  });
});

// ─── findNodeLocation ─────────────────────────────────────────────────────────

describe('findNodeLocation', () => {
  test('finds a root-level node', () => {
    const b1 = makeBlock('b1');
    const page = makeDoc([b1]).pages[0];
    const loc = findNodeLocation(page, 'b1');
    expect(loc).not.toBeNull();
    expect(loc?.container).toBe('root');
    expect(loc?.node.id).toBe('b1');
  });

  test('returns null for unknown id', () => {
    const page = makeDoc([makeBlock('b1')]).pages[0];
    expect(findNodeLocation(page, 'missing')).toBeNull();
  });
});

// ─── page operations ─────────────────────────────────────────────────────────

describe('addPage', () => {
  test('appends a new page', () => {
    const doc = makeDoc();
    const { doc: result } = addPage(doc);
    expect(result.pages).toHaveLength(2);
  });

  test('new page starts with no nodes', () => {
    const doc = makeDoc();
    const { doc: result } = addPage(doc);
    expect(result.pages[1].nodes).toEqual([]);
  });

  test('returns the id of the new page', () => {
    const doc = makeDoc();
    const { doc: result, newPageId } = addPage(doc);
    expect(result.pages[1].id).toBe(newPageId);
  });
});

describe('deletePage', () => {
  test('removes the page with the given id', () => {
    const doc = makeDoc();
    const { doc: withTwo, newPageId } = addPage(doc);
    const result = deletePage(withTwo, newPageId);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].id).toBe('p1');
  });

  test('does not mutate original', () => {
    const doc = makeDoc();
    const { doc: withTwo, newPageId } = addPage(doc);
    deletePage(withTwo, newPageId);
    expect(withTwo.pages).toHaveLength(2);
  });
});

describe('renamePage', () => {
  test('renames a page', () => {
    const doc = makeDoc();
    const result = renamePage(doc, 'p1', 'Neue Seite');
    expect(result.pages[0].name).toBe('Neue Seite');
  });

  test('does not mutate original', () => {
    const doc = makeDoc();
    renamePage(doc, 'p1', 'Changed');
    expect(doc.pages[0].name).toBe('Page 1');
  });
});

// ─── reorderRootNodes ─────────────────────────────────────────────────────────

describe('reorderRootNodes', () => {
  test('moves a node from index 0 to index 2', () => {
    const doc = makeDoc([makeBlock('a'), makeBlock('b'), makeBlock('c')]);
    const result = reorderRootNodes(doc, 'p1', 0, 2);
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  test('moves a node from index 2 to index 0', () => {
    const doc = makeDoc([makeBlock('a'), makeBlock('b'), makeBlock('c')]);
    const result = reorderRootNodes(doc, 'p1', 2, 0);
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['c', 'a', 'b']);
  });

  test('does not mutate original', () => {
    const doc = makeDoc([makeBlock('a'), makeBlock('b')]);
    reorderRootNodes(doc, 'p1', 0, 1);
    expect(firstPage(doc).nodes[0].id).toBe('a');
  });
});

// ─── moveNodeBetweenContainers ────────────────────────────────────────────────

describe('moveNodeBetweenContainers', () => {
  test('moves a node from root into a column', () => {
    const b1 = makeBlock('b1');
    const layout: import('../funnel-types').LayoutNode = {
      id: 'l1',
      kind: 'layout',
      columns: [
        { id: 'col1', nodes: [] },
      ],
    };
    const doc = makeDoc([b1, layout] as import('../funnel-types').BlockNode[]);
    const result = moveNodeBetweenContainers(doc, 'p1', 'b1', 'col1', null);
    // b1 should be inside col1, not at root
    const rootIds = firstPage(result).nodes.map((n) => n.id);
    expect(rootIds).not.toContain('b1');
    const col1 = (firstPage(result).nodes.find((n) => n.id === 'l1') as import('../funnel-types').LayoutNode).columns[0];
    expect(col1.nodes.map((n) => n.id)).toContain('b1');
  });

  test('returns doc unchanged for unknown nodeId', () => {
    const doc = makeDoc([makeBlock('b1')]);
    const result = moveNodeBetweenContainers(doc, 'p1', 'unknown', 'root', null);
    expect(firstPage(result).nodes.map((n) => n.id)).toEqual(['b1']);
  });
});

// ─── deletePage guard ─────────────────────────────────────────────────────────

describe('deletePage (single page guard)', () => {
  test('does not delete the last page', () => {
    const doc = makeDoc();
    const result = deletePage(doc, 'p1');
    expect(result.pages).toHaveLength(1);
  });
});

// ─── duplicatePage ────────────────────────────────────────────────────────────

describe('duplicatePage', () => {
  test('inserts a copy directly after the original', () => {
    const doc = makeDoc([makeBlock('b1')]);
    const { doc: withTwo } = addPage(doc, 'Page 2');
    const { doc: result, newPageId } = duplicatePage(withTwo, 'p1');
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].id).toBe('p1');
    expect(result.pages[1].id).toBe(newPageId);
    expect(result.pages[2].id).toBe(withTwo.pages[1].id);
  });

  test('copy name has "(Kopie)" suffix', () => {
    const doc = makeDoc();
    const { doc: result } = duplicatePage(doc, 'p1');
    expect(result.pages[1].name).toContain('Kopie');
  });

  test('copy nodes get new ids', () => {
    const doc = makeDoc([makeBlock('b1')]);
    const { doc: result } = duplicatePage(doc, 'p1');
    const originalNodeId = firstPage(doc).nodes[0].id;
    const copyNodeId = result.pages[1].nodes[0].id;
    expect(copyNodeId).not.toBe(originalNodeId);
  });

  test('returns original doc for unknown pageId', () => {
    const doc = makeDoc();
    const { doc: result } = duplicatePage(doc, 'unknown');
    expect(result.pages).toHaveLength(1);
  });
});

// ─── reorderPages ─────────────────────────────────────────────────────────────

describe('reorderPages', () => {
  test('moves page from index 0 to index 1', () => {
    const doc = makeDoc();
    const { doc: withTwo } = addPage(doc, 'Page 2');
    const p2id = withTwo.pages[1].id;
    const result = reorderPages(withTwo, 0, 1);
    expect(result.pages[0].id).toBe(p2id);
    expect(result.pages[1].id).toBe('p1');
  });
});
