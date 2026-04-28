/**
 * Dialog-Pass — zweiter KI-Pass nach generate-quest.
 *
 * Scannt die fertig generierten JobQuest-Pages und wandelt dort, wo es
 * dramaturgisch hilft, abstrakte quest_scene + quest_decision-Kombis in
 * immersive quest_dialog + quest_decision-Kombis um. Sprecher sind echte
 * Personen (Bewohner, Patient, Angehörige, Kolleg:innen, Ärzt:innen,
 * Externe). Branching bleibt erhalten oder wird neu mit Reconvergence-
 * Pflicht erstellt.
 *
 * Der Pass ist konservativ und fehlertolerant: Bei jedem Validierungsfehler
 * wird auf die Original-Pages zurückgefallen. Telemetrie via console.error.
 */

import { z } from 'zod';
import { aiChat, AiError } from './ai-provider';
import type { FunnelPage, FunnelNode, BlockNode } from './funnel-types';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface DialogPassOptions {
  beruf: string;
  companyName: string;
  /** Default true. Set false to no-op (returns original pages unchanged). */
  enabled?: boolean;
}

export type DialogPassReason =
  | 'disabled'
  | 'ai_error'
  | 'parse_error'
  | 'validation_error'
  | 'fixed_page_modified'
  | 'branching_invalid'
  | 'truncated';

export interface DialogPassResult {
  pages: FunnelPage[];
  applied: boolean;
  reason?: DialogPassReason;
}

// ─── System-Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du bist Drehbuchautor für interaktive JobQuests im Pflege-/Care-Bereich.
Dir wird eine fertige JobQuest als JSON gegeben (alle IDs sind echte UUIDs).
Deine Aufgabe: Wandle dort, wo es die Story dramaturgisch verbessert,
abstrakte quest_scene + quest_decision-Kombis in immersive
quest_dialog + quest_decision-Kombis um, in denen echte Personen sprechen.

Wenn du KEINE sinnvolle Umwandlung findest: gib die Pages 1:1 unverändert zurück.

═══ FESTE SEITEN — NIEMALS ANFASSEN ═══
• Welcome-Seite (quest_scene mit hideLocationHint:true, meist Seite 0)
• Spinner-Seite (enthält quest_spinner-Block)
• Vornamen-Seite (quest_dialog mit input.captures="vorname")
• Beide quest_rating-Seiten am Ende
• quest_lead-Seite am Ende
Diese Seiten gehen 1:1 zurück: identische id, name, nodes, nextPageId,
hideLocationHint. KEINE Änderungen, auch nicht am Wording.

═══ TRIPEL-TEST FÜR UMWANDLUNG ═══
Wandle nur um, wenn ALLE drei Bedingungen erfüllt sind:
1. Die Szene führt zu einer quest_decision mit echtem moralischen oder
   pflegerischen Gewicht (nicht nur "wo gehe ich als Nächstes hin").
2. Es gibt mindestens eine konkret benennbare Person in der Situation
   (Bewohner:in, Patient:in, Angehörige:r, Kolleg:in, Ärzt:in, externe Person).
3. Die Person könnte realistisch SPRECHEN — z.B. um Hilfe bitten, klagen,
   widersprechen, dich konfrontieren.

NICHT umwandeln (lasse als reine quest_scene):
• Faktische Tag-Eröffnungen ("Du betrittst die Station…")
• Reine Ortswechsel / Übergänge zwischen Aufgaben
• Konvergenzseiten nach Branching (sollen neutral bleiben)
• Quiz/Hotspot/Zuordnung-Seiten — die fasst du nie an

═══ SPRECHER-AUSWAHL ═══
Wähle den Sprecher, der zur Situation passt:
• Bewohner:in / Patient:in — Pflege, Wohlbefinden, Wunsch
• Angehörige:r — Kommunikation nach außen, Konflikt
• Kolleg:in — Teamarbeit, Übergabe, Anweisung
• Ärzt:in — Medikation, Diagnose, Anordnung
• Externe (Lieferdienst, Therapeut:in, etc.) — situativ

Eigennamen, die schon früher in der Quest auftauchen, BEHALTE bei
(Story-Kohärenz). Wenn neuer Charakter nötig: realistischer deutscher
Vorname plus Rolle, z.B. "Herr Berger (Bewohner)".

