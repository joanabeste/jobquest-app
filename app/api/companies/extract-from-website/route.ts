import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getSession, unauthorized } from '@/lib/api-auth';
import { INDUSTRY_OPTIONS, ROLE_PERMISSIONS } from '@/lib/types';
import { FONT_OPTIONS } from '@/lib/fonts';
import { aiChat, isAiConfigured } from '@/lib/ai-provider';
import { safeFetch, isSafePublicUrl } from '@/lib/safe-fetch';
import { createAdminClient } from '@/lib/supabase/admin';

const MEDIA_BUCKET = 'quest-media';

export const runtime = 'nodejs';
export const maxDuration = 60;

const FONT_WHITELIST = FONT_OPTIONS.map((f) => f.value);
const MAX_HTML_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 500_000;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];

// Hostname/IP validation + redirect-safe fetching live in lib/safe-fetch.ts.
// All outbound requests in this route go through `safeFetch` so DNS-rebinding,
// redirect-chain SSRF, and IPv6/CGNAT bypasses are blocked uniformly.

async function fetchWithLimit(
  url: string,
  maxBytes: number,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const res = await safeFetch(url, { maxBytes, timeoutMs: FETCH_TIMEOUT_MS });
  if (!res) return null;
  return { buffer: res.buffer, contentType: res.contentType };
}

async function fetchAsDataUrl(url: string): Promise<string | undefined> {
  const result = await fetchWithLimit(url, MAX_IMAGE_BYTES);
  if (!result) return undefined;
  const mime = result.contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) return undefined;
  return `data:${mime};base64,${result.buffer.toString('base64')}`;
}

/**
 * Download an image from the source website and persist it as a media asset
 * for the current company. Returns the public URL on success, or undefined
 * if the URL is unreachable / not an allowed image / storage failed.
 *
 * Doing this server-side means imported logos / favicons end up in the same
 * media library as user uploads, instead of being inlined as base64 strings.
 */
async function fetchAndStoreImage(
  sourceUrl: string,
  companyId: string,
  kind: 'logo' | 'favicon',
): Promise<string | undefined> {
  const result = await fetchWithLimit(sourceUrl, MAX_IMAGE_BYTES);
  if (!result) return undefined;
  const mime = result.contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) return undefined;

  const supabase = createAdminClient();

  // Bucket may not exist yet on fresh environments — same defensive pattern
  // used by the regular media upload route.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === MEDIA_BUCKET)) {
    const { error: bucketErr } = await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
    if (bucketErr && !bucketErr.message.includes('already exists')) return undefined;
  }

  const ext = mime === 'image/svg+xml' ? 'svg'
    : mime === 'image/x-icon' || mime === 'image/vnd.microsoft.icon' ? 'ico'
    : mime.split('/')[1] ?? 'png';
  const filename = `${kind}.${ext}`;
  const path = `${companyId}/${crypto.randomUUID()}-${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, result.buffer, { contentType: mime, upsert: false });
  if (uploadError) return undefined;

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  await supabase.from('media_assets').insert({
    company_id: companyId,
    url: urlData.publicUrl,
    filename,
    size_bytes: result.buffer.byteLength,
    mime_type: mime,
  });

  return urlData.publicUrl;
}

interface Extracted {
  title?: string;
  description?: string;
  ogImage?: string;
  logoCandidates: string[];
  faviconCandidate?: string;
  privacyUrl?: string;
  imprintUrl?: string;
  careerUrl?: string;
  fontCandidates: string[];
  colorCandidates: string[];
  bodyText?: string;
  stylesheetUrls: string[];
  colorCounts: Map<string, number>;
}

function extractColorsFromCss(css: string, counts: Map<string, number>) {
  // hex
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let hex = m[1].toLowerCase();
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex === 'ffffff' || hex === '000000') continue;
    const key = `#${hex}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // rgb / rgba
  for (const m of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)) {
    const r = Math.min(255, parseInt(m[1], 10));
    const g = Math.min(255, parseInt(m[2], 10));
    const b = Math.min(255, parseInt(m[3], 10));
    if (r === 255 && g === 255 && b === 255) continue;
    if (r === 0 && g === 0 && b === 0) continue;
    const key = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}

