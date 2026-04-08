import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { defaultLeadFields } from '@/lib/lead-field-defaults';

// ─── Input schema ─────────────────────────────────────────────────────────────
const GenerateCheckSchema = z.object({
  berufe: z.array(z.string().min(1).max(200)).min(1).max(40),
  studiengaenge: z.array(z.string().min(1).max(200)).max(30).optional().default([]),
  notes: z.string().max(8000).optional(),
  cardCount: z.number().int().min(6).max(20).optional().default(12),
});

// Palette of distinct hex colors for auto-generated dimensions.
const DIMENSION_PALETTE = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0284c7',
];

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du bist ein Experte für Karriere-Orientierungstools. Deine Aufgabe: Erstelle einen interaktiven Berufscheck, der in ca. 3 Minuten passende Berufe (und optional Studiengänge) bei einem Unternehmen vorschlägt.

═══════════════════════════════════════════════════════
  PFLICHT-AUFBAU der Pages
═══════════════════════════════════════════════════════

Du gibst ZWEI Top-Level-Felder zurück: dimensions[] und pages[].

── DIMENSIONS (4–8 Stück) ────────────────────────────────────────────────
Leite aus den vorgegebenen Berufen + Studiengängen 4–8 Berufsfelder ab. Beispiele:
• Industriemechaniker / Werkzeugmechaniker → "Gewerblich", "Technisch"
• Industriekaufmann / Bürokaufmann → "Kaufmännisch"
• Fachinformatiker / B.Sc. Informatik / Software Engineering → "Informatik"
• B.Eng. Mechatronik / Mechatroniker → "Mechatronik", "Technisch"
• B.Eng. Wirtschaftsingenieurwesen → "Ingenieurwesen", "Kaufmännisch"
• B.Eng. Maschinenbau / Elektrotechnik → "Ingenieurwesen", "Technisch"

Jede Dimension hat: { "name": string, "description": string }
Die Namen werden im weiteren Verlauf als Schlüssel in scores-Maps verwendet — verwende sie konsistent!

── PAGES (in dieser Reihenfolge) ────────────────────────────────────────
Seite 0: check_intro
  Props: { headline: string, subtext: string, imageUrl: "", buttonText: "Berufscheck starten" }
  → Knackiger Einstieg, "Lass uns deinen Traumberuf finden", ca. 3 Minuten Hinweis.

Seite 1 — NUR wenn studiengaenge nicht-leer ist:
  check_frage
  Props: {
    "frageType": "single_choice",
    "question": "Welchen Schulabschluss strebst du an oder hast du bereits?",
    "options": [
      { "text": "Hauptschule" },
      { "text": "Realschule" },
      { "text": "(Fach-)Abitur" },
      { "text": "Noch unklar" }
    ],
    "allowSkip": false
  }
  → KEINE scores. Diese Frage dient nur als Filter für die Studium-Gruppe im Ergebnis.

Seite 2 (oder 1 wenn keine Studiengänge):
  check_swipe_deck
  Props: {
    "question": "Wisch dich durch die Szenarien",
    "allowSkip": true,
    "cards": [ ... ]
  }
  → Generiere genau cardCount Karten.
  → Jede Karte: { "text": "Du sollst …", "optionPositive": { "label": "Klingt gut", "emoji": "👍", "scores": {...} }, "optionNeutral": { "label": "Geht so", "emoji": "😐", "scores": {...} }, "optionNegative": { "label": "Eher nicht", "emoji": "👎", "scores": {...} } }
  → scores-Maps: Dimensions-NAMEN als Keys, integer Punkte 1-3 als Values. Nur die Dimension(en) reinschreiben, die wirklich passen.
  → Beispiel-Karte für Mechatroniker: { "text": "Du erhältst ein technisches Gerät zum Auseinandernehmen und Zusammenbauen.", "optionPositive": { "label": "Mache ich gerne", "emoji": "👍", "scores": { "Mechatronik": 2, "Technisch": 1 } }, "optionNeutral": { "label": "Ist okay", "emoji": "😐", "scores": {} }, "optionNegative": { "label": "Eher nicht", "emoji": "👎", "scores": {} } }
  → Vermeide Berufe-spezifische Wörter im Text — schreibe Alltagsszenarien aus Schule/Freizeit, die auf Interessen und Fähigkeiten zielen.

