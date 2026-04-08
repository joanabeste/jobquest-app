import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getSession, unauthorized } from '@/lib/api-auth';
import { safeFetch, isSafePublicUrl } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_SUBPAGES = 3;

async function fetchHtml(url: string): Promise<string | null> {
  const res = await safeFetch(url, { maxBytes: MAX_HTML_BYTES, timeoutMs: FETCH_TIMEOUT_MS });
  if (!res || !res.contentType.toLowerCase().includes('html')) return null;
  return res.buffer.toString('utf8');
}

interface PageContent {
  url: string;
  title?: string;
  body: string;
}

function extractText(html: string, baseUrl: URL): { text: string; title?: string; subLinks: string[] } {
  const $ = cheerio.load(html);
  const title = $('title').text().trim() || undefined;

  // Collect candidate sub-links related to ausbildung/studium/karriere BEFORE removing nav.
  const subLinks: string[] = [];
  const seen = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim().toLowerCase();
    const haystack = `${href.toLowerCase()} ${text}`;
    if (/(ausbildung|berufe|duales[-\s]?studium|studieng|karriere|ausbildungsberufe)/.test(haystack)) {
      try {
        const u = new URL(href, baseUrl);
        // Same-host only
        if (u.host !== baseUrl.host) return;
        const clean = u.toString().split('#')[0];
        if (!seen.has(clean)) { seen.add(clean); subLinks.push(clean); }
      } catch { /* ignore */ }
    }
  });

  $('script, style, noscript, svg').remove();
  // Headings + paragraphs + list items keep most of the visible content.
  const parts: string[] = [];
  $('h1, h2, h3, h4, p, li, td').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 4 && t.length < 400) parts.push(t);
  });
  return { text: parts.join('\n'), title, subLinks: subLinks.slice(0, 10) };
}

interface AiResult {
  berufe?: string[];
  studiengaenge?: string[];
}

async function callOpenAi(pages: PageContent[], apiKey: string): Promise<AiResult | null> {
  const systemPrompt = `Du extrahierst aus Roh-Text einer Unternehmenswebsite alle dort genannten Ausbildungsberufe und dualen Studiengänge.

Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown, kein Text drumherum:

{
  "berufe": string[],         // alle erkannten Ausbildungsberufe (z.B. "Industriemechaniker", "Fachinformatiker für Systemintegration")
  "studiengaenge": string[]   // alle erkannten dualen Studiengänge (z.B. "B.Eng. Mechatronik", "B.Sc. Wirtschaftsinformatik")
}

REGELN:
• Nenne jeden Beruf/Studiengang nur einmal — keine Dubletten.
• Verwende die offizielle deutsche Bezeichnung wie auf der Website (mit "(m/w/d)" weglassen).
• Bei Studiengängen den Abschluss mit angeben, z.B. "B.Eng. ..." oder "B.Sc. ...".
• Wenn du nichts findest, gib leere Arrays zurück.
• KEINE Praktika, FSJ, BFD, Werkstudenten oder reguläre Stellen — nur Ausbildungen + duale Studiengänge.
• Maximal 30 Berufe und 20 Studiengänge.`;

  const userPayload = pages.map((p) => `── Quelle: ${p.url} ──\n${p.title ? `Titel: ${p.title}\n` : ''}${p.body.slice(0, 6000)}`).join('\n\n').slice(0, 18000);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload },
      ],
    }),
  });

  if (!res.ok) {
    console.error('[extract-jobs] OpenAI status', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json() as { choices?: Array<{ message: { content: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? '';
  try {
    return JSON.parse(raw) as AiResult;
  } catch {
    return null;
  }
}

function sanitize(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, 200);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const url = await isSafePublicUrl(body.url ?? '');
  if (!url) {
    return NextResponse.json({ error: 'Ungültige URL. Bitte gib eine vollständige öffentliche https-URL an.' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  // 1. Fetch start page
  const startHtml = await fetchHtml(url.toString());
  if (!startHtml) {
    return NextResponse.json({ error: 'Website konnte nicht geladen werden.' }, { status: 502 });
  }
  const start = extractText(startHtml, url);

  const pages: PageContent[] = [{ url: url.toString(), title: start.title, body: start.text }];

  // 2. Crawl up to MAX_SUBPAGES candidate sub-pages (ausbildung/studium/karriere)
  for (const subUrl of start.subLinks.slice(0, MAX_SUBPAGES)) {
    try {
      const safe = await isSafePublicUrl(subUrl);
      if (!safe) continue;
      const html = await fetchHtml(safe.toString());
      if (!html) continue;
      const sub = extractText(html, safe);
      pages.push({ url: safe.toString(), title: sub.title, body: sub.text });
    } catch { /* ignore single sub-page failures */ }
  }

  // 3. Ask AI for structured berufe + studiengaenge
  const ai = await callOpenAi(pages, apiKey);
  if (!ai) {
    return NextResponse.json({ error: 'KI-Analyse fehlgeschlagen.' }, { status: 502 });
  }

  return NextResponse.json({
    berufe: sanitize(ai.berufe).slice(0, 30),
    studiengaenge: sanitize(ai.studiengaenge).slice(0, 20),
    pagesCrawled: pages.length,
  });
}
