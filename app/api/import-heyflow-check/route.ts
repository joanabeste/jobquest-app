import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { defaultLeadFields } from '@/lib/lead-field-defaults';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

const ImportSchema = z.object({
  url: z.string().url().startsWith('https://'),
});

const DIMENSION_PALETTE = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0284c7',
];

const SYSTEM_PROMPT = `Du konvertierst den Inhalt eines bestehenden Heyflow-Berufschecks in einen optimierten, interaktiven Berufscheck.

WICHTIG – KONVERTIERUNGSREGELN:
• Ubernimm ALLE Fragen, Szenarien, Dimensionen und Berufsvorschlage aus dem Heyflow — NICHTS weglassen!
• GLEICHE die Berufe ab: Wenn ein Firmenprofil mit Berufen mitgegeben wird, stelle sicher dass ALLE diese
  Berufe im Ergebnis als Suggestions vorkommen — auch wenn sie im Heyflow-Prototyp fehlen. Ordne sie passenden Dimensionen zu.
• Hinterfrage den Inhalt: Wenn der Prototyp Fehler, Lucken oder Inkonsistenzen hat, korrigiere sie.
• Leite aus dem Scoring-System 3-4 Dimensionen (Berufsfelder) ab.
• WANDLE Szenario-Fragen in check_swipe_deck Karten um (Alltagssituationen mit 👍😐👎 Reaktionen und Dimension-Scores).
• WANDLE Multiple-Choice-Fragen ohne Scoring in check_frage um.
• WANDLE Selbsteinschatzungen in check_selbst Slider um (eine Seite pro Dimension).
• Ubernimm die Berufsvorschlage und ihre Zuordnung zu Dimensionen fur das Ergebnis.

Du gibst ZWEI Top-Level-Felder zuruck: dimensions[] und pages[].

═══════════════════════════════════════════════════════
  DIMENSIONS (3–4 Stuck, NICHT mehr)
═══════════════════════════════════════════════════════
Leite die Dimensionen direkt aus dem Heyflow-Scoring/den Ergebniskategorien ab.
Jede Dimension: { "name": string, "description": string }
Die Namen werden als Schlussel in scores-Maps verwendet — konsistent verwenden!

═══════════════════════════════════════════════════════
  PAGES (in dieser Reihenfolge)
═══════════════════════════════════════════════════════

Seite 0: check_intro
  Props: { headline: string, subtext: string, imageUrl: "", buttonText: "Berufscheck starten" }
  → Ubernimm Headline/Subtext aus dem Heyflow-Intro.

Seite 1: check_swipe_deck
  Props: {
    "question": "Wisch dich durch die Fragen",
    "allowSkip": true,
    "cards": [...]
  }
  → Konvertiere JEDE Szenario-Frage aus dem Heyflow in eine Swipe-Karte.
  → WICHTIG: JEDE Dimension muss in mindestens 2 Karten vorkommen — keine 0 %-Gruppen im Ergebnis.

  ── SCHEMA pro Karte ──────────────────────────────────────────────────
  {
    "text": "<ein Satz nach Format-Regeln unten>",
    "optionPositive": { "label": "Ja",         "emoji": "👍", "scores": { "<DIMENSION>": <1-3> } },
    "optionNeutral":  { "label": "Vielleicht", "emoji": "😐", "scores": {} },
    "optionNegative": { "label": "Nein",       "emoji": "👎", "scores": {} }
  }
  scores-Keys = exakter Dimensionsname.

  ── FORMAT pro Kartentext (PFLICHT — alle Punkte erfüllen) ───────────
  1. Genau EIN Satz, 8–18 Wörter, eine einzige Aufgabe, endet IMMER mit „?".
  2. Eine **Ja/Nein-Entscheidungsfrage** — eindeutig mit JA oder NEIN beantwortbar (👍 = Ja, 👎 = Nein). Erlaubte Satzanfänge (WHITELIST): „Würdest du …?", „Hättest du Lust, …?", „Wärst du bereit, …?", „Klingt das nach dir: …?", „Hast du Bock, …?".
     VERBOTEN: Aussage-Sätze ohne „?" („Du sollst …", „Du machst …", „Du bleibst …"), Skala-Fragen („Wie gerne …?"), Mehrfach-Wahl, abstrakte Charakter-Fragen („Magst du Menschen?").
  3. Konkret + sinnlich (Werkzeuge, Mengen, Zeitanker), nicht abstrakt.
  4. Setting: Alltag (Schule, Freizeit, Familie, Hobby, Praktikum). NIEMALS Berufsname im Text.
  5. Echter Trade-off — NEIN muss für eine andere valide Stärke stehen, nicht für moralisches Versagen.

  Wenn eine Heyflow-Quelle das Format verletzt (z. B. Präsens-Erzählung „Du bleibst bei deiner Oma"), formuliere sie UM in eine Ja/Nein-Frage:
    Quelle: „Du tröstest deinen kleinen Bruder, der weint."
    → Karte: „Würdest du deinen kleinen Bruder beruhigen, wenn er weint?"
    Quelle: „Du hilfst deiner Oma beim Aufstehen."
    → Karte: „Würdest du den ganzen Nachmittag deine Oma nach einem Sturz begleiten?"

  ── SCHLECHT-Beispiele (nicht generieren) ────────────────────────────
  ❌ „Du tröstest deinen weinenden Bruder." → Aussage statt Frage, kein „?".
  ❌ „Wie gerne hilfst du anderen?" → Skala-Frage, kein klares Ja/Nein.
  ❌ „Magst du Menschen?" → zu abstrakt, fast 100 % sagen Ja (Social-Desirability).
  ❌ „Würdest du als Pflegekraft arbeiten?" → Berufsname im Text.

4–6 Seiten check_selbst (Selbsteinschatzung — eine Page pro Slider):
  Props: {
    "question": "Wie gerne ...?",
    "description": "",
    "sliderMin": 0, "sliderMax": 10, "sliderStep": 1,
    "sliderLabelMin": "Gar nicht", "sliderLabelMax": "Sehr gerne",
    "sliderDimensionId": "<DIMENSION_NAME>"
  }
  → Eine Slider-Frage pro Dimension. Leite die Fragen aus den Heyflow-Selbsteinschatzungen ab.

Vorletzte Seite: check_ergebnis
  Props: {
    "headline": "Dein Ergebnis!",
    "subtext": "Diese Bereiche passen besonders gut zu dir.",
    "layout": "groups",
    "showDimensionBars": true,
    "groups": [...]
  }
  → Ubernimm die Berufsgruppen und -vorschlage aus dem Heyflow-Ergebnis.
  → Jede Gruppe: { "label": "Gruppenname", "dimensionIds": ["Dim1", "Dim2"], "showBars": true, "topN": 3, "suggestions": [...] }
  → Jeder Vorschlag: { "title": "Berufsbezeichnung", "description": "1-2 Satze", "imageUrl": "", "requiresDimensionIds": ["Dim1"], "links": [] }

Letzte Seite: check_lead
  Props: { "headline": string, "subtext": string, "buttonText": "Infos anfordern", "thankYouHeadline": "Vielen Dank!", "thankYouText": "Wir melden uns in Kurze.", "fields": [] }
  → Ubernimm Headline/Subtext aus dem Heyflow-Formular!

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON:

{
  "dimensions": [{ "name": "Pflege & Begleitung", "description": "..." }],
  "pages": [
    { "name": "Intro", "blocks": [{ "type": "check_intro", "props": { ... } }] },
    { "name": "Szenarien", "blocks": [{ "type": "check_swipe_deck", "props": { ... } }] }
  ]
}

WICHTIG:
• Verwende Dimensions-NAMEN als Keys in scores, sliderDimensionId, dimensionIds, requiresDimensionIds.
• Normale Gross-/Kleinschreibung. Keine ALL CAPS.`;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'validation_error' }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlussel nicht konfiguriert' }, { status: 500 });
  }

  // ── Fetch Heyflow page ────────────────────────────────────────────────────
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
    console.error('[import-heyflow-check] fetch failed', err);
    return NextResponse.json({ error: 'Heyflow-Seite konnte nicht geladen werden.' }, { status: 502 });
  }

  if (textContent.length < 50) {
    return NextResponse.json({ error: 'Heyflow-Seite enthalt zu wenig Inhalt.' }, { status: 400 });
  }

  // ── Build user message ────────────────────────────────────────────────────
  const ctx: string[] = [];
  ctx.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) ctx.push(`Branche: ${session.company.industry}`);
  if (session.company.location) ctx.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) ctx.push(`Uber uns: ${session.company.description.trim()}`);

  // Include company jobs from success page if available
  const companyJobs = session.company.successPage?.jobs ?? [];
  const jobsInfo = companyJobs.length > 0
    ? `\n\n══ BERUFE AUS DEM FIRMENPROFIL (alle mussen im Ergebnis abgedeckt sein!) ══\n${companyJobs.map((j) => `- ${j.title}${j.group ? ` (${j.group})` : ''}`).join('\n')}`
    : '';

  const userMessage = `${ctx.join('\n')}${jobsInfo}\n\n══ HEYFLOW-BERUFSCHECK (konvertiere in einen optimierten Berufscheck) ══\n\n${textContent.slice(0, 24000)}`;

  // ── Call AI ────────────────────────────────────────────────────────────────
  let rawText: string;
  try {
    rawText = await aiChat({ system: SYSTEM_PROMPT, user: userMessage, temperature: 0.7, json: true });
  } catch (err) {
    console.error('[import-heyflow-check] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : err instanceof AiError && (err.code === 'missing_key' || err.code === 'auth') ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  type AIDim = { name: string; description?: string };
  type AIBlock = { type: string; props: Record<string, unknown> };
  type AIPage = { name: string; visibleIf?: { sourceBlockIndex: number; optionIndex: number[] }; blocks: AIBlock[] };
  type AIResp = { dimensions?: AIDim[]; pages?: AIPage[] };

  let aiResult: AIResp;
  try {
    aiResult = JSON.parse(jsonText);
  } catch {
    console.error('[import-heyflow-check] JSON parse failed, raw length=', rawText.length, 'first 200:', rawText.slice(0, 200));
    return NextResponse.json({ error: 'KI-Antwort ungultig.' }, { status: 502 });
  }

  if (!aiResult.dimensions?.length || !aiResult.pages?.length) {
    return NextResponse.json({ error: 'KI-Antwort unvollstandig.' }, { status: 502 });
  }

  // ── Post-processing (same logic as generate-check) ────────────────────────
  const dimensions = aiResult.dimensions.map((d, i) => ({
    id: crypto.randomUUID(),
    name: d.name,
    description: d.description,
    color: DIMENSION_PALETTE[i % DIMENSION_PALETTE.length],
  }));
  const dimByName = new Map(dimensions.map((d) => [d.name.toLowerCase(), d.id]));
  function resolveDimRef(name: unknown): string | undefined {
    if (typeof name !== 'string') return undefined;
    return dimByName.get(name.toLowerCase());
  }
  function resolveScoreMap(scores: unknown): Record<string, number> {
    if (!scores || typeof scores !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores as Record<string, unknown>)) {
      const id = resolveDimRef(k);
      if (id && typeof v === 'number') out[id] = v;
    }
    return out;
  }
  function resolveDimList(names: unknown): string[] {
    if (!Array.isArray(names)) return [];
    return names.map((n) => resolveDimRef(n)).filter((x): x is string => !!x);
  }

  const pageIds = aiResult.pages.map(() => crypto.randomUUID());
  const blockIdMatrix: string[][] = aiResult.pages.map((p) => p.blocks.map(() => crypto.randomUUID()));
  const blockOptionIdsMatrix: string[][][] = aiResult.pages.map((p) => p.blocks.map((b) => {
    const opts = (b.props.options as Array<unknown>) ?? [];
    return opts.map(() => crypto.randomUUID());
  }));

  function resolveVisibleIf(v: AIPage['visibleIf'] | { sourceBlockIndex?: number; optionIndex?: number[] } | undefined) {
    if (!v || typeof v.sourceBlockIndex !== 'number') return undefined;
    const srcPageIdx = v.sourceBlockIndex;
    const srcPage = aiResult.pages![srcPageIdx];
    if (!srcPage) return undefined;
    const blockIdx = srcPage.blocks.findIndex((b) => b.type === 'check_frage' || b.type === 'quest_decision');
    if (blockIdx < 0) return undefined;
    const sourceBlockId = blockIdMatrix[srcPageIdx][blockIdx];
    const optIds = blockOptionIdsMatrix[srcPageIdx][blockIdx];
    const equals = (v.optionIndex ?? []).map((i) => optIds[i]).filter((x): x is string => !!x);
    if (equals.length === 0) return undefined;
    return { sourceBlockId, equals };
  }

  const pages = aiResult.pages.map((page, pIdx) => {
    const visibleIf = resolveVisibleIf(page.visibleIf);
    return {
      id: pageIds[pIdx],
      name: page.name || `Seite ${pIdx + 1}`,
      ...(visibleIf ? { visibleIf } : {}),
      nodes: page.blocks.map((block, bIdx) => {
        let props = { ...block.props };

        if (Array.isArray(props.options)) {
          props.options = (props.options as Array<Record<string, unknown>>).map((opt, oi) => ({
            ...opt,
            id: blockOptionIdsMatrix[pIdx][bIdx][oi],
            ...(opt.scores ? { scores: resolveScoreMap(opt.scores) } : {}),
          }));
        }

        if (block.type === 'check_swipe_deck' && Array.isArray(props.cards)) {
          props.cards = (props.cards as Array<Record<string, unknown>>).map((card) => ({
            ...card,
            id: crypto.randomUUID(),
            optionPositive: card.optionPositive
              ? { ...(card.optionPositive as Record<string, unknown>), scores: resolveScoreMap((card.optionPositive as Record<string, unknown>).scores) }
              : { label: '👍', scores: {} },
            optionNeutral: card.optionNeutral
              ? { ...(card.optionNeutral as Record<string, unknown>), scores: resolveScoreMap((card.optionNeutral as Record<string, unknown>).scores) }
              : { label: '😐', scores: {} },
            optionNegative: card.optionNegative
              ? { ...(card.optionNegative as Record<string, unknown>), scores: resolveScoreMap((card.optionNegative as Record<string, unknown>).scores) }
              : { label: '👎', scores: {} },
          }));
        }

        if (block.type === 'check_selbst' && props.sliderDimensionId) {
          const id = resolveDimRef(props.sliderDimensionId);
          if (id) props.sliderDimensionId = id; else delete props.sliderDimensionId;
        }
        if (block.type === 'check_statements' && Array.isArray(props.statements)) {
          props.statements = (props.statements as Array<Record<string, unknown>>).map((stmt) => ({
            ...stmt,
            id: stmt.id || crypto.randomUUID(),
            dimensionId: resolveDimRef(stmt.dimensionId) ?? '',
          }));
        }

        if (block.type === 'check_ergebnis' && Array.isArray(props.groups)) {
          props.groups = (props.groups as Array<Record<string, unknown>>).map((g) => ({
            ...g,
            id: crypto.randomUUID(),
            dimensionIds: resolveDimList(g.dimensionIds),
            visibleIf: resolveVisibleIf(g.visibleIf as { sourceBlockIndex?: number; optionIndex?: number[] }),
            suggestions: Array.isArray(g.suggestions)
              ? (g.suggestions as Array<Record<string, unknown>>).map((sug) => ({
                ...sug,
                id: crypto.randomUUID(),
                requiresDimensionIds: resolveDimList(sug.requiresDimensionIds),
                links: Array.isArray(sug.links)
                  ? (sug.links as Array<Record<string, unknown>>).map((l) => ({ ...l, id: crypto.randomUUID() }))
                  : [],
              }))
              : [],
          }));
        }

        if (block.type === 'check_lead') {
          const fields = (props.fields as unknown[]) ?? [];
          if (fields.length === 0) {
            props.fields = defaultLeadFields().map((f) => ({ ...f }));
          }
        }

        return {
          id: blockIdMatrix[pIdx][bIdx],
          kind: 'block' as const,
          type: block.type,
          props,
        };
      }),
    };
  });

  // Split pages with multiple question blocks
  const QUESTION_TYPES = new Set(['check_selbst', 'check_frage', 'check_ergebnisfrage', 'check_swipe_deck']);
  type ResolvedPage = (typeof pages)[number];
  const splitPages: ResolvedPage[] = [];
  for (const page of pages) {
    const questionIndices = page.nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.kind === 'block' && QUESTION_TYPES.has(n.type)).map(({ i }) => i);
    if (questionIndices.length <= 1) { splitPages.push(page); continue; }
    let bucket: typeof page.nodes = [];
    let firstChunk = true;
    for (const node of page.nodes) {
      const isQuestion = node.kind === 'block' && QUESTION_TYPES.has(node.type);
      bucket.push(node);
      if (isQuestion) {
        splitPages.push({
          ...(firstChunk ? page : {}),
          id: firstChunk ? page.id : crypto.randomUUID(),
          name: page.name || 'Frage',
          nodes: bucket,
        });
        bucket = [];
        firstChunk = false;
      }
    }
    if (bucket.length > 0) {
      const last = splitPages[splitPages.length - 1];
      last.nodes = [...last.nodes, ...bucket];
    }
  }

  // Auto-Titel aus der check_intro-Headline ableiten (siehe generate-check).
  const title = extractCheckTitleFromPages(splitPages);

  return NextResponse.json({ pages: splitPages, dimensions, title });
}

function extractCheckTitleFromPages(pages: { nodes: { kind: string; type?: string; props?: Record<string, unknown> }[] }[]): string | undefined {
  for (const page of pages) {
    for (const node of page.nodes) {
      if (node.kind !== 'block' || node.type !== 'check_intro') continue;
      const raw = String(node.props?.headline ?? '').trim();
      if (!raw) continue;
      const stripped = raw
        .replace(/<\/?accent>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\.\s*$/, '')
        .trim();
      if (stripped.length >= 3) return stripped;
    }
  }
  return undefined;
}
