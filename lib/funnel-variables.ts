/**
 * Dynamic variable system for funnel templates.
 *
 * Variables can be:
 *  - CONTEXT variables: always available (e.g. companyName from company profile)
 *  - BLOCK-PRODUCED variables: become available when a specific block type exists in the funnel
 *  - FIELD variables: derived from the actual LeadFieldDef fields in lead/form blocks
 *
 * To add a new always-available variable: add it to CONTEXT_VARIABLES.
 * Field variables are extracted automatically from quest_lead / check_lead / form_config / form_step blocks.
 */

import type { FunnelNode } from './funnel-types';

export interface VariableDef {
  key: string;   // e.g. 'firstName' — used in templates as @firstName
  label: string; // e.g. 'Vorname'  — shown in the picker dropdown
}

// ─── Variables available in E-Mail templates ─────────────────────────────────
// Must exactly match the `vars` object built in lib/api/submit-lead-handler.ts.
// These are the ONLY keys that are substituted at email send time.
export const EMAIL_VARIABLES: VariableDef[] = [
  { key: 'firstName',        label: 'Vorname'       },
  { key: 'lastName',         label: 'Nachname'      },
  { key: 'email',            label: 'E-Mail'        },
  { key: 'phone',            label: 'Telefon'       },
  { key: 'companyName',      label: 'Firmenname'    },
  { key: 'karriereseiteUrl', label: 'Karriereseite' },
];

/**
 * Returns the list of variables available in E-Mail templates, filtered to
 * those that will actually be substituted at send time.
 *  - firstName / lastName / email / phone are always available (lead form fields).
 *  - companyName / karriereseiteUrl are only included when the company profile
 *    actually has a non-empty value for them.
 */
export function getEmailVariables(companyContext: Record<string, string> = {}): VariableDef[] {
  return EMAIL_VARIABLES.filter((v) => {
    if (v.key === 'companyName' || v.key === 'karriereseiteUrl') {
      return !!companyContext[v.key];
    }
    return true;
  });
}

// ─── Always-available context variables ───────────────────────────────────────
// Only non-empty values from the company profile are included.
// vorname is NOT here — it's picked up dynamically from quest_dialog blocks.
export const CONTEXT_VARIABLE_DEFS: { key: string; label: string }[] = [
  { key: 'companyName',    label: 'Firmenname'      },
  { key: 'datenschutzUrl', label: 'Datenschutz-URL' },
  { key: 'impressumUrl',   label: 'Impressum-URL'   },
  { key: 'karriereseiteUrl', label: 'Karriereseite' },
];

/**
 * Build the list of always-available context variables, filtered to only
 * those that are actually set (non-empty) in the company profile.
 * Pass an empty object to include none (e.g. when company data isn't available).
 */
export function getContextVariables(companyContext: Record<string, string> = {}): VariableDef[] {
  return CONTEXT_VARIABLE_DEFS
    .filter((def) => !!companyContext[def.key])
    .map((def) => ({ key: def.key, label: def.label }));
}

// Legacy export for code that doesn't yet pass company context
export const CONTEXT_VARIABLES: VariableDef[] = CONTEXT_VARIABLE_DEFS.map((d) => ({ key: d.key, label: d.label }));

// ─── Label → variable-key conversion ─────────────────────────────────────────
/**
 * Converts a field label to a safe variable key.
 * "Vorname"          → "vorname"
 * "E-Mail-Adresse"   → "email_adresse"
 * "Mein Feld Nr. 1"  → "mein_feld_nr_1"
 */
export function slugifyVar(label: string): string {
  const result = label
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, '_');
  return result || 'feld';
}

/**
 * Derives a deduplicated variable key map for a list of fields.
 * If two fields produce the same base key (e.g. two "Vorname" fields),
 * they get _1 / _2 suffixes.
 * Checkbox fields and fields without a label are excluded.
 *
 * Returns: Map<fieldId, variableKey>
 */
export function deriveFieldVarMap(
  fields: Array<{ id: string; label: string; type: string }>,
): Map<string, string> {
  const result = new Map<string, string>();

  // First pass: collect base key and order per base
  const baseGroups = new Map<string, string[]>(); // base → [fieldId, …]
  for (const f of fields) {
    if (f.type === 'checkbox' || !f.label) continue;
    // Strip HTML tags from label (checkbox labels can be HTML)
    const plainLabel = f.label.replace(/<[^>]*>/g, '').trim();
    const base = slugifyVar(plainLabel);
    const group = baseGroups.get(base) ?? [];
    group.push(f.id);
    baseGroups.set(base, group);
  }

  // Second pass: assign keys (with suffix when there are dupes)
  for (const [base, ids] of baseGroups) {
    if (ids.length === 1) {
      result.set(ids[0], base);
    } else {
      ids.forEach((id, i) => result.set(id, `${base}_${i + 1}`));
    }
  }

  return result;
}

