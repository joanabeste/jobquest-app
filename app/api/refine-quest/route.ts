import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

const RefineSchema = z.object({
  pages: z.array(z.record(z.string(), z.unknown())),
  // Bis 16 000 Zeichen — realistische Refine-Anweisungen mit vielen
  // Detailpunkten passen damit problemlos.
  instructions: z.string().min(1).max(16000),
});

const SYSTEM_PROMPT = `Du bist ein Experte fur interaktive JobQuests. Dir wird eine bestehende JobQuest als JSON gegeben und Anderungswunsche vom Nutzer.

AUFGABE: Passe die bestehende Quest gemaess den Anderungswunschen an. Behalte alles bei, was nicht explizit geandert werden soll.

REGELN:
• Andere NUR das, was der Nutzer wunscht — alles andere bleibt exakt gleich.
• Behalte alle IDs (Seiten-IDs, Block-IDs, Options-IDs) bei, die nicht geandert werden.
• Fur NEUE Seiten/Blocke/Optionen: Generiere neue UUIDs.
• Behalte die bestehende Seitenstruktur, Branching-Logik und nextPageId bei.
• Wenn der Nutzer neue Seiten will, fuge sie an der passenden Stelle ein.
• Wenn der Nutzer Seiten loschen will, entferne sie und passe Branching an.
• Antworte NUR mit validem JSON — kein Markdown, keine Erklarungen.

AUSGABEFORMAT:
{
  "pages": [ ... ]   // Die vollstandige, angepasste Seitenliste
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

  const pagesJson = JSON.stringify(parsed.data.pages, null, 2);
  const userMessage = `══ BESTEHENDE JOBQUEST (JSON) ══\n\n${pagesJson.slice(0, 60000)}\n\n══ ÄNDERUNGSWÜNSCHE ══\n\n${parsed.data.instructions}`;

  let rawText: string;
  try {
    rawText = await aiChat({ system: SYSTEM_PROMPT, user: userMessage, temperature: 0.7, json: true });
  } catch (err) {
    console.error('[refine-quest] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let result: { pages: Array<Record<string, unknown>> };
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error('[refine-quest] JSON parse failed, length=', rawText.length);
    return NextResponse.json({ error: 'KI-Antwort ungultig.' }, { status: 502 });
  }

  if (!result.pages?.length) {
    return NextResponse.json({ error: 'KI-Antwort unvollstandig.' }, { status: 502 });
  }

  return NextResponse.json({ pages: result.pages });
}
