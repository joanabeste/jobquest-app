export type DiffToken = { type: 'common' | 'add' | 'remove'; text: string };

/**
 * Tokenizes a string into word + whitespace tokens (whitespace runs are kept
 * as separate tokens so the renderer can preserve original spacing/newlines).
 */
function tokenize(s: string): string[] {
  if (s === '') return [];
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * Word-level LCS diff. Returns a flat sequence of tokens marked as common,
 * remove (only in `before`) or add (only in `after`).
 *
 * Complexity is O(n*m) — fine for diffing one field at a time, problematic for
 * very large strings. Callers should fall back to a simpler before/after view
 * when inputs exceed ~1k tokens.
 */
export function wordDiff(before: string, after: string): DiffToken[] {
  if (before === after) {
    return before === '' ? [] : [{ type: 'common', text: before }];
  }
  const a = tokenize(before);
  const b = tokenize(after);

  // LCS DP table.
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Backtrack and merge runs of the same type.
  const out: DiffToken[] = [];
  function push(type: DiffToken['type'], text: string) {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  }
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push('common', a[i]);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('remove', a[i]);
      i++;
    } else {
      push('add', b[j]);
      j++;
    }
  }
  while (i < m) { push('remove', a[i]); i++; }
  while (j < n) { push('add', b[j]); j++; }
  return out;
}
