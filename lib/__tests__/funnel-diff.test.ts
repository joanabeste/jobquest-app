import {
  diffFunnelDoc,
  applyDiffSelection,
  dependencies,
  dependents,
  selectableChangeIds,
  extractDimensionRefs,
  summarizeBlockLabel,
} from '../funnel-diff';
import type { BlockNode, FunnelNode, FunnelPage, LayoutNode } from '../funnel-types';
import type { Dimension } from '../types';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function block(id: string, type: string, props: Record<string, unknown> = {}): BlockNode {
  return { id, kind: 'block', type: type as BlockNode['type'], props };
}

function page(id: string, name: string, nodes: FunnelNode[]): FunnelPage {
  return { id, name, nodes };
}

function dim(id: string, name: string): Dimension {
  return { id, name };
}

const everySelected = (...ids: string[]): Set<string> => new Set(ids);

// ─── diffFunnelDoc ──────────────────────────────────────────────────────────

describe('diffFunnelDoc', () => {
  test('identical docs produce empty diff', () => {
    const doc = {
      pages: [page('p1', 'Start', [block('b1', 'heading', { text: 'Hi' })])],
      dimensions: [dim('d1', 'A')],
    };
    const diff = diffFunnelDoc(doc, doc);
    expect(diff.pages).toEqual([]);
    expect(diff.dimensions).toEqual([]);
    expect(diff.unchangedPageCount).toBe(1);
    expect(diff.unchangedBlockCount).toBe(1);
  });

  test('detects modified prop on a single block', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'heading', { text: 'Old' })])],
      dimensions: [],
    };
    const next = {
      pages: [page('p1', 'P', [block('b1', 'heading', { text: 'New' })])],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);
    expect(diff.pages).toHaveLength(1);
    const pc = diff.pages[0];
    expect(pc.kind).toBe('modified');
    if (pc.kind !== 'modified') throw new Error('not modified');
    expect(pc.blocks).toHaveLength(1);
    expect(pc.blocks[0]).toMatchObject({ kind: 'modified', fields: ['text'] });
  });

  test('block in layout column gets layout parentPath', () => {
    const layout = (cols: { id: string; nodes: FunnelNode[] }[]): LayoutNode => ({
      id: 'l1', kind: 'layout', columns: cols,
    });
    const prev = {
      pages: [page('p1', 'P', [layout([{ id: 'c1', nodes: [block('b1', 'paragraph', { text: 'a' })] }])])],
      dimensions: [],
    };
    const next = {
      pages: [page('p1', 'P', [layout([{ id: 'c1', nodes: [block('b1', 'paragraph', { text: 'b' })] }])])],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);
    const pc = diff.pages[0];
    if (pc.kind !== 'modified') throw new Error('expected modified');
    const bc = pc.blocks[0];
    if (bc.kind !== 'modified') throw new Error('expected modified');
    expect(bc.parentPath).toEqual({ kind: 'layout', layoutId: 'l1', columnId: 'c1' });
  });

  test('detects added page and removed page', () => {
    const prev = { pages: [page('p1', 'A', [])], dimensions: [] };
    const next = { pages: [page('p2', 'B', [])], dimensions: [] };
    const diff = diffFunnelDoc(prev, next);
    expect(diff.pages.map((p) => p.kind).sort()).toEqual(['added', 'removed']);
  });

  test('detects dimension addition / modification / removal', () => {
    const prev = { pages: [], dimensions: [dim('d1', 'Old'), dim('d2', 'Stay')] };
    const next = { pages: [], dimensions: [dim('d2', 'Stay'), dim('d3', 'Brand New')] };
    const diff = diffFunnelDoc(prev, next);
    const kinds = diff.dimensions.map((d) => d.kind).sort();
    expect(kinds).toEqual(['added', 'removed']);
  });

  test('detects orderChanged when top-level nodes are reshuffled', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'heading'), block('b2', 'paragraph')])],
      dimensions: [],
    };
    const next = {
      pages: [page('p1', 'P', [block('b2', 'paragraph'), block('b1', 'heading')])],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);
    const pc = diff.pages[0];
    if (pc.kind !== 'modified') throw new Error('expected modified');
    expect(pc.orderChanged).toBe(true);
    expect(pc.metaChangeId).toMatch(/^pagemeta:/);
  });
});

// ─── applyDiffSelection ─────────────────────────────────────────────────────

