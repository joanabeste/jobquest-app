import { flatBlocks, isSubmitPage, computeScores } from '../funnel-utils';
import type { BlockNode, FunnelNode, FunnelPage } from '../funnel-types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function block(id: string, type: string, props: Record<string, unknown> = {}): BlockNode {
  return { id, kind: 'block', type: type as BlockNode['type'], props };
}

function page(nodes: FunnelNode[]): FunnelPage {
  return { id: 'p1', name: 'Page 1', nodes };
}

// ─── flatBlocks ───────────────────────────────────────────────────────────────

describe('flatBlocks', () => {
  test('returns root blocks directly', () => {
    const nodes: FunnelNode[] = [block('b1', 'text'), block('b2', 'heading')];
    expect(flatBlocks(nodes).map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  test('flattens blocks inside layout columns', () => {
    const nodes: FunnelNode[] = [{
      id: 'l1',
      kind: 'layout',
      columns: [
        { id: 'c1', nodes: [block('b1', 'text')] },
        { id: 'c2', nodes: [block('b2', 'image')] },
      ],
    }];
    const result = flatBlocks(nodes);
    expect(result.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  test('returns empty array for no nodes', () => {
    expect(flatBlocks([])).toEqual([]);
  });
});

// ─── isSubmitPage ─────────────────────────────────────────────────────────────

describe('isSubmitPage', () => {
  test('returns true when quest_lead block is present', () => {
    expect(isSubmitPage([block('b1', 'quest_lead')])).toBe(true);
  });

  test('returns true when check_lead block is present', () => {
    expect(isSubmitPage([block('b1', 'check_lead')])).toBe(true);
  });

  test('returns true when form_config block is present', () => {
    expect(isSubmitPage([block('b1', 'form_config')])).toBe(true);
  });

  test('returns false for regular content blocks', () => {
    expect(isSubmitPage([block('b1', 'heading'), block('b2', 'text')])).toBe(false);
  });

  test('returns false for empty node list', () => {
    expect(isSubmitPage([])).toBe(false);
  });
});

// ─── computeScores ────────────────────────────────────────────────────────────

describe('computeScores', () => {
  test('scores single_choice answer correctly', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_frage', {
        frageType: 'single_choice',
        options: [
          { id: 'opt1', scores: { technik: 3, kommunikation: 1 } },
          { id: 'opt2', scores: { technik: 1, kommunikation: 3 } },
        ],
      }),
    ])];
    const scores = computeScores(pages, { q1: 'opt1' });
    expect(scores).toEqual({ technik: 3, kommunikation: 1 });
  });

  test('accumulates scores across multiple questions', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_frage', {
        frageType: 'single_choice',
        options: [{ id: 'a', scores: { technik: 2 } }],
      }),
      block('q2', 'check_frage', {
        frageType: 'single_choice',
        options: [{ id: 'a', scores: { technik: 3 } }],
      }),
    ])];
    const scores = computeScores(pages, { q1: 'a', q2: 'a' });
    expect(scores.technik).toBe(5);
  });

  test('scores slider answer by adding numeric value to dimension', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_frage', {
        frageType: 'slider',
        sliderDimensionId: 'technik',
      }),
    ])];
    const scores = computeScores(pages, { q1: 7 });
    expect(scores).toEqual({ technik: 7 });
  });

  test('scores check_selbst slider answer', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_selbst', { sliderDimensionId: 'kreativitaet' }),
    ])];
    const scores = computeScores(pages, { q1: 5 });
    expect(scores).toEqual({ kreativitaet: 5 });
  });

  test('scores check_ergebnisfrage', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_ergebnisfrage', {
        options: [
          { id: 'opt1', scores: { fuehrung: 4 } },
        ],
      }),
    ])];
    const scores = computeScores(pages, { q1: 'opt1' });
    expect(scores).toEqual({ fuehrung: 4 });
  });

  test('ignores blocks with no answer', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_frage', {
        frageType: 'single_choice',
        options: [{ id: 'a', scores: { technik: 5 } }],
      }),
    ])];
    const scores = computeScores(pages, {}); // no answer for q1
    expect(scores).toEqual({});
  });

  test('ignores single_choice when selected option has no scores', () => {
    const pages: FunnelPage[] = [page([
      block('q1', 'check_frage', {
        frageType: 'single_choice',
        options: [{ id: 'a' }], // no scores property
      }),
    ])];
    const scores = computeScores(pages, { q1: 'a' });
    expect(scores).toEqual({});
  });

  test('ignores non-block nodes', () => {
    const layoutNode: FunnelNode = {
      id: 'l1',
      kind: 'layout',
      columns: [{ id: 'c1', nodes: [] }],
    };
    const scores = computeScores([page([layoutNode])], {});
    expect(scores).toEqual({});
  });

  test('returns empty scores for empty pages', () => {
    expect(computeScores([], {})).toEqual({});
  });

  test('handles answers across multiple pages', () => {
    const pages: FunnelPage[] = [
      { id: 'p1', name: 'P1', nodes: [
        block('q1', 'check_frage', { frageType: 'slider', sliderDimensionId: 'd1' }),
      ]},
      { id: 'p2', name: 'P2', nodes: [
        block('q2', 'check_frage', { frageType: 'slider', sliderDimensionId: 'd2' }),
      ]},
    ];
    const scores = computeScores(pages, { q1: 3, q2: 6 });
    expect(scores).toEqual({ d1: 3, d2: 6 });
  });
});
