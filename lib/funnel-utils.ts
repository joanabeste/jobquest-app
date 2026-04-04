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
export function computeScores(
  pages: FunnelPage[],
  answers: Record<string, unknown>,
): Record<string, number> {
  const scores: Record<string, number> = {};
  pages.flatMap((p) => p.nodes).forEach((node) => {
    if (node.kind !== 'block') return;
    const props = node.props;
    const answer = answers[node.id];
    if (answer === undefined) return;

    if (node.type === 'check_frage' && props.frageType === 'single_choice') {
      const opt = (props.options as { id: string; scores?: Record<string, number> }[]).find(
        (o) => o.id === answer,
      );
      if (opt?.scores) Object.entries(opt.scores).forEach(([d, v]) => { scores[d] = (scores[d] ?? 0) + v; });
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
      if (opt?.scores) Object.entries(opt.scores).forEach(([d, v]) => { scores[d] = (scores[d] ?? 0) + v; });
    }
  });
  return scores;
}