═══ DIALOG-FORMAT ═══
quest_dialog props: { lines: [...] }
• 3–5 lines pro Dialog. Position "left" = Gegenüber, "right" = @vorname,
  "center" = Erzähler-Regie (KEIN Sprecher, KEINE User-Aktion vorwegnehmen).
• @vorname mindestens einmal verwenden, damit es persönlich wird.
• Die Dialog-Zeilen sollen die SITUATION aufbauen, NICHT die Frage stellen —
  die Frage steht weiterhin in der nachfolgenden quest_decision.
• KEINE choices und KEIN input im umgewandelten Dialog (Dialog-choices
  sind nur für reine Reaktionen, hier nicht nötig — die Wahl kommt in
  der quest_decision direkt danach).

═══ BRANCHING-PFLICHT ═══
Wenn du eine quest_decision umwandelst, die schon Branching hat
(unterschiedliche targetPageId pro Option), BEHALTE das Branching exakt:
• Jede Option behält ihre targetPageId, isWrong, reaction, emoji.
• Die Folgeseiten der Pfade fasst du NICHT an.

Wenn du eine NEUE Verzweigung erfindest (z.B. weil eine quest_scene mit
linearer Folgeseite jetzt zwei sinnvolle Reaktionen hat), MUSST du:
1. Pro neuer Option mindestens 2 neue Seiten als Pfad einfügen.
2. Beide Pfade zu einer existierenden oder neu eingefügten Konvergenz-
   seite führen.
3. Auf der letzten Seite des "kürzeren" Pfads nextPageId der Konvergenz-
   seite setzen, damit längere Pfade übersprungen werden.