describe('applyDiffSelection', () => {
  test('empty selection reproduces prev exactly', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'heading', { text: 'Hi' })])],
      dimensions: [dim('d1', 'A')],
    };
    const next = {
      pages: [page('p1', 'P', [block('b1', 'heading', { text: 'Bye' })])],
      dimensions: [dim('d1', 'B')],
    };
    const diff = diffFunnelDoc(prev, next);
    const result = applyDiffSelection(prev, next, diff, new Set());
    expect(result.pages).toEqual(prev.pages);
    expect(result.dimensions).toEqual(prev.dimensions);
    expect(result.warnings).toEqual([]);
  });

  test('full selection reproduces next exactly (modulo equality)', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'heading', { text: 'Hi' })])],
      dimensions: [dim('d1', 'A')],
    };
    const next = {
      pages: [
        page('p1', 'P', [block('b1', 'heading', { text: 'Bye' }), block('b2', 'paragraph', { text: 'Neu' })]),
        page('p2', 'Neue Seite', [block('b3', 'paragraph', { text: 'X' })]),
      ],
      dimensions: [dim('d1', 'A2'), dim('d2', 'New')],
    };
    const diff = diffFunnelDoc(prev, next);
    const all = new Set(selectableChangeIds(diff));
    const result = applyDiffSelection(prev, next, diff, all);
    expect(result.pages).toEqual(next.pages);
    expect(result.dimensions).toEqual(next.dimensions);
  });

  test('partial selection: keeps unrelated blocks unchanged', () => {
    const prev = {
      pages: [page('p1', 'P', [
        block('b1', 'heading', { text: 'Keep' }),
        block('b2', 'paragraph', { text: 'Old' }),
      ])],
      dimensions: [],
    };
    const next = {
      pages: [page('p1', 'P', [
        block('b1', 'heading', { text: 'Changed!' }),
        block('b2', 'paragraph', { text: 'Also changed' }),
      ])],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);
    // Only accept the change on b2.
    const sel = everySelected('block:b2');
    const result = applyDiffSelection(prev, next, diff, sel);
    const nodes = result.pages[0].nodes as BlockNode[];
    expect(nodes[0].props.text).toBe('Keep');         // unchanged
    expect(nodes[1].props.text).toBe('Also changed'); // applied
  });

  test('block-add referencing new dimension → consistency strips score if dim unselected', () => {
    const prev = { pages: [page('p1', 'P', [])], dimensions: [] };
    const next = {
      pages: [page('p1', 'P', [
        block('b1', 'check_frage', {
          frageType: 'single_choice',
          question: 'Q',
          options: [{ id: 'o1', text: 'A', scores: { 'd-new': 3 } }],
        }),
      ])],
      dimensions: [dim('d-new', 'Neue Dim')],
    };
    const diff = diffFunnelDoc(prev, next);
    // Take the block but NOT the new dimension.
    const sel = everySelected('block:b1');
    const result = applyDiffSelection(prev, next, diff, sel);
    const opts = (result.pages[0].nodes[0] as BlockNode).props.options as Array<{ scores: Record<string, number> }>;
    expect(opts[0].scores['d-new']).toBeUndefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('removed page: visibleIf on dependent page is stripped', () => {
    const prev = {
      pages: [
        page('p1', 'Quelle', [block('b1', 'check_frage', {})]),
        { id: 'p2', name: 'Ziel', nodes: [block('b9', 'paragraph')], visibleIf: { sourceBlockId: 'b1', equals: ['x'] } } as FunnelPage,
      ],
      dimensions: [],
    };
    const next = {
      pages: [
        { id: 'p2', name: 'Ziel', nodes: [block('b9', 'paragraph')], visibleIf: { sourceBlockId: 'b1', equals: ['x'] } } as FunnelPage,
      ],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);
    const sel = new Set(selectableChangeIds(diff));
    const result = applyDiffSelection(prev, next, diff, sel);
    expect(result.pages.find((p) => p.id === 'p2')?.visibleIf).toBeUndefined();
    expect(result.warnings.some((w) => w.includes('Sichtbarkeits-Bedingung'))).toBe(true);
  });

  test('reorder is applied only when metaChangeId is selected', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'heading'), block('b2', 'paragraph')])],
      dimensions: [],
    };
    const next = {
      pages: [page('p1', 'P', [block('b2', 'paragraph'), block('b1', 'heading')])],
      dimensions: [],
    };
    const diff = diffFunnelDoc(prev, next);

    // Without meta change: keep prev order.
    const r1 = applyDiffSelection(prev, next, diff, new Set());
    expect(r1.pages[0].nodes.map((n) => n.id)).toEqual(['b1', 'b2']);

    // With meta change: take next order.
    const r2 = applyDiffSelection(prev, next, diff, new Set(selectableChangeIds(diff)));
    expect(r2.pages[0].nodes.map((n) => n.id)).toEqual(['b2', 'b1']);
  });
});

