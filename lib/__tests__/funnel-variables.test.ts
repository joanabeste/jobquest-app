import { applyVars, getAvailableVariables, CONTEXT_VARIABLES, ALL_VAR_KEYS } from '../funnel-variables';
import type { BlockNode, FunnelNode } from '../funnel-types';

// ─── applyVars ────────────────────────────────────────────────────────────────

describe('applyVars', () => {
  const vars = {
    companyName: 'Acme GmbH',
    firstName: 'Max',
    email: 'max@acme.de',
    datenschutzUrl: 'https://acme.de/privacy',
    impressumUrl: 'https://acme.de/imprint',
  };

  test('substitutes a known @variable', () => {
    expect(applyVars('Hallo @firstName!', vars)).toBe('Hallo Max!');
  });

  test('substitutes multiple variables', () => {
    expect(applyVars('@firstName, willkommen bei @companyName', vars)).toBe(
      'Max, willkommen bei Acme GmbH',
    );
  });

  test('leaves unknown @word untouched', () => {
    // @firma is not a known variable key
    expect(applyVars('hr@firma.de', vars)).toBe('hr@firma.de');
  });

  test('replaces with empty string when variable has no value', () => {
    expect(applyVars('Hallo @firstName!', {})).toBe('Hallo !');
  });

  test('handles legacy {{company}} syntax', () => {
    expect(applyVars('Willkommen bei {{company}}!', vars)).toBe('Willkommen bei Acme GmbH!');
  });

  test('handles legacy {{name}} syntax', () => {
    expect(applyVars('Hallo {{name}}!', vars)).toBe('Hallo Max!');
  });

  test('handles @datenschutzUrl in href attributes', () => {
    const template = '<a href="@datenschutzUrl">Datenschutz</a>';
    expect(applyVars(template, vars)).toBe(
      '<a href="https://acme.de/privacy">Datenschutz</a>',
    );
  });

  test('empty template returns empty string', () => {
    expect(applyVars('', vars)).toBe('');
  });

  test('template with no variables is returned unchanged', () => {
    expect(applyVars('Kein Platzhalter hier.', vars)).toBe('Kein Platzhalter hier.');
  });
});

// ─── ALL_VAR_KEYS ─────────────────────────────────────────────────────────────

describe('ALL_VAR_KEYS', () => {
  test('contains all context variable keys', () => {
    for (const v of CONTEXT_VARIABLES) {
      expect(ALL_VAR_KEYS.has(v.key)).toBe(true);
    }
  });

  test('contains firstName, lastName, email, phone (from block producers)', () => {
    for (const key of ['firstName', 'lastName', 'email', 'phone']) {
      expect(ALL_VAR_KEYS.has(key)).toBe(true);
    }
  });

  test('does not contain arbitrary words', () => {
    expect(ALL_VAR_KEYS.has('firma')).toBe(false);
    expect(ALL_VAR_KEYS.has('name')).toBe(false); // legacy alias, not a direct key
  });
});

// ─── getAvailableVariables ────────────────────────────────────────────────────

function block(id: string, type: string): BlockNode {
  return { id, kind: 'block', type: type as BlockNode['type'], props: {} };
}

describe('getAvailableVariables', () => {
  test('always includes context variables', () => {
    const vars = getAvailableVariables([]);
    const keys = vars.map((v) => v.key);
    expect(keys).toContain('companyName');
    expect(keys).toContain('datenschutzUrl');
    expect(keys).toContain('impressumUrl');
  });

  test('adds firstName when quest_vorname block is present', () => {
    const vars = getAvailableVariables([block('b1', 'quest_vorname')]);
    expect(vars.map((v) => v.key)).toContain('firstName');
  });

  test('adds lead fields when quest_lead block is present', () => {
    const vars = getAvailableVariables([block('b1', 'quest_lead')]);
    const keys = vars.map((v) => v.key);
    expect(keys).toContain('firstName');
    expect(keys).toContain('lastName');
    expect(keys).toContain('email');
    expect(keys).toContain('phone');
  });

  test('deduplicates variables when multiple producers provide the same key', () => {
    const nodes: FunnelNode[] = [
      block('b1', 'quest_vorname'),
      block('b2', 'quest_lead'),
    ];
    const vars = getAvailableVariables(nodes);
    const firstNameCount = vars.filter((v) => v.key === 'firstName').length;
    expect(firstNameCount).toBe(1);
  });

  test('returns only context variables for unknown block types', () => {
    const vars = getAvailableVariables([block('b1', 'heading')]);
    expect(vars).toHaveLength(CONTEXT_VARIABLES.length);
  });

  test('handles layout nodes by descending into columns', () => {
    const nodes: FunnelNode[] = [{
      id: 'layout1',
      kind: 'layout',
      columns: [
        { id: 'col1', nodes: [block('b1', 'quest_vorname')] },
        { id: 'col2', nodes: [] },
      ],
    }];
    const vars = getAvailableVariables(nodes);
    expect(vars.map((v) => v.key)).toContain('firstName');
  });
});
