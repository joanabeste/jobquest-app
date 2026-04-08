import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getSession, unauthorized } from '@/lib/api-auth';
import { safeFetch, isSafePublicUrl } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

// Two-level crawl budget. Each level fetches up to LEVEL_LIMIT pages in parallel
// from the candidate links collected on the previous level.
const LEVEL_LIMITS = [10, 18]; // start page → up to 10 lvl-1 pages → up to 18 lvl-2 pages
const MAX_TOTAL_PAGES = 30;
const PER_PAGE_TEXT_BUDGET = 9000;
const PROMPT_BUDGET = 60000;
const MAX_FETCH_CONCURRENCY = 6;

const KEYWORD_RE = /(ausbildung|berufe|duales[-\s]?studium|studieng|karriere|ausbildungsberufe|berufsbild|berufe-?von-?a-?z|fachinformatiker|industriemechaniker|elektroniker|kaufmann|kauffrau|mechatroniker|schueler|sch%C3%BCler|jobs?-?fuer-?sch|fuer-sch|career)/i;

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

  // Collect candidate sub-links related to ausbildung/studium/karriere BEFORE
  // removing nav. Same-host only, dedup, drop fragments.
  const subLinks: string[] = [];
  const seen = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim().toLowerCase();
    const haystack = `${href.toLowerCase()} ${text}`;
    if (!KEYWORD_RE.test(haystack)) return;
    try {
      const u = new URL(href, baseUrl);
      if (u.host !== baseUrl.host) return;
      const clean = u.toString().split('#')[0];
      if (!seen.has(clean)) { seen.add(clean); subLinks.push(clean); }
    } catch { /* ignore */ }
  });

  $('script, style, noscript, svg').remove();
  // Headings + paragraphs + list items + table cells keep most of the visible
  // job names; many career sites list jobs as <h3> or <li> entries.
  const parts: string[] = [];
  $('h1, h2, h3, h4, h5, p, li, td, a').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length >= 3 && t.length < 400) parts.push(t);
  });
  return { text: parts.join('\n'), title, subLinks };
}

async function fetchAndExtract(rawUrl: string): Promise<{ page: PageContent; subLinks: string[] } | null> {
  try {
    const safe = await isSafePublicUrl(rawUrl);
    if (!safe) return null;
    const html = await fetchHtml(safe.toString());
    if (!html) return null;
    const { text, title, subLinks } = extractText(html, safe);
    return { page: { url: safe.toString(), title, body: text }, subLinks };
  } catch {
    return null;
  }
}

/**
 * Run async tasks with bounded concurrency. Keeps each crawl level snappy
 * without hammering a single host with 30 parallel requests.
 */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

interface AiResult {
  berufe?: string[];
  studiengaenge?: string[];
}

async function callOpenAi(pages: PageContent[], apiKey: string): Promise<AiResult | null> {
  const systemPrompt = `Du extrahierst aus Roh-Text einer Unternehmenswebsite ALLE dort genannten Ausbildungsberufe und dualen Studiengänge.

Antworte AUSSCHLIESSLICH mit validem JSON, kein Markdown, kein Text drumherum:

{
  "berufe": string[],         // alle erkannten Ausbildungsberufe (z.B. "Industriemechaniker", "Fachinformatiker für Systemintegration")
  "studiengaenge": string[]   // alle erkannten dualen Studiengänge (z.B. "B.Eng. Mechatronik", "B.Sc. Wirtschaftsinformatik")
}

REGELN:
• SEI VOLLSTÄNDIG. Übersehe keinen Beruf oder Studiengang, der auf irgendeiner der Quellen genannt wird. Lieber einer zu viel als einer zu wenig.
• Nenne jeden Beruf/Studiengang nur einmal — keine Dubletten. Vereinheitliche Schreibweisen ("Fachinformatiker:in" und "Fachinformatiker (m/w/d)" → "Fachinformatiker").
• Verwende die offizielle deutsche Bezeichnung (mit "(m/w/d)", "(w/m/d)", ":in" usw. WEGLASSEN).
• Bei Studiengängen den Abschluss mit angeben, z.B. "B.Eng. ..." oder "B.Sc. ...".
• KEINE Praktika, FSJ, BFD, Werkstudenten oder reguläre Stellen — nur Ausbildungen + duale Studiengänge.
• Auch Spezialisierungen wie "Fachinformatiker für Systemintegration" UND "Fachinformatiker für Anwendungsentwicklung" zählen separat, wenn beide genannt werden.
• Wenn du nichts findest, gib leere Arrays zurück.
• Bis zu 60 Berufe und 40 Studiengänge sind erlaubt — schöpfe das Limit aber nur aus, wenn die Quellen wirklich so viele zeigen.`;

  // Pack as much page content as possible into the prompt budget. Earlier
  // pages get full slots; later ones can still be truncated by the slice cap.
  const chunks: string[] = [];
  let used = 0;
  for (const p of pages) {
    const header = `── Quelle: ${p.url} ──\n${p.title ? `Titel: ${p.title}\n` : ''}`;
    const remaining = PROMPT_BUDGET - used;
    if (remaining <= 200) break;
    const slot = Math.min(PER_PAGE_TEXT_BUDGET, remaining - header.length);
    if (slot <= 0) break;
    const text = p.body.slice(0, slot);
    const chunk = header + text;
    chunks.push(chunk);
    used += chunk.length + 2;
  }
  const userPayload = chunks.join('\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
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
    const key = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
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
  const visited = new Set<string>([url.toString()]);

  // 2. Recursive crawl: level 1 → level 2. Both levels parallel with bounded
  // concurrency to keep wall-clock low while gathering enough material.
  let frontier = start.subLinks.filter((u) => !visited.has(u));

  for (let level = 0; level < LEVEL_LIMITS.length; level++) {
    const limit = LEVEL_LIMITS[level];
    if (frontier.length === 0) break;
    if (pages.length >= MAX_TOTAL_PAGES) break;

    const slotsLeft = MAX_TOTAL_PAGES - pages.length;
    const todo = frontier.slice(0, Math.min(limit, slotsLeft));
    todo.forEach((u) => visited.add(u));

    const results = await mapWithConcurrency(todo, MAX_FETCH_CONCURRENCY, fetchAndExtract);

    const nextFrontier: string[] = [];
    for (const r of results) {
      if (!r) continue;
      pages.push(r.page);
      for (const link of r.subLinks) {
        if (!visited.has(link) && !nextFrontier.includes(link)) {
          nextFrontier.push(link);
        }
      }
    }
    frontier = nextFrontier;
  }

  // 3. Ask AI for structured berufe + studiengaenge
  const ai = await callOpenAi(pages, apiKey);
  if (!ai) {
    return NextResponse.json({ error: 'KI-Analyse fehlgeschlagen.' }, { status: 502 });
  }

  return NextResponse.json({
    berufe: sanitize(ai.berufe).slice(0, 60),
    studiengaenge: sanitize(ai.studiengaenge).slice(0, 40),
    pagesCrawled: pages.length,
  });
}
