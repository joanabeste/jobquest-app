import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';
import { diversifyDecisionIcons } from '@/lib/decision-icon-picker';

const RefineSchema = z.object({
  pages: z.array(z.record(z.string(), z.unknown())),
  dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
  // Bis 16 000 Zeichen — realistische Refine-Anweisungen mit vielen
  // Detailpunkten passen damit problemlos.
  instructions: z.string().min(1).max(16000),
});

const SYSTEM_PROMPT = `Du bist ein Experte fur interaktive Berufschecks. Dir wird ein bestehender Berufscheck als JSON gegeben (pages + dimensions) und Anderungswunsche vom Nutzer.

AUFGABE: Passe den bestehenden Check gemaess den Anderungswunschen an. Behalte alles bei, was nicht explizit geandert werden soll.

REGELN:
• Andere NUR das, was der Nutzer wunscht — alles andere bleibt exakt gleich.
• Behalte alle IDs (Seiten-IDs, Block-IDs, Dimensions-IDs, Options-IDs) bei.
• Fur NEUE Elemente: Generiere neue UUIDs.
• Behalte Dimensions-IDs in scores, sliderDimensionId, dimensionIds konsistent.
• Wenn neue Dimensionen hinzukommen: Generiere neue UUIDs dafur.
• Antworte NUR mit validem JSON — kein Markdown, keine Erklarungen.

AUSGABEFORMAT:
{
  "dimensions": [ ... ],   // Die vollstandige Dimensions-Liste (mit bestehenden IDs)
  "pages": [ ... ]          // Die vollstandige, angepasste Seitenliste
}`;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlussel nicht konfiguriert' }, { status: 500 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = RefineSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') || 'input';
    return NextResponse.json({
      error: `Eingabe ungültig (${path}): ${issue?.message ?? 'unbekannter Validierungsfehler'}`,
    }, { status: 400 });
  }

  const content = JSON.stringify({ dimensions: parsed.data.dimensions ?? [], pages: parsed.data.pages }, null, 2);
  const userMessage = `══ BESTEHENDER BERUFSCHECK (JSON) ══\n\n${content.slice(0, 60000)}\n\n══ ÄNDERUNGSWÜNSCHE ══\n\n${parsed.data.instructions}`;

  let rawText: string;
  try {
    rawText = await aiChat({ system: SYSTEM_PROMPT, user: userMessage, temperature: 0.4, json: true });
  } catch (err) {
    console.error('[refine-check] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  let result: { dimensions?: Array<Record<string, unknown>>; pages: Array<Record<string, unknown>> };
  try {
    result = JSON.parse(extractJsonObject(rawText));
  } catch (err) {
    console.error(
      '[refine-check] JSON parse failed, length=', rawText.length,
      'first200:', rawText.slice(0, 200),
      'last200:', rawText.slice(-200),
      err,
    );
    return NextResponse.json({
      error: 'KI-Antwort konnte nicht verarbeitet werden — vermutlich zu viele Änderungen auf einmal. Bitte teile deine Anweisungen in kleinere Schritte.',
    }, { status: 502 });
  }

  if (!result.pages?.length) {
    return NextResponse.json({ error: 'KI-Antwort unvollstandig.' }, { status: 502 });
  }

  // Defense-in-Depth gegen Duplikat-Icons in evtl. enthaltenen quest_decision-
  // Blöcken (Berufschecks nutzen primär check_*-Blöcke, der Pass läuft dort no-op).
  return NextResponse.json({
    pages: diversifyDecisionIconsInPages(result.pages),
    dimensions: result.dimensions ?? parsed.data.dimensions,
  });
}

type LooseNode = { type?: unknown; props?: Record<string, unknown> } & Record<string, unknown>;
type LoosePage = { nodes?: unknown } & Record<string, unknown>;

function diversifyDecisionIconsInPages(pages: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return pages.map((page) => {
    const p = page as LoosePage;
    if (!Array.isArray(p.nodes)) return page;
    const nodes = (p.nodes as LooseNode[]).map((node) => {
      if (node?.type !== 'quest_decision') return node;
      const props = node.props;
      if (!props || !Array.isArray(props.options)) return node;
      const diversified = diversifyDecisionIcons(props.options as Array<{ emoji?: string; isWrong?: boolean; text?: string }>);
      return { ...node, props: { ...props, options: diversified } };
    });
    return { ...page, nodes };
  });
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}
