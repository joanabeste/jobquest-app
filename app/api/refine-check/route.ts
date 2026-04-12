import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

const RefineSchema = z.object({
  pages: z.array(z.record(z.string(), z.unknown())),
  dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
  instructions: z.string().min(1).max(4000),
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
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }

  const content = JSON.stringify({ dimensions: parsed.data.dimensions ?? [], pages: parsed.data.pages }, null, 2);
  const userMessage = `══ BESTEHENDER BERUFSCHECK (JSON) ══\n\n${content.slice(0, 60000)}\n\n══ ÄNDERUNGSWÜNSCHE ══\n\n${parsed.data.instructions}`;

  let rawText: string;
  try {
    rawText = await aiChat({ system: SYSTEM_PROMPT, user: userMessage, temperature: 0.7, json: true });
  } catch (err) {
    console.error('[refine-check] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let result: { dimensions?: Array<Record<string, unknown>>; pages: Array<Record<string, unknown>> };
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('[refine-check] JSON parse failed, length=', rawText.length);
    return NextResponse.json({ error: 'KI-Antwort ungultig.' }, { status: 502 });
  }

  if (!result.pages?.length) {
    return NextResponse.json({ error: 'KI-Antwort unvollstandig.' }, { status: 502 });
  }

  return NextResponse.json({ pages: result.pages, dimensions: result.dimensions ?? parsed.data.dimensions });
}
