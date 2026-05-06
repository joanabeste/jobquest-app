import { collectSpeakersInBlock, collectAllSpeakersInDoc, resolveSpeaker, findFirstPerLineAvatar } from '../speaker-ops';
import type { FunnelDoc, FunnelBlockType } from '../funnel-types';

describe('resolveSpeaker', () => {
  it('returns the original speaker string when no override exists', () => {
    expect(resolveSpeaker(undefined, 'Simon (Pflegefachkraft)')).toEqual({
      displayName: 'Simon (Pflegefachkraft)',
      avatarUrl: undefined,
    });
  });

  it('uses the override displayName when set', () => {
    const overrides = { 'Simon (Pflegefachkraft)': { displayName: 'Tom' } };
    expect(resolveSpeaker(overrides, 'Simon (Pflegefachkraft)')).toEqual({
      displayName: 'Tom',
      avatarUrl: undefined,
    });
  });

  it('falls back to original string when override displayName is empty/whitespace', () => {
    const overrides = { 'Simon (Pflegefachkraft)': { displayName: '   ' } };
    expect(resolveSpeaker(overrides, 'Simon (Pflegefachkraft)').displayName).toBe('Simon (Pflegefachkraft)');
  });

  it('returns avatarUrl from override', () => {
    const overrides = { Sarah: { avatarUrl: 'https://example.com/sarah.jpg' } };
    expect(resolveSpeaker(overrides, 'Sarah').avatarUrl).toBe('https://example.com/sarah.jpg');
  });

  it('does not crash on speakers not in the override map', () => {
    const overrides = { Simon: { displayName: 'Tom' } };
    expect(resolveSpeaker(overrides, 'UnknownSpeaker')).toEqual({
      displayName: 'UnknownSpeaker',
      avatarUrl: undefined,
    });
  });
});

describe('collectSpeakersInBlock', () => {
  it('returns empty array when no lines exist', () => {
    expect(collectSpeakersInBlock({ lines: [] })).toEqual([]);
    expect(collectSpeakersInBlock(null)).toEqual([]);
    expect(collectSpeakersInBlock(undefined)).toEqual([]);
  });

  it('collects unique speakers in first-appearance order', () => {
    const lines = [
      { id: '1', speaker: 'Simon (Pflegefachkraft)', text: 'Hi', position: 'left' as const },
      { id: '2', speaker: 'Du', text: 'Hi back', position: 'right' as const },
      { id: '3', speaker: 'Sarah (Teamleiterin)', text: 'Moin', position: 'left' as const },
      { id: '4', speaker: 'Simon (Pflegefachkraft)', text: 'Wieder ich', position: 'left' as const },
    ];
    expect(collectSpeakersInBlock({ lines })).toEqual([
      'Simon (Pflegefachkraft)',
      'Sarah (Teamleiterin)',
    ]);
  });

  it('skips center-position lines and the user side', () => {
    const lines = [
      { id: '1', speaker: '', text: 'Du gehst rein.', position: 'center' as const },
      { id: '2', speaker: 'Erzähler', text: 'Es ist ruhig.', position: 'center' as const },
      { id: '3', speaker: '@vorname', text: 'Hi', position: 'right' as const },
      { id: '4', speaker: 'Du', text: 'Hi', position: 'right' as const },
      { id: '5', speaker: 'Simon', text: 'Moin', position: 'left' as const },
    ];
    expect(collectSpeakersInBlock({ lines })).toEqual(['Simon']);
  });

  it('treats default left-position when position is missing', () => {
    const lines = [{ id: '1', speaker: 'Simon', text: 'Moin' }];
    expect(collectSpeakersInBlock({ lines })).toEqual(['Simon']);
  });
});

describe('collectAllSpeakersInDoc', () => {
  function makeDoc(blocks: Array<{ type: string; lines?: Array<{ id: string; speaker: string; text: string; position?: string }> }>): FunnelDoc {
    return {
      id: 'd',
      contentId: 'c',
      contentType: 'quest',
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          nodes: blocks.map((b, i) => ({
            id: `n${i}`,
            kind: 'block' as const,
            type: b.type as FunnelBlockType,
            props: b.lines ? { lines: b.lines } : {},
          })),
        },
      ],
      createdAt: '',
      updatedAt: '',
    };
  }

  it('collects speakers from multiple blocks across the doc', () => {
    const doc = makeDoc([
      { type: 'quest_dialog', lines: [{ id: '1', speaker: 'Simon', text: '', position: 'left' }] },
      { type: 'quest_scene', lines: undefined },
      { type: 'quest_dialog', lines: [{ id: '2', speaker: 'Sarah', text: '', position: 'left' }, { id: '3', speaker: 'Simon', text: '', position: 'left' }] },
    ]);
    expect(collectAllSpeakersInDoc(doc)).toEqual(['Simon', 'Sarah']);
  });

  it('ignores non-dialog blocks', () => {
    const doc = makeDoc([{ type: 'quest_quiz' }, { type: 'quest_scene' }]);
    expect(collectAllSpeakersInDoc(doc)).toEqual([]);
  });
});

describe('findFirstPerLineAvatar', () => {
  function makeDoc(lines: Array<{ id: string; speaker: string; text: string; position?: string; avatarUrl?: string }>): FunnelDoc {
    return {
      id: 'd',
      contentId: 'c',
      contentType: 'quest',
      pages: [
        {
          id: 'p1',
          name: 'Page 1',
          nodes: [{ id: 'n1', kind: 'block' as const, type: 'quest_dialog' as FunnelBlockType, props: { lines } }],
        },
      ],
      createdAt: '',
      updatedAt: '',
    };
  }

  it('finds the first per-line avatarUrl matching a speaker', () => {
    const doc = makeDoc([
      { id: '1', speaker: 'Simon', text: '' },
      { id: '2', speaker: 'Simon', text: '', avatarUrl: 'https://example.com/simon.jpg' },
    ]);
    expect(findFirstPerLineAvatar(doc, 'Simon')).toBe('https://example.com/simon.jpg');
  });

  it('returns undefined when no avatar set', () => {
    const doc = makeDoc([{ id: '1', speaker: 'Simon', text: '' }]);
    expect(findFirstPerLineAvatar(doc, 'Simon')).toBeUndefined();
  });
});
