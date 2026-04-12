import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

const Schema = z.object({
  url: z.string().url().startsWith('https://'),
});

const SYSTEM_PROMPT = `Du extrahierst aus dem Text eines interaktiven Prototyps (z.B. Heyflow Berufscheck) ALLE genannten Ausbildungsberufe und Studiengange.

Antworte AUSSCHLIESSLICH mit validem JSON:
{
  "berufe": string[]
}

REGELN:
• Erfasse JEDEN Beruf und Studiengang der irgendwo im Text vorkommt.
• Verwende die offizielle deutsche Bezeichnung ohne (m/w/d).
• Keine Duplikate.
• Wenn nichts gefunden wird: leeres Array.`;

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI nicht konfiguriert' }, { status: 500 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungultige URL' }, { status: 400 });
  }

  // Fetch the prototype page — try assets bucket for Heyflow SPAs
  let textContent = '';
  try {
    const mainRes = await fetch(parsed.data.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobQuest/1.0)' },
    });
    if (!mainRes.ok) throw new Error(`HTTP ${mainRes.status}`);
    const mainHtml = await mainRes.text();

    const bucketMatch = mainHtml.match(/FLOW_BUCKET_URL\s*=\s*["']([^"']+)["']/);
    let contentHtml = mainHtml;

    if (bucketMatch) {
      const assetsUrl = `${bucketMatch[1]}/www/index.html`;
      const assetsRes = await fetch(assetsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobQuest/1.0)' },
      });
      if (assetsRes.ok) contentHtml = await assetsRes.text();
    }

    textContent = contentHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  } catch (err) {
    console.error('[extract-jobs-prototype] fetch failed', err);
    return NextResponse.json({ error: 'Seite konnte nicht geladen werden.' }, { status: 502 });
  }

  if (textContent.length < 30) {
    return NextResponse.json({ error: 'Zu wenig Inhalt gefunden.' }, { status: 400 });
  }

  try {
    const rawText = await aiChat({
      system: SYSTEM_PROMPT,
      user: textContent.slice(0, 16000),
      temperature: 0.1,
      json: true,
    });

    let jsonText = rawText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const result = JSON.parse(jsonText) as { berufe?: string[] };
    return NextResponse.json({ berufe: result.berufe ?? [] });
  } catch (err) {
    console.error('[extract-jobs-prototype] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Analyse fehlgeschlagen.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