4–6 Seiten check_selbst (Selbsteinschätzung — eine Page pro Slider):
  Props: {
    "question": "Wie gerne ...?",
    "description": "",
    "sliderMin": 0,
    "sliderMax": 10,
    "sliderStep": 1,
    "sliderLabelMin": "Gar nicht",
    "sliderLabelMax": "Sehr gerne",
    "sliderDimensionId": "<DIMENSION_NAME>"
  }
  → sliderDimensionId MUSS exakt einem deiner Dimensions-Namen entsprechen.
  → Generiere 4–6 Slider, die zusammen alle Dimensionen abdecken.
  → Beispielfragen: "Wie gerne arbeitest du mit Software und Code?" → Informatik
                    "Wie gerne übernimmst du praktische Aufgaben?" → Gewerblich
                    "Wie gerne präsentierst du Ideen vor anderen?" → Kaufmännisch

Vorletzte Seite: check_ergebnis
  Props: {
    "headline": "Dein Ergebnis, @firstName!",
    "subtext": "Diese Bereiche passen besonders gut zu dir.",
    "layout": "groups",
    "showDimensionBars": true,
    "groups": [ ... ]
  }

  Gruppen:
  Gruppe "Ausbildung" (immer sichtbar):
  {
    "label": "Ausbildung",
    "dimensionIds": [<Namen aller Dimensionen, die zu Ausbildungsberufen gehören>],
    "showBars": true,
    "topN": 3,
    "suggestions": [
      {
        "title": "<Berufsname genau wie eingegeben>",
        "description": "1–2 Sätze, was diesen Beruf ausmacht.",
        "imageUrl": "",
        "requiresDimensionIds": [<1–2 Dimensions-Namen, die für diesen Beruf charakteristisch sind>],
        "links": []
      }
      // … eine Suggestion pro Beruf in der Eingabeliste
    ]
  }

  WENN studiengaenge gegeben sind, zusätzlich Gruppe "Duales Studium":
  {
    "label": "Duales Studium",
    "visibleIf": { "sourceBlockIndex": <Index der Filterfrage>, "optionIndex": [1, 2, 3] },
      // optionIndex referenziert die Optionen der Filterfrage:
      //   0 = Hauptschule (NICHT zeigen)
      //   1 = Realschule, 2 = (Fach-)Abi, 3 = unklar (zeigen)
    "dimensionIds": [<Namen aller Dimensionen, die zu Studiengängen gehören>],
    "showBars": true,
    "topN": 2,
    "suggestions": [
      {
        "title": "<Studiengang genau wie eingegeben>",
        "description": "1–2 Sätze, was den Studiengang ausmacht.",
        "imageUrl": "",
        "requiresDimensionIds": [<passende Dimensionen>],
        "links": []
      }
    ]
  }

Letzte Seite: check_lead
  Props: {
    "headline": "Lust auf mehr?",
    "subtext": "Hinterlasse deine Kontaktdaten und wir melden uns mit Infos zu deinen Top-Treffern.",
    "buttonText": "Infos anfordern",
    "thankYouHeadline": "Vielen Dank!",
    "thankYouText": "Wir melden uns in Kürze.",
    "fields": []
  }
  → fields LEER lassen — der Server fügt Standard-Felder + checkbox_group automatisch ein.

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON, kein Markdown, keine Erklärungen drumherum:

{
  "dimensions": [
    { "name": "Technisch", "description": "Interesse an Technik, Maschinen und Werkzeugen." }
  ],
  "pages": [
    {
      "name": "Intro",
      "blocks": [ { "type": "check_intro", "props": { ... } } ]
    }
  ]
}

