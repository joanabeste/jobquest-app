import {
  validateBranching,
  isWelcomePage,
  isSpinnerPage,
  isVornamePage,
  isRatingPage,
  isLeadPage,
  runDialogPass,
} from '../dialog-pass';
import type { FunnelPage, BlockNode } from '../funnel-types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../ai-provider', () => ({
  aiChat: jest.fn(),
  AiError: class AiError extends Error {
    constructor(message: string, public readonly code: string) { super(message); }
  },
}));

import { aiChat, AiError } from '../ai-provider';
const aiChatMock = aiChat as jest.MockedFunction<typeof aiChat>;

beforeEach(() => {
  aiChatMock.mockReset();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function uuid(seed: number): string {
  // Deterministische, valide UUIDs für Tests.
  const hex = seed.toString(16).padStart(12, '0');
  return `aaaaaaaa-bbbb-4ccc-9ddd-${hex}`;
}

function block(id: string, type: string, props: Record<string, unknown> = {}): BlockNode {
  return { id, kind: 'block', type: type as BlockNode['type'], props };
}

function page(id: string, name: string, blocks: BlockNode[], extra: Partial<FunnelPage> = {}): FunnelPage {
  return { id, name, nodes: blocks, ...extra };
}

const PAGE_IDS = Array.from({ length: 30 }, (_, i) => uuid(i + 1));

function welcomePage(): FunnelPage {
  return page(PAGE_IDS[0], 'Welcome', [block(uuid(100), 'quest_scene', { title: 'Hi' })], { hideLocationHint: true });
}
function spinnerPage(): FunnelPage {
  return page(PAGE_IDS[1], 'Spinner', [block(uuid(101), 'quest_spinner', {})]);
}
function vornamePage(): FunnelPage {
  return page(PAGE_IDS[2], 'Name', [block(uuid(102), 'quest_dialog', { input: { captures: 'vorname' } })]);
}
function ratingPage(seed = 200): FunnelPage {
  return page(PAGE_IDS[3 + (seed % 10)], 'Rating', [block(uuid(seed), 'quest_rating', {})]);
}
function leadPage(): FunnelPage {
  return page(PAGE_IDS[29], 'Lead', [block(uuid(300), 'quest_lead', {})]);
}

function linearQuest(): FunnelPage[] {
  return [
    welcomePage(),
    spinnerPage(),
    vornamePage(),
    page(PAGE_IDS[4], 'Scene 1', [block(uuid(11), 'quest_scene', {})]),
    page(PAGE_IDS[5], 'Scene 2', [block(uuid(12), 'quest_scene', {})]),
    ratingPage(201),
    ratingPage(202),
    leadPage(),
  ];
}

// ─── validateBranching ────────────────────────────────────────────────────────

describe('validateBranching', () => {
  test('lineare Quest → ok', () => {
    expect(validateBranching(linearQuest())).toEqual({ ok: true });
  });

  test('2-Branch + Reconverge → ok', () => {
    const decisionPage = page(PAGE_IDS[10], 'Choice', [
      block(uuid(20), 'quest_decision', {
        question: 'Was tun?',
        options: [
          { id: uuid(21), text: 'A', targetPageId: PAGE_IDS[11] },
          { id: uuid(22), text: 'B', targetPageId: PAGE_IDS[12] },
        ],
      }),
    ]);
    const branchA = page(PAGE_IDS[11], 'Branch A', [block(uuid(23), 'quest_scene', {})], { nextPageId: PAGE_IDS[13] });
    const branchB = page(PAGE_IDS[12], 'Branch B', [block(uuid(24), 'quest_scene', {})], { nextPageId: PAGE_IDS[13] });
    const converge = page(PAGE_IDS[13], 'Converge', [block(uuid(25), 'quest_scene', {})]);

    const pages: FunnelPage[] = [
      welcomePage(),
      spinnerPage(),
      vornamePage(),
      decisionPage,
      branchA,
      branchB,
      converge,
      ratingPage(201),
      ratingPage(202),
      leadPage(),
    ];
    expect(validateBranching(pages)).toEqual({ ok: true });
  });

  test('targetPageId zeigt auf nicht-existente UUID → reject', () => {
    const bad = page(PAGE_IDS[10], 'Choice', [
      block(uuid(20), 'quest_decision', {
        options: [{ id: uuid(21), text: 'A', targetPageId: uuid(999) }],
      }),
    ]);
    const pages = [welcomePage(), spinnerPage(), vornamePage(), bad, leadPage()];
    const result = validateBranching(pages);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unbekannte Page/);
  });

  test('Zyklus → reject', () => {
    // Decision mit zwei Optionen: eine führt in Zyklus A→B→A, die andere
    // direkt zur Lead-Page. Dadurch sind alle Pages reachable und es gibt
    // eine Lead-Page — Cycle-Detection ist der einzige Grund zum Fehlschlag.
    const a = page(PAGE_IDS[10], 'A', [
      block(uuid(20), 'quest_decision', {
        options: [
          { id: uuid(30), text: 'cycle', targetPageId: PAGE_IDS[11] },
          { id: uuid(31), text: 'exit', targetPageId: PAGE_IDS[29] },
        ],
      }),
    ]);
    const b = page(PAGE_IDS[11], 'B', [block(uuid(21), 'quest_scene', {})], { nextPageId: PAGE_IDS[10] });
    const pages = [welcomePage(), spinnerPage(), vornamePage(), a, b, leadPage()];
    const result = validateBranching(pages);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Zyklus/);
  });

  test('Orphan-Page → reject', () => {
    // Eine Page, die niemand referenziert. Wir setzen explizit nextPageId auf
    // die Lead-Page, damit der Default-Fallthrough sie nicht erreicht.
    const orphan = page(PAGE_IDS[20], 'Orphan', [block(uuid(50), 'quest_scene', {})]);
    const sceneBeforeLead = page(PAGE_IDS[10], 'Last Scene', [block(uuid(11), 'quest_scene', {})], {
      nextPageId: PAGE_IDS[29], // springt direkt zur Lead-Page, überspringt orphan
    });
    const pages = [
      welcomePage(),
      spinnerPage(),
      vornamePage(),
      sceneBeforeLead,
      orphan, // wird von niemand erreicht
      leadPage(),
    ];
    const result = validateBranching(pages);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Orphan/);
  });

  test('keine Lead-Page → reject', () => {
    const pages = [welcomePage(), spinnerPage(), vornamePage(), page(PAGE_IDS[10], 'Scene', [block(uuid(20), 'quest_scene', {})])];
    const result = validateBranching(pages);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/quest_lead/);
  });
});