// ─── dependencies / dependents ──────────────────────────────────────────────

describe('dependencies / dependents', () => {
  test('block-added with score on new dim depends on dim-added', () => {
    const prev = { pages: [page('p1', 'P', [])], dimensions: [] };
    const next = {
      pages: [page('p1', 'P', [
        block('b1', 'check_frage', {
          frageType: 'single_choice',
          options: [{ id: 'o1', text: 'A', scores: { 'd-new': 3 } }],
        }),
      ])],
      dimensions: [dim('d-new', 'Neu')],
    };
    const diff = diffFunnelDoc(prev, next);
    expect(dependencies(diff, 'block:b1')).toEqual(['dim:d-new']);
    expect(dependents(diff, 'dim:d-new')).toContain('block:b1');
  });

  test('block-modified with sliderDimensionId on new dim → dependency on dim:added', () => {
    const prev = {
      pages: [page('p1', 'P', [block('b1', 'check_selbst', { sliderDimensionId: 'd1' })])],
      dimensions: [dim('d1', 'Old')],
    };
    const next = {
      pages: [page('p1', 'P', [block('b1', 'check_selbst', { sliderDimensionId: 'd2' })])],
      dimensions: [dim('d1', 'Old'), dim('d2', 'Neu')],
    };
    const diff = diffFunnelDoc(prev, next);
    expect(dependencies(diff, 'block:b1')).toEqual(['dim:d2']);
  });

  test('refs to existing dimensions do not produce dependencies', () => {
    const prev = {
      pages: [page('p1', 'P', [])],
      dimensions: [dim('d1', 'A')],
    };
    const next = {
      pages: [page('p1', 'P', [
        block('b1', 'check_selbst', { sliderDimensionId: 'd1' }),
      ])],
      dimensions: [dim('d1', 'A')],
    };
    const diff = diffFunnelDoc(prev, next);
    expect(dependencies(diff, 'block:b1')).toEqual([]);
  });
});

// ─── extractDimensionRefs ───────────────────────────────────────────────────

describe('extractDimensionRefs', () => {
  test('check_swipe_deck collects dims from all three options of every card', () => {
    const node = block('s', 'check_swipe_deck', {
      cards: [
        {
          optionPositive: { scores: { d1: 2 } },
          optionNeutral: { scores: { d2: 1 } },
          optionNegative: { scores: { d3: 0 } },
        },
        { optionPositive: { scores: { d4: 5 } } },
      ],
    });
    expect(extractDimensionRefs(node).sort()).toEqual(['d1', 'd2', 'd3', 'd4']);
  });

  test('check_statements collects via statements[].dimensionId', () => {
    const node = block('s', 'check_statements', {
      statements: [
        { id: 's1', dimensionId: 'd1' },
        { id: 's2', dimensionId: '' },
        { id: 's3', dimensionId: 'd2' },
      ],
    });
    expect(extractDimensionRefs(node).sort()).toEqual(['d1', 'd2']);
  });

  test('layout nodes have no refs', () => {
    const node: LayoutNode = { id: 'l', kind: 'layout', columns: [] };
    expect(extractDimensionRefs(node)).toEqual([]);
  });
});

// ─── summarizeBlockLabel ────────────────────────────────────────────────────

describe('summarizeBlockLabel', () => {
  test('renders a useful label for common types', () => {
    expect(summarizeBlockLabel(block('h', 'heading', { text: 'Hallo Welt' }))).toContain('Hallo Welt');
    expect(summarizeBlockLabel(block('q', 'check_frage', { question: 'Was?' }))).toContain('Was?');
    expect(summarizeBlockLabel(block('s', 'check_swipe_deck', { cards: [{}, {}, {}] }))).toContain('3 Karten');
  });

  test('layout node label includes column count', () => {
    const layout: LayoutNode = { id: 'l', kind: 'layout', columns: [{ id: 'c1', nodes: [] }, { id: 'c2', nodes: [] }] };
    expect(summarizeBlockLabel(layout)).toContain('2');
  });
});