WICHTIG:
• Verwende Dimensions-NAMEN (nicht IDs) als Keys in scores, sliderDimensionId, dimensionIds, requiresDimensionIds.
• Der Server ersetzt sie nach der Generierung automatisch durch echte UUIDs.
• Keine ALL CAPS, normale Groß-/Kleinschreibung.
• Sprich Bewerber:innen freundlich und persönlich an.`;

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsedBody = GenerateCheckSchema.safeParse(raw);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const path = issue?.path.join('.') || 'input';
    return NextResponse.json({
      error: `Eingabe ungültig (${path}): ${issue?.message ?? 'unbekannter Validierungsfehler'}`,
    }, { status: 400 });
  }
  const { berufe, studiengaenge, notes, cardCount } = parsedBody.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API-Schlüssel (OPENAI_API_KEY) nicht konfiguriert' }, { status: 500 });
  }

  // Build company context
  const ctx: string[] = [];
  ctx.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) ctx.push(`Branche: ${session.company.industry}`);
  if (session.company.location) ctx.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) ctx.push(`Über uns: ${session.company.description.trim()}`);

  const userMessage = [
    ctx.join('\n'),
    '',
    `Erstelle einen Berufscheck für folgende Ausbildungsberufe:\n${berufe.map((b) => `- ${b}`).join('\n')}`,
    studiengaenge.length > 0 ? `\nUnd folgende duale Studiengänge:\n${studiengaenge.map((s) => `- ${s}`).join('\n')}` : '',
    `\nAnzahl Swipe-Karten: ${cardCount}`,
    notes?.trim() ? `\nZusätzliche Hinweise: ${notes.trim()}` : '',
  ].filter(Boolean).join('\n');

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.75,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('[generate-check] OpenAI error:', openaiRes.status, errText);
    return NextResponse.json({ error: 'KI-Anfrage fehlgeschlagen.' }, { status: 502 });
  }

  const aiData = await openaiRes.json() as { choices?: Array<{ message: { content: string } }> };
  const rawText = aiData.choices?.[0]?.message?.content ?? '';

  type AIDim = { name: string; description?: string };
  type AIBlock = { type: string; props: Record<string, unknown> };
  type AIPage = { name: string; visibleIf?: { sourceBlockIndex: number; optionIndex: number[] }; blocks: AIBlock[] };
  type AIResp = { dimensions?: AIDim[]; pages?: AIPage[] };

  let parsed: AIResp;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[generate-check] JSON parse failed, raw length=', rawText.length);
    return NextResponse.json({ error: 'KI-Antwort ungültig.' }, { status: 502 });
  }

  if (!parsed.dimensions?.length || !parsed.pages?.length) {
    return NextResponse.json({ error: 'KI-Antwort unvollständig.' }, { status: 502 });
  }

  // ── Resolve dimensions: name → stable UUID
  const dimensions = parsed.dimensions.map((d, i) => ({
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

  // ── First pass: assign IDs to every page + every block + every option
  const pageIds = parsed.pages.map(() => crypto.randomUUID());
  // Map (pageIdx, blockIdx) → assigned block id, used for visibleIf resolution.
  const blockIdMatrix: string[][] = parsed.pages.map((p) => p.blocks.map(() => crypto.randomUUID()));
  // Per-block option-id arrays so visibleIf optionIndex can be resolved.
  const blockOptionIdsMatrix: string[][][] = parsed.pages.map((p) => p.blocks.map((b) => {
    const opts = (b.props.options as Array<unknown>) ?? [];
    return opts.map(() => crypto.randomUUID());
  }));

  function resolveVisibleIf(v: AIPage['visibleIf'] | { sourceBlockIndex?: number; optionIndex?: number[] } | undefined) {
    if (!v || typeof v.sourceBlockIndex !== 'number') return undefined;
    // sourceBlockIndex is a *page* index in our flattened model — we treat it as
    // "the index of the source page" since each filter question lives on its own page.
    const srcPageIdx = v.sourceBlockIndex;
    const srcPage = parsed.pages![srcPageIdx];
    if (!srcPage) return undefined;
    // Find the FIRST interactive block on that page (check_frage / quest_decision).
    const blockIdx = srcPage.blocks.findIndex((b) => b.type === 'check_frage' || b.type === 'quest_decision');
    if (blockIdx < 0) return undefined;
    const sourceBlockId = blockIdMatrix[srcPageIdx][blockIdx];
    const optIds = blockOptionIdsMatrix[srcPageIdx][blockIdx];
    const equals = (v.optionIndex ?? []).map((i) => optIds[i]).filter((x): x is string => !!x);
    if (equals.length === 0) return undefined;
    return { sourceBlockId, equals };
  }

  // ── Second pass: build resolved pages
  const pages = parsed.pages.map((page, pIdx) => {
    const visibleIf = resolveVisibleIf(page.visibleIf);
    return {
      id: pageIds[pIdx],
      name: page.name || `Seite ${pIdx + 1}`,
      ...(visibleIf ? { visibleIf } : {}),
      nodes: page.blocks.map((block, bIdx) => {
        let props = { ...block.props };

        // Generic option-id assignment for blocks that have an `options` array.
        if (Array.isArray(props.options)) {
          props.options = (props.options as Array<Record<string, unknown>>).map((opt, oi) => ({
            ...opt,
            id: blockOptionIdsMatrix[pIdx][bIdx][oi],
            // Map per-option scores from names → ids
            ...(opt.scores ? { scores: resolveScoreMap(opt.scores) } : {}),
          }));
        }

        // Block-specific resolves
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
        if (block.type === 'check_frage' && props.frageType === 'slider' && props.sliderDimensionId) {
          const id = resolveDimRef(props.sliderDimensionId);
          if (id) props.sliderDimensionId = id; else delete props.sliderDimensionId;
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

        // check_lead: inject default fields + optional checkbox_group
        if (block.type === 'check_lead') {
          const fields = (props.fields as unknown[]) ?? [];
          if (fields.length === 0) {
            const base = defaultLeadFields();
            // Splice the checkbox_group BEFORE the GDPR checkbox (= last entry).
            const interestOptions = ['Ausbildung'];
            if (studiengaenge.length > 0) {
              interestOptions.push('Duales Studium', 'Beidem');
            }
            const interest = {
              id: crypto.randomUUID(),
              type: 'checkbox_group' as const,
              label: 'Ich möchte Infos zu …',
              required: false,
              variable: 'interesse',
              options: interestOptions,
            };
            props.fields = [...base.slice(0, -1), interest, base[base.length - 1]];
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

  // Split any page that ended up with more than one interactive question block
  // (check_selbst, check_frage, check_swipe_deck, check_ergebnisfrage) into one
  // page per block. The model is told to do this in the prompt but doesn't
  // always comply, and stacking sliders on a single page makes mobile scrolling
  // confusing AND breaks scrollIntoView when navigating onward.
  const QUESTION_TYPES = new Set(['check_selbst', 'check_frage', 'check_ergebnisfrage', 'check_swipe_deck']);
  type ResolvedPage = (typeof pages)[number];
  const splitPages: ResolvedPage[] = [];
  for (const page of pages) {
    const questionIndices = page.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.kind === 'block' && QUESTION_TYPES.has(n.type))
      .map(({ i }) => i);
    if (questionIndices.length <= 1) {
      splitPages.push(page);
      continue;
    }
    // Walk through the nodes and start a new page each time we see a question.
    // Non-question nodes (heading/paragraph/etc.) stay attached to the page they
    // were declared in, in front of the next question.
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
      // Trailing non-question nodes — attach to the last emitted page.
      const last = splitPages[splitPages.length - 1];
      last.nodes = [...last.nodes, ...bucket];
    }
  }

  return NextResponse.json({ pages: splitPages, dimensions });
}