4. Für jede NEUE Seite/jeden NEUEN Block/jede NEUE Option eine neue UUID
   generieren (Format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
ID-Erhalt: Seiten/Blöcke/Optionen, die du nicht änderst, behalten ihre id.

═══ QUALITÄT ═══
• Keine Großschreibung ganzer Wörter, keine Klischees.
• Dialog-Zeilen kurz: 1–2 Sätze, lebendig, mit echtem Subtext.
• Bewohner sprechen wie echte Menschen, nicht wie Lehrbuchpatienten.
• Erzähler-Zeilen (center) NIE eine Wahl/Haltung des Users vorwegnehmen.

═══ AUSGABE ═══
Antworte NUR mit validem JSON, kein Markdown:
{ "pages": [ ... vollständige neue Pages-Liste, gleiche Reihenfolge ... ] }`;

// ─── Zod-Schemas (Layer 1) ───────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const UuidString = z.string().regex(UUID_REGEX, 'erwartet UUID v4');

const PassNodeSchema = z.object({
  id: UuidString,
  kind: z.literal('block'),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
}).passthrough();

const PassPageSchema = z.object({
  id: UuidString,
  name: z.string().min(1),
  nodes: z.array(PassNodeSchema).min(1),
  nextPageId: UuidString.optional(),
  hideLocationHint: z.boolean().optional(),
}).passthrough();

const PassResultSchema = z.object({ pages: z.array(PassPageSchema).min(5) });

// ─── Fixed-Page-Detektoren (Layer 2) ─────────────────────────────────────────

function blocksOf(page: FunnelPage): BlockNode[] {
  const out: BlockNode[] = [];
  const walk = (nodes: FunnelNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'block') out.push(n);
      else if (n.kind === 'layout') for (const c of n.columns) walk(c.nodes);
    }
  };
  walk(page.nodes);
  return out;
}

export function isWelcomePage(p: FunnelPage): boolean {
  if (!p.hideLocationHint) return false;
  const blocks = blocksOf(p);
  return blocks.length > 0 && blocks[0].type === 'quest_scene';
}

export function isSpinnerPage(p: FunnelPage): boolean {
  return blocksOf(p).some((b) => b.type === 'quest_spinner');
}

export function isVornamePage(p: FunnelPage): boolean {
  return blocksOf(p).some((b) => {
    if (b.type !== 'quest_dialog') return false;
    const input = (b.props as { input?: { captures?: unknown } }).input;
    return input?.captures === 'vorname';
  });
}

export function isRatingPage(p: FunnelPage): boolean {
  return blocksOf(p).some((b) => b.type === 'quest_rating');
}

export function isLeadPage(p: FunnelPage): boolean {
  return blocksOf(p).some((b) => b.type === 'quest_lead');
}

function isFixedPage(p: FunnelPage): boolean {
  return isWelcomePage(p) || isSpinnerPage(p) || isVornamePage(p)
      || isRatingPage(p) || isLeadPage(p);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function checkFixedPagesPreserved(original: FunnelPage[], modified: FunnelPage[]): { ok: true } | { ok: false; pageId: string } {
  const modById = new Map(modified.map((p) => [p.id, p]));
  for (const orig of original) {
    if (!isFixedPage(orig)) continue;
    const mod = modById.get(orig.id);
    if (!mod) return { ok: false, pageId: orig.id };
    if (orig.name !== mod.name) return { ok: false, pageId: orig.id };
    if (orig.nextPageId !== mod.nextPageId) return { ok: false, pageId: orig.id };
    if ((orig.hideLocationHint ?? false) !== (mod.hideLocationHint ?? false)) return { ok: false, pageId: orig.id };
    if (!deepEqual(orig.nodes, mod.nodes)) return { ok: false, pageId: orig.id };
  }
  return { ok: true };
}

// ─── Branching-Invarianten (Layer 3) ─────────────────────────────────────────

interface DecisionOptionLite { targetPageId?: string }

function getDecisionOptions(page: FunnelPage): DecisionOptionLite[][] {
  return blocksOf(page)
    .filter((b) => b.type === 'quest_decision')
    .map((b) => {
      const opts = (b.props as { options?: unknown }).options;
      return Array.isArray(opts) ? (opts as DecisionOptionLite[]) : [];
    });
}

export function validateBranching(pages: FunnelPage[]): { ok: true } | { ok: false; error: string } {
  if (pages.length === 0) return { ok: false, error: 'pages_empty' };

  const idSet = new Set(pages.map((p) => p.id));
  const idIndex = new Map(pages.map((p, i) => [p.id, i]));

  // 1. Alle nextPageId/targetPageId zeigen auf existierende Pages
  for (const page of pages) {
    if (page.nextPageId && !idSet.has(page.nextPageId)) {
      return { ok: false, error: `nextPageId verweist auf unbekannte Page: ${page.nextPageId}` };
    }
    for (const opts of getDecisionOptions(page)) {
      for (const opt of opts) {
        if (opt.targetPageId && !idSet.has(opt.targetPageId)) {
          return { ok: false, error: `targetPageId verweist auf unbekannte Page: ${opt.targetPageId}` };
        }
      }
    }
  }

  // 2. Alle Pages erreichbar von Page[0] (DFS)
  const reachable = new Set<string>();
  const stack = [pages[0].id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    const page = pages[idIndex.get(cur)!];

    // Nachfolger-IDs sammeln: explizites nextPageId ODER nächste Page in der Liste
    // (außer wir sind auf einer Decision-Page → dann nur targetPageIds folgen)
    const optionTargets: string[] = [];
    for (const opts of getDecisionOptions(page)) {
      for (const opt of opts) if (opt.targetPageId) optionTargets.push(opt.targetPageId);
    }

    if (optionTargets.length > 0) {
      // Decision-Page: jede Option kann ihren eigenen Pfad haben
      for (const t of optionTargets) stack.push(t);
      // Falls die Decision-Page selbst ein nextPageId hat (für Optionen ohne targetPageId)
      if (page.nextPageId) stack.push(page.nextPageId);
      else if (idIndex.get(cur)! + 1 < pages.length) stack.push(pages[idIndex.get(cur)! + 1].id);
    } else if (page.nextPageId) {
      stack.push(page.nextPageId);
    } else {
      // Default: nächste Page in der Liste
      const nextIdx = idIndex.get(cur)! + 1;
      if (nextIdx < pages.length) stack.push(pages[nextIdx].id);
    }
  }
  for (const p of pages) {
    if (!reachable.has(p.id)) {
      return { ok: false, error: `Orphan-Page: ${p.id}` };
    }
  }

  // 3. Keine Zyklen (DFS pro Pfad mit Visited-Set)
  const cycleResult = detectCycle(pages, idIndex);
  if (!cycleResult.ok) return cycleResult;

  // 4. Lead-Page existiert und ist letzte erreichbare Page auf jedem Pfad
  const leadPages = pages.filter(isLeadPage);
  if (leadPages.length === 0) return { ok: false, error: 'keine quest_lead-Page' };

  return { ok: true };
}

function detectCycle(pages: FunnelPage[], idIndex: Map<string, number>): { ok: true } | { ok: false; error: string } {
  // DFS mit „grau"/„schwarz" — klassische Zyklus-Erkennung
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const p of pages) color.set(p.id, WHITE);

  function neighbors(pageId: string): string[] {
    const idx = idIndex.get(pageId)!;
    const page = pages[idx];
    const out: string[] = [];
    const optionTargets: string[] = [];
    for (const opts of getDecisionOptions(page)) {
      for (const opt of opts) if (opt.targetPageId) optionTargets.push(opt.targetPageId);
    }
    if (optionTargets.length > 0) {
      out.push(...optionTargets);
      if (page.nextPageId) out.push(page.nextPageId);
      else if (idx + 1 < pages.length) out.push(pages[idx + 1].id);
    } else if (page.nextPageId) {
      out.push(page.nextPageId);
    } else if (idx + 1 < pages.length) {
      out.push(pages[idx + 1].id);
    }
    return out;
  }

  function dfs(pageId: string): string | null {
    color.set(pageId, GRAY);
    for (const next of neighbors(pageId)) {
      const c = color.get(next);
      if (c === GRAY) return next;
      if (c === WHITE) {
        const cycle = dfs(next);
        if (cycle) return cycle;
      }
    }
    color.set(pageId, BLACK);
    return null;
  }

  for (const p of pages) {
    if (color.get(p.id) === WHITE) {
      const cycle = dfs(p.id);
      if (cycle) return { ok: false, error: `Zyklus erkannt bei Page: ${cycle}` };
    }
  }
  return { ok: true };
}

// ─── JSON-Extraktion (geteilt mit refine-quest) ──────────────────────────────

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function fallback(pages: FunnelPage[], reason: DialogPassReason): DialogPassResult {
  return { pages, applied: false, reason };
}

export async function runDialogPass(
  pages: FunnelPage[],
  opts: DialogPassOptions,
): Promise<DialogPassResult> {
  if (opts.enabled === false) return fallback(pages, 'disabled');

  const userMessage = `══ KONTEXT ══

Beruf: ${opts.beruf}
Unternehmen: ${opts.companyName}

══ AKTUELLE JOBQUEST (JSON) ══

${JSON.stringify(pages, null, 2).slice(0, 80000)}`;

  let rawText: string;
  try {
    rawText = await aiChat({
      system: SYSTEM_PROMPT,
      user: userMessage,
      // Niedrige Temperatur — der Pass soll konservativ sein und nicht
      // halluzinieren, sondern punktuell verbessern.
      temperature: 0.3,
      json: true,
    });
  } catch (err) {
    console.error('[dialog-pass] AI error:', err);
    if (err instanceof AiError && err.code === 'truncated') return fallback(pages, 'truncated');
    return fallback(pages, 'ai_error');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonObject(rawText));
  } catch (err) {
    console.error(
      '[dialog-pass] JSON parse failed, length=', rawText.length,
      'first200:', rawText.slice(0, 200),
      'last200:', rawText.slice(-200),
      err,
    );
    return fallback(pages, 'parse_error');
  }

  const validated = PassResultSchema.safeParse(parsedJson);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    console.error('[dialog-pass] Zod validation failed:', issue?.path.join('.'), issue?.message);
    return fallback(pages, 'validation_error');
  }

  const modifiedPages = validated.data.pages as unknown as FunnelPage[];

  const fixedCheck = checkFixedPagesPreserved(pages, modifiedPages);
  if (!fixedCheck.ok) {
    console.error('[dialog-pass] fixed page modified:', fixedCheck.pageId);
    return fallback(pages, 'fixed_page_modified');
  }

  const branching = validateBranching(modifiedPages);
  if (!branching.ok) {
    console.error('[dialog-pass] branching invalid:', branching.error);
    return fallback(pages, 'branching_invalid');
  }

  return { pages: modifiedPages, applied: true };
}
