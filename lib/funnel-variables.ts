/**
 * Dynamic variable system for funnel templates.
 *
 * Variables can be:
 *  - CONTEXT variables: always available (e.g. companyName from company profile)
 *  - BLOCK-PRODUCED variables: become available when a specific block type exists in the funnel
 *
 * To add a new variable:
 *  1. Add it to CONTEXT_VARIABLES (always available) OR
 *  2. Add the producing block type to BLOCK_VARIABLE_PRODUCERS
 *
 * That's it — it will automatically appear in all VarInput/VarTextarea pickers,
 * in the Inspector, in the EmailConfigModal, and be substituted in players.
 */

import type { FunnelNode } from './funnel-types';

export interface VariableDef {
  key: string;   // e.g. 'firstName' — used in templates as @firstName
  label: string; // e.g. 'Vorname'  — shown in the picker dropdown
}

// ─── Always-available context variables ───────────────────────────────────────
export const CONTEXT_VARIABLES: VariableDef[] = [
  { key: 'companyName', label: 'Firmenname' },
];

// ─── Variables produced by block types ────────────────────────────────────────
// Add new block types here when they collect or produce user data.
export const BLOCK_VARIABLE_PRODUCERS: Record<string, VariableDef[]> = {
  quest_vorname: [
    { key: 'firstName', label: 'Vorname' },
  ],
  check_vorname: [
    { key: 'firstName', label: 'Vorname' },
  ],
  quest_lead: [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName',  label: 'Nachname' },
    { key: 'email',     label: 'E-Mail-Adresse' },
    { key: 'phone',     label: 'Telefonnummer' },
  ],
  check_lead: [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName',  label: 'Nachname' },
    { key: 'email',     label: 'E-Mail-Adresse' },
    { key: 'phone',     label: 'Telefonnummer' },
  ],
  form_config: [
    { key: 'firstName', label: 'Vorname' },
    { key: 'lastName',  label: 'Nachname' },
    { key: 'email',     label: 'E-Mail-Adresse' },
    { key: 'phone',     label: 'Telefonnummer' },
  ],
};

// All known variable keys — used to prevent @word in real email addresses
// (e.g. "hr@firma.de" should NOT match if "firma" is not a variable key)
export const ALL_VAR_KEYS: ReadonlySet<string> = new Set([
  ...CONTEXT_VARIABLES.map((v) => v.key),
  ...Object.values(BLOCK_VARIABLE_PRODUCERS).flat().map((v) => v.key),
]);

// ─── Collect available variables from nodes + context ─────────────────────────
/**
 * Returns the deduplicated list of variables available in a funnel,
 * based on context variables + variables produced by the given nodes.
 */
export function getAvailableVariables(nodes: FunnelNode[]): VariableDef[] {
  const seen = new Set<string>();
  const vars: VariableDef[] = [];

  for (const v of CONTEXT_VARIABLES) {
    if (!seen.has(v.key)) { seen.add(v.key); vars.push(v); }
  }

  // Flatten layout columns, collect only block nodes
  const blockNodes = nodes.flatMap((n) =>
    n.kind === 'layout' ? n.columns.flatMap((c) => c.nodes).filter((cn) => cn.kind === 'block') : [n],
  ).filter((n): n is import('./funnel-types').BlockNode => n.kind === 'block');

  for (const node of blockNodes) {
    for (const v of BLOCK_VARIABLE_PRODUCERS[node.type] ?? []) {
      if (!seen.has(v.key)) { seen.add(v.key); vars.push(v); }
    }
  }
  return vars;
}

// ─── Template substitution ────────────────────────────────────────────────────
/**
 * Replaces @key patterns in a template string with values from vars.
 * Only substitutes known variable keys to avoid collisions with
 * real email addresses (e.g. "hr@firma.de" stays untouched).
 * Also handles legacy {{key}} syntax for backwards compatibility.
 */
export function applyVars(template: string, vars: Record<string, string>): string {
  return template
    .replace(/@(\w+)/g, (match, key) =>
      ALL_VAR_KEYS.has(key) ? (vars[key] ?? '') : match,
    )
    .replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? vars[legacyKeyMap[key] ?? ''] ?? '');
}

// Legacy key mapping for {{company}} → companyName, {{name}} → firstName
const legacyKeyMap: Record<string, string> = {
  company: 'companyName',
  name: 'firstName',
};