// ─── Fixed-Page-Detektoren ────────────────────────────────────────────────────

describe('Fixed-Page-Detektoren', () => {
  test('isWelcomePage erkennt nur quest_scene mit hideLocationHint', () => {
    expect(isWelcomePage(welcomePage())).toBe(true);
    expect(isWelcomePage(page('x', 'X', [block('b', 'quest_scene', {})]))).toBe(false); // ohne hideLocationHint
    expect(isWelcomePage(spinnerPage())).toBe(false);
  });

  test('isSpinnerPage erkennt quest_spinner-Block', () => {
    expect(isSpinnerPage(spinnerPage())).toBe(true);
    expect(isSpinnerPage(welcomePage())).toBe(false);
  });

  test('isVornamePage erkennt input.captures="vorname"', () => {
    expect(isVornamePage(vornamePage())).toBe(true);
    const dialogOhneInput = page('x', 'X', [block('b', 'quest_dialog', { lines: [] })]);
    expect(isVornamePage(dialogOhneInput)).toBe(false);
  });

  test('isRatingPage und isLeadPage', () => {
    expect(isRatingPage(ratingPage(201))).toBe(true);
    expect(isLeadPage(leadPage())).toBe(true);
    expect(isRatingPage(leadPage())).toBe(false);
    expect(isLeadPage(ratingPage(202))).toBe(false);
  });
});

// ─── runDialogPass — End-to-End mit gemocktem aiChat ─────────────────────────

describe('runDialogPass', () => {
  test('opts.enabled=false → fallback ohne KI-Call', async () => {
    const pages = linearQuest();
    const result = await runDialogPass(pages, { beruf: 'X', companyName: 'Y', enabled: false });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(result.pages).toBe(pages);
    expect(aiChatMock).not.toHaveBeenCalled();
  });

  test('aiChat wirft AiError → fallback ai_error', async () => {
    aiChatMock.mockRejectedValueOnce(new AiError('boom', 'api_error'));
    const pages = linearQuest();
    const result = await runDialogPass(pages, { beruf: 'X', companyName: 'Y' });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe('ai_error');
    expect(result.pages).toBe(pages);
  });

  test('aiChat liefert non-JSON → fallback parse_error', async () => {
    aiChatMock.mockResolvedValueOnce('das ist kein JSON');
    const pages = linearQuest();
    const result = await runDialogPass(pages, { beruf: 'X', companyName: 'Y' });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe('parse_error');
  });

  test('aiChat mutiert Welcome-Page → fallback fixed_page_modified', async () => {
    const pages = linearQuest();
    const mutated = pages.map((p, i) =>
      i === 0 ? { ...p, name: 'Hacked!' } : p,
    );
    aiChatMock.mockResolvedValueOnce(JSON.stringify({ pages: mutated }));
    const result = await runDialogPass(pages, { beruf: 'X', companyName: 'Y' });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe('fixed_page_modified');
    expect(result.pages).toBe(pages);
  });

  test('aiChat liefert gültige Modifikation → applied=true', async () => {
    const pages = linearQuest();
    // KI gibt Pages 1:1 zurück (legitimer Fall: nichts umzuwandeln).
    aiChatMock.mockResolvedValueOnce(JSON.stringify({ pages }));
    const result = await runDialogPass(pages, { beruf: 'Pflegefachkraft', companyName: 'Test GmbH' });
    expect(result.applied).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.pages).toHaveLength(pages.length);
  });

  test('aiChat liefert Pages mit kaputtem Branching → fallback branching_invalid', async () => {
    const pages = linearQuest();
    // Wir fügen eine Decision mit einer targetPageId hinzu, die nicht existiert.
    const broken = pages.map((p, i) => {
      if (i !== 3) return p;
      return {
        ...p,
        nodes: [{
          id: uuid(500),
          kind: 'block' as const,
          type: 'quest_decision',
          props: {
            question: 'X?',
            options: [{ id: uuid(501), text: 'a', targetPageId: uuid(9999) }],
          },
        }],
      };
    });
    aiChatMock.mockResolvedValueOnce(JSON.stringify({ pages: broken }));
    const result = await runDialogPass(pages, { beruf: 'X', companyName: 'Y' });
    expect(result.applied).toBe(false);
    expect(result.reason).toBe('branching_invalid');
  });
});
