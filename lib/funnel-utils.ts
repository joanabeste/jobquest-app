import type { FunnelNode, FunnelPage, BlockNode } from './funnel-types';

/** Flatten all BlockNodes from a node array (including inside layouts). */
export function flatBlocks(nodes: FunnelNode[]): BlockNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'layout'
      ? node.columns.flatMap((c) => c.nodes.filter((cn) => cn.kind === 'block') as BlockNode[])
      : [node as BlockNode]
  );
}

/** Returns true if any block on the page is a lead/submission block. */
export function isSubmitPage(nodes: FunnelNode[]): boolean {
  return flatBlocks(nodes).some(
    (bl) => bl.type === 'check_lead' || bl.type === 'quest_lead' || bl.type === 'form_config'
  );
}

const s = (v: unknown, fallback = ''): string => (v != null ? String(v) : fallback);
const n = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);

/**
 * Computes dimension scores from the user's answers across all BerufsCheck pages.
 * Handles check_frage (single_choice & slider), check_selbst, and check_ergebnisfrage.
 */
export const SKIP_ANSWER = '__skip__';

type ScoreMap = Record<string, number>;
function addScores(target: ScoreMap, src?: ScoreMap) {
  if (!src) return;
  Object.entries(src).forEach(([d, v]) => { target[d] = (target[d] ?? 0) + v; });
}

/**
 * Computes the theoretically achievable maximum per dimension across all pages.
 * Used to normalise progress bars so 100% means "user answered maximally in
 * favour of this dimension" (and not "this dim happens to be top-scoring even
 * with one positive swipe card").
 */
export function computeMaxScores(pages: FunnelPage[]): Record<string, number> {
  const max: Record<string, number> = {};
  function bump(dim: string, points: number) {
    if (!dim || points <= 0) return;
    max[dim] = (max[dim] ?? 0) + points;
  }
  pages.flatMap((p) => p.nodes).forEach((node) => {
    if (node.kind !== 'block') return;
    const props = node.props;

    if (node.type === 'check_frage' && props.frageType === 'single_choice') {
      // For single-choice: the user can pick exactly one option → the max
      // contribution per dimension is the highest-scoring option for that dim.
      const opts = (props.options as Array<{ scores?: Record<string, number> }>) ?? [];
      const dimMax: Record<string, number> = {};
      opts.forEach((o) => {
        Object.entries(o.scores ?? {}).forEach(([d, v]) => {
          dimMax[d] = Math.max(dimMax[d] ?? 0, v);
        });
      });
      Object.entries(dimMax).forEach(([d, v]) => bump(d, v));
    } else if (node.type === 'check_frage' && props.frageType === 'slider' && props.sliderDimensionId) {
      const sliderMax = typeof props.sliderMax === 'number' ? props.sliderMax : 10;
      bump(s(props.sliderDimensionId), sliderMax);
    } else if (node.type === 'check_selbst' && props.sliderDimensionId) {
      const sliderMax = typeof props.sliderMax === 'number' ? props.sliderMax : 10;
      bump(s(props.sliderDimensionId), sliderMax);
    } else if (node.type === 'check_ergebnisfrage') {
      const opts = (props.options as Array<{ scores?: Record<string, number> }>) ?? [];
      const dimMax: Record<string, number> = {};
      opts.forEach((o) => {
        Object.entries(o.scores ?? {}).forEach(([d, v]) => {
          dimMax[d] = Math.max(dimMax[d] ?? 0, v);
        });
      });
      Object.entries(dimMax).forEach(([d, v]) => bump(d, v));
    } else if (node.type === 'check_statements') {
      const stmts = (props.statements as Array<{ dimensionId?: string; points?: number }>) ?? [];
      stmts.forEach((stmt) => {
        if (stmt.dimensionId) bump(stmt.dimensionId, stmt.points ?? 2);
      });
    } else if (node.type === 'check_swipe_deck') {
      // Per card: user picks exactly one of {pos, neu, neg} → max contribution
      // for a dimension is the highest of the three options' scores.
      const cards = (props.cards as Array<Record<string, unknown>>) ?? [];
      cards.forEach((card) => {
        const dimMax: Record<string, number> = {};
        (['optionPositive', 'optionNeutral', 'optionNegative'] as const).forEach((k) => {
          const opt = card[k] as { scores?: Record<string, number> } | undefined;
          Object.entries(opt?.scores ?? {}).forEach(([d, v]) => {
            dimMax[d] = Math.max(dimMax[d] ?? 0, v);
          });
        });
        Object.entries(dimMax).forEach(([d, v]) => bump(d, v));
      });
    }
  });
  return max;
}

export function computeScores(
  pages: FunnelPage[],
  answers: Record<string, unknown>,
): Record<string, number> {
  const scores: Record<string, number> = {};
  pages.flatMap((p) => p.nodes).forEach((node) => {
    if (node.kind !== 'block') return;
    const props = node.props;
    const answer = answers[node.id];
    if (answer === undefined || answer === SKIP_ANSWER) return;

    if (node.type === 'check_frage' && props.frageType === 'single_choice') {
      const opt = (props.options as { id: string; scores?: Record<string, number> }[]).find(
        (o) => o.id === answer,
      );
      addScores(scores, opt?.scores);
    } else if (node.type === 'check_frage' && props.frageType === 'slider' && props.sliderDimensionId) {
      const d = s(props.sliderDimensionId);
      scores[d] = (scores[d] ?? 0) + n(answer, 0);
    } else if (node.type === 'check_selbst' && props.sliderDimensionId) {
      const d = s(props.sliderDimensionId);
      scores[d] = (scores[d] ?? 0) + n(answer, 0);
    } else if (node.type === 'check_ergebnisfrage') {
      const opt = (props.options as { id: string; scores?: Record<string, number> }[]).find(
        (o) => o.id === answer,
      );
      addScores(scores, opt?.scores);
    } else if (node.type === 'check_statements') {
      const stmts = (props.statements as Array<{ id: string; dimensionId?: string; points?: number }>) ?? [];
      const checked = Array.isArray(answer) ? (answer as string[]) : [];
      stmts.forEach((stmt) => {
        if (checked.includes(stmt.id) && stmt.dimensionId) {
          scores[stmt.dimensionId] = (scores[stmt.dimensionId] ?? 0) + (stmt.points ?? 2);
        }
      });
    } else if (node.type === 'check_swipe_deck') {
      // answer = Array<{ cardId: string; choice: 'pos'|'neu'|'neg'|'skip' }>
      const cards = (props.cards as Array<Record<string, unknown>>) || [];
      const results = Array.isArray(answer) ? (answer as Array<{ cardId: string; choice: string }>) : [];
      results.forEach((r) => {
        if (r.choice === 'skip') return;
        const card = cards.find((c) => (c.id as string) === r.cardId);
        if (!card) return;
        const optKey = r.choice === 'pos' ? 'optionPositive' : r.choice === 'neg' ? 'optionNegative' : 'optionNeutral';
        const opt = card[optKey] as { scores?: Record<string, number> } | undefined;
        addScores(scores, opt?.scores);
      });
    }
  });
  return scores;
}