// ─── Variables produced by simple block types (no fields array) ───────────────
// check_vorname still uses a dedicated input block (BerufsCheck flow).
export const BLOCK_VARIABLE_PRODUCERS: Record<string, VariableDef[]> = {
  check_vorname: [
    { key: 'vorname', label: 'Vorname' },
  ],
};

// Block types that carry a `fields` array of LeadFieldDef — variables are
// extracted dynamically from those fields at runtime.
const FIELD_CARRIER_BLOCKS = new Set([
  'quest_lead', 'check_lead', 'form_config', 'form_step',
]);

// ─── Static key whitelist for applyVars (base + common field names) ───────────
// Custom field variables are whitelisted via the `vars` argument in applyVars.
export const ALL_VAR_KEYS: ReadonlySet<string> = new Set([
  ...CONTEXT_VARIABLES.map((v) => v.key),
  ...Object.values(BLOCK_VARIABLE_PRODUCERS).flat().map((v) => v.key),
]);

// ─── Collect available variables from nodes + context ─────────────────────────
/**
 * Returns the deduplicated list of variables available in a funnel,
 * derived from company context + actual field/dialog definitions in blocks.
 * Only includes context variables whose values are non-empty in companyContext.
 */
export function getAvailableVariables(nodes: FunnelNode[], companyContext: Record<string, string> = {}): VariableDef[] {
  const seen = new Set<string>();
  const vars: VariableDef[] = [];

  function add(v: VariableDef) {
    if (!seen.has(v.key)) { seen.add(v.key); vars.push(v); }
  }

  for (const v of getContextVariables(companyContext)) add(v);

  // Flatten layout columns → collect block nodes
  const blockNodes = nodes.flatMap((n) =>
    n.kind === 'layout'
      ? n.columns.flatMap((c) => c.nodes).filter((cn) => cn.kind === 'block')
      : [n],
  ).filter((n): n is import('./funnel-types').BlockNode => n.kind === 'block');

  for (const node of blockNodes) {
    if (node.type === 'quest_dialog') {
      const rawInput = (node.props?.input as { captures?: string } | undefined);
      if (rawInput?.captures) {
        add({ key: rawInput.captures, label: rawInput.captures });
      }
    } else if (FIELD_CARRIER_BLOCKS.has(node.type)) {
      // Derive variables dynamically from actual field labels with deduplication
      const rawFields = (node.props?.fields ?? []) as Array<{
        id: string;
        label?: string;
        type?: string;
      }>;
      const fields = rawFields.map((f) => ({
        id: f.id,
        label: f.label ?? '',
        type: f.type ?? 'text',
      }));
      const varMap = deriveFieldVarMap(fields);
      for (const f of fields) {
        const key = varMap.get(f.id);
        if (!key) continue; // checkbox fields have no entry
        // Strip HTML from label for the display label
        const plainLabel = f.label.replace(/<[^>]*>/g, '').trim() || key;
        add({ key, label: plainLabel });
      }
    } else {
      // Simple blocks that produce variables (e.g. check_vorname)
      for (const v of BLOCK_VARIABLE_PRODUCERS[node.type] ?? []) add(v);
    }
  }

  return vars;
}

// ─── Template substitution ────────────────────────────────────────────────────
/**
 * Replaces @key patterns in a template string with values from vars.
 * Substitutes if the key is in the static whitelist OR is present in `vars`
 * (which covers custom field variables).
 * Also handles legacy {{key}} syntax for backwards compatibility.
 */
export function applyVars(template: string, vars: Record<string, string>): string {
  return template
    .replace(/@(\w+)/g, (match, key) =>
      key in vars ? vars[key] : match,
    )
    .replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? vars[legacyKeyMap[key] ?? ''] ?? '');
}

// Legacy key mapping for {{company}} → companyName, {{name}} → firstName
const legacyKeyMap: Record<string, string> = {
  company: 'companyName',
  name: 'firstName',
};

/**
 * Strips name-placeholder segments (", @firstName" / ", {{name}}") from a
 * headline when no firstName is available, so "Dein Ergebnis, @firstName!"
 * degrades to "Dein Ergebnis!" instead of "Dein Ergebnis, dir!".
 */
export function stripNamePlaceholder(template: string): string {
  return template.replace(/,?\s*(?:@firstName|\{\{name\}\})/g, '');
}
