import { wordDiff } from '../text-diff';

describe('wordDiff', () => {
  test('identical strings produce a single common token', () => {
    expect(wordDiff('Hallo Welt', 'Hallo Welt')).toEqual([
      { type: 'common', text: 'Hallo Welt' },
    ]);
  });

  test('empty inputs produce an empty diff', () => {
    expect(wordDiff('', '')).toEqual([]);
  });

  test('add-only when before is empty', () => {
    expect(wordDiff('', 'neuer Text')).toEqual([
      { type: 'add', text: 'neuer Text' },
    ]);
  });

  test('remove-only when after is empty', () => {
    expect(wordDiff('alter Text', '')).toEqual([
      { type: 'remove', text: 'alter Text' },
    ]);
  });

  test('mid-string change: common / remove / add / common', () => {
    const tokens = wordDiff('Was ist deine Lieblingsfarbe?', 'Was ist deine Lieblingsspeise?');
    // Reconstruct each side from tokens to verify correctness.
    const before = tokens.filter((t) => t.type !== 'add').map((t) => t.text).join('');
    const after = tokens.filter((t) => t.type !== 'remove').map((t) => t.text).join('');
    expect(before).toBe('Was ist deine Lieblingsfarbe?');
    expect(after).toBe('Was ist deine Lieblingsspeise?');
    // The common prefix should be a single common token.
    expect(tokens[0]).toEqual({ type: 'common', text: 'Was ist deine ' });
  });

  test('preserves whitespace runs (newlines stay)', () => {
    const tokens = wordDiff('Zeile 1\nZeile 2', 'Zeile 1\nZeile X');
    const after = tokens.filter((t) => t.type !== 'remove').map((t) => t.text).join('');
    expect(after).toBe('Zeile 1\nZeile X');
  });

  test('disjoint strings: one remove + one add', () => {
    const tokens = wordDiff('Apfel', 'Birne');
    expect(tokens).toEqual([
      { type: 'remove', text: 'Apfel' },
      { type: 'add', text: 'Birne' },
    ]);
  });

  test('addition at end is merged into a single add token', () => {
    const tokens = wordDiff('Hallo', 'Hallo Welt');
    // 'Hallo' common, ' Welt' added (whitespace + word merged).
    expect(tokens.filter((t) => t.type === 'common').map((t) => t.text).join('')).toBe('Hallo');
    expect(tokens.filter((t) => t.type === 'add').map((t) => t.text).join('')).toBe(' Welt');
  });

  test('runs of same type are coalesced (whitespace shared)', () => {
    const tokens = wordDiff('a b c d', 'x y c d');
    // The whitespace runs match, so LCS keeps them as common. Words 'a b'
    // become a remove run, 'x y' become an add run, and ' c d' is shared.
    const removed = tokens.filter((t) => t.type === 'remove').map((t) => t.text).join('');
    const added = tokens.filter((t) => t.type === 'add').map((t) => t.text).join('');
    // Words removed/added without their inner whitespace (the spaces match LCS).
    expect(removed).toBe('ab');
    expect(added).toBe('xy');
    // Tail (last common token) holds ' c d'.
    expect(tokens[tokens.length - 1].type).toBe('common');
    expect(tokens[tokens.length - 1].text).toContain('c d');
  });
});