function parseHtml(html: string, baseUrl: URL): Extracted {
  const $ = cheerio.load(html);
  const abs = (href: string | undefined): string | undefined => {
    if (!href) return undefined;
    try { return new URL(href, baseUrl).toString(); } catch { return undefined; }
  };

  const title = $('meta[property="og:site_name"]').attr('content')?.trim() || $('title').text().trim() || undefined;
  const description = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || undefined;
  const ogImage = abs($('meta[property="og:image"]').attr('content'));

  // Logo candidates
  const logoCandidates: string[] = [];
  $('img[alt*="logo" i], img[src*="logo" i], img.logo, [class*="logo" i] img').each((_, el) => {
    const src = abs($(el).attr('src'));
    if (src && !logoCandidates.includes(src)) logoCandidates.push(src);
  });
  if (ogImage) logoCandidates.push(ogImage);

  // Favicon
  const faviconHref =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href');
  const faviconCandidate = abs(faviconHref) || abs('/favicon.ico');

  // Footer / nav links
  let privacyUrl: string | undefined;
  let imprintUrl: string | undefined;
  let careerUrl: string | undefined;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim().toLowerCase();
    const haystack = `${href.toLowerCase()} ${text}`;
    if (!privacyUrl && /(datenschutz|privacy|privacy-policy)/.test(haystack)) {
      privacyUrl = abs(href);
    }
    if (!imprintUrl && /(impressum|imprint|legal-notice|legal\b)/.test(haystack)) {
      imprintUrl = abs(href);
    }
    if (!careerUrl && /(karriere|career|jobs|stellenangebote)/.test(haystack)) {
      careerUrl = abs(href);
    }
  });

  // Fonts: Google Fonts links + inline font-family
  const fontCandidates = new Set<string>();
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const matches = href.matchAll(/family=([^&:]+)/g);
    for (const m of matches) {
      const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).split(':')[0].trim();
      if (name) fontCandidates.add(name);
    }
  });
  const inlineCss = $('style').map((_, el) => $(el).text()).get().join('\n');
  for (const m of inlineCss.matchAll(/font-family\s*:\s*([^;}\n]+)/gi)) {
    const first = m[1].split(',')[0].replace(/['"]/g, '').trim();
    if (first && !/^(inherit|initial|unset|sans-serif|serif|monospace|system-ui)$/i.test(first)) {
      fontCandidates.add(first);
    }
  }

  // Colors: hex/rgb from inline CSS + inline style attrs + meta theme-color
  const colorCounts = new Map<string, number>();
  extractColorsFromCss(inlineCss, colorCounts);
  $('[style]').each((_, el) => {
    extractColorsFromCss($(el).attr('style') ?? '', colorCounts);
  });
  const themeColor = $('meta[name="theme-color"]').attr('content');
  if (themeColor) extractColorsFromCss(themeColor, colorCounts);

  // Stylesheet URLs to fetch later (for more color material)
  const stylesheetUrls: string[] = [];
  $('link[rel="stylesheet"][href]').each((_, el) => {
    const href = abs($(el).attr('href'));
    if (href) stylesheetUrls.push(href);
  });

  // Visible body text — headings + paragraphs, used to give the AI enough material
  $('script, style, noscript, nav, footer, header').remove();
  const textParts: string[] = [];
  $('h1, h2, h3, p, li').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t.length > 20) textParts.push(t);
  });
  const bodyText = textParts.join('\n').slice(0, 8000);

  return {
    title,
    description,
    ogImage,
    bodyText,
    logoCandidates: logoCandidates.slice(0, 5),
    faviconCandidate,
    privacyUrl,
    imprintUrl,
    careerUrl,
    fontCandidates: [...fontCandidates].slice(0, 10),
    colorCandidates: [],
    stylesheetUrls: stylesheetUrls.slice(0, 3),
    colorCounts,
  };
}

function rankColors(counts: Map<string, number>): string[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c);
}

interface AiResult {
  name?: string;
  description?: string;
  industry?: string;
  location?: string;
  privacyUrl?: string;
  imprintUrl?: string;
  careerPageUrl?: string;
  design?: {
    primaryColor?: string;
    accentColor?: string;
    headingFontName?: string;
    bodyFontName?: string;
  };
}

async function callAi(extracted: Extracted, sourceUrl: string): Promise<AiResult | null> {
  const systemPrompt = `Du bist ein Assistent, der Firmenprofil-Felder aus Roh-Daten einer Firmenwebsite extrahiert.
Antworte AUSSCHLIESSLICH mit validem JSON ohne Markdown, kein Text davor oder danach.

Schema:
{
  "name": string | null,
  "description": string | null,        // 6-10 Sätze auf Deutsch, ausführlich: was die Firma macht, Werte/Mission, Größe/Standorte, Zielgruppe, Besonderheiten, Ausbildungs- oder Arbeitskultur falls erkennbar. Keine Marketing-Floskeln, sondern konkrete Inhalte aus der Website.
  "industry": string | null,           // EXAKT einer aus: ${INDUSTRY_OPTIONS.join(', ')}
  "location": string | null,           // Stadt, falls erkennbar
  "privacyUrl": string | null,
  "imprintUrl": string | null,
  "careerPageUrl": string | null,
  "design": {
    "primaryColor": "#rrggbb",         // PFLICHT: markanteste Markenfarbe aus den Farb-Kandidaten
    "accentColor": "#rrggbb",          // PFLICHT: zweite, kontrastierende Farbe aus den Kandidaten
    "headingFontName": string | null,  // EXAKT einer aus: ${FONT_WHITELIST.join(', ')} (system wenn unbekannt)
    "bodyFontName": string | null      // EXAKT einer aus: ${FONT_WHITELIST.join(', ')}
  }
}

Wähle Werte ausschließlich aus den gegebenen Kandidaten. Wenn nichts passt, gib null zurück.`;

  const userPayload = JSON.stringify({
    sourceUrl,
    title: extracted.title,
    metaDescription: extracted.description,
    bodyText: extracted.bodyText,
    privacyUrlCandidate: extracted.privacyUrl,
    imprintUrlCandidate: extracted.imprintUrl,
    careerPageUrlCandidate: extracted.careerUrl,
    fontCandidates: extracted.fontCandidates,
    colorCandidates: extracted.colorCandidates,
  }, null, 2);

  try {
    const raw = await aiChat({
      system: systemPrompt,
      user: userPayload,
      temperature: 0.2,
      json: true,
      model: process.env.AI_PROVIDER === 'openai' ? 'gpt-4o-mini' : undefined,
    });
    return JSON.parse(raw) as AiResult;
  } catch (err) {
    console.error('[extract-company] AI error:', err);
    return null;
  }
}

function sanitizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = value.trim().match(/^#([0-9a-f]{6})$/i);
  return m ? `#${m[1].toLowerCase()}` : undefined;
}

function sanitizeFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return FONT_WHITELIST.includes(value) ? value : undefined;
}

function sanitizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

function sanitizeText(value: unknown, max = 1000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t ? t.slice(0, max) : undefined;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!ROLE_PERMISSIONS[session.member.role]?.includes('edit_company')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlüssel nicht konfiguriert' }, { status: 500 });
  }

  const fetched = await fetchWithLimit(url.toString(), MAX_HTML_BYTES);
  if (!fetched) {
    return NextResponse.json({ error: 'Website konnte nicht geladen werden (Timeout oder zu groß).' }, { status: 502 });
  }
  if (!fetched.contentType.toLowerCase().includes('html')) {
    return NextResponse.json({ error: 'URL liefert kein HTML.' }, { status: 400 });
  }

  const html = fetched.buffer.toString('utf8');
  const extracted = parseHtml(html, url);

  // Enrich with stylesheet colors until we have at least 2 candidates
  for (const cssUrl of extracted.stylesheetUrls) {
    if (extracted.colorCounts.size >= 4) break;
    const cssRes = await fetchWithLimit(cssUrl, MAX_HTML_BYTES);
    if (!cssRes) continue;
    extractColorsFromCss(cssRes.buffer.toString('utf8'), extracted.colorCounts);
  }
  extracted.colorCandidates = rankColors(extracted.colorCounts);

  const ai = await callAi(extracted, url.toString());
  if (!ai) {
    return NextResponse.json({ error: 'KI-Analyse fehlgeschlagen.' }, { status: 502 });
  }

  // Download logo + favicon and persist them as media assets so they show up
  // in the global library and can be re-used. Falls back to inline data URLs
  // only if storage upload fails (defensive — keeps the import working).
  let logoUrl: string | undefined;
  for (const candidate of extracted.logoCandidates) {
    logoUrl = await fetchAndStoreImage(candidate, session.company.id, 'logo');
    if (logoUrl) break;
    if (!logoUrl) {
      const fallback = await fetchAsDataUrl(candidate);
      if (fallback) { logoUrl = fallback; break; }
    }
  }
  let faviconUrl: string | undefined;
  if (extracted.faviconCandidate) {
    faviconUrl = await fetchAndStoreImage(extracted.faviconCandidate, session.company.id, 'favicon');
    if (!faviconUrl) faviconUrl = await fetchAsDataUrl(extracted.faviconCandidate);
  }

  const industry = typeof ai.industry === 'string' && INDUSTRY_OPTIONS.includes(ai.industry) ? ai.industry : undefined;

  return NextResponse.json({
    extracted: {
      name: sanitizeText(ai.name, 200),
      description: sanitizeText(ai.description, 4000),
      industry,
      location: sanitizeText(ai.location, 200),
      privacyUrl: sanitizeUrl(ai.privacyUrl) ?? sanitizeUrl(extracted.privacyUrl),
      imprintUrl: sanitizeUrl(ai.imprintUrl) ?? sanitizeUrl(extracted.imprintUrl),
      careerPageUrl: sanitizeUrl(ai.careerPageUrl) ?? sanitizeUrl(extracted.careerUrl),
      logo: logoUrl,
      design: {
        primaryColor: sanitizeHexColor(ai.design?.primaryColor),
        accentColor: sanitizeHexColor(ai.design?.accentColor),
        headingFontName: sanitizeFont(ai.design?.headingFontName),
        bodyFontName: sanitizeFont(ai.design?.bodyFontName),
        faviconUrl,
      },
    },
  });
}
