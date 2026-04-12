import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';

const ImportSchema = z.object({
  url: z.string().url().refine(
    (u) => {
      try { return new URL(u).hostname.endsWith('heyflow.site'); } catch { return false; }
    },
    { message: 'URL muss eine heyflow.site-Domain sein' },
  ),
});

// The conversion prompt reuses the same block-type definitions as generate-quest
// but instructs the AI to convert existing Heyflow content rather than invent new content.
const SYSTEM_PROMPT = `Du konvertierst den Inhalt eines bestehenden Heyflow-Prototyps in eine optimierte, interaktive JobQuest.

WICHTIG – KONVERTIERUNGSREGELN:
• Übernimm ALLE Inhalte, Texte und Szenarien aus dem Heyflow-Prototyp – erfinde nichts Neues.
• WANDLE statische Informationsseiten in quest_dialog um: Erstelle daraus lebendige Gespräche mit Kolleg:innen, die die Infos in einem natürlichen Dialog vermitteln. Nutze choices, damit der Nutzer aktiv teilnimmt.
• WANDLE Multiple-Choice-Fragen mit richtig/falsch-Bewertung in quest_quiz um: Formuliere klare Fragen mit feedback für jede Option.
• WANDLE Entscheidungsszenarien (ohne richtig/falsch) in quest_decision um: Zwei Optionen mit Branching wenn sinnvoll.
• BEHALTE die Story-Struktur und Reihenfolge bei – optimiere nur die Darstellung.
• Nutze @vorname überall, wo der Prototyp den Namen des Nutzers verwendet.

═══════════════════════════════════════════════════════
  FESTER RAHMEN
═══════════════════════════════════════════════════════

── EINSTIEG ──────────
Seite 0: quest_scene → Willkommensseite
  hideLocationHint = true
  title = "Willkommen bei [Firmenname]" (Firmenname aus dem Kontext)
  subtext = "Erlebe virtuell einen typischen Arbeitstag als:"
  accentText = Berufsbezeichnung mit "(m/w/d)" aus dem Heyflow-Inhalt
  description = "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen."
  buttonText = "Alles klar, verstanden!"

Seite 1: quest_spinner → { "text": "Dein Arbeitstag beginnt…", "doneText": "Los geht's!" }

Seite 2: quest_dialog → Namensabfrage. Eine Kollegin stellt sich vor und fragt nach dem Namen.
  MUSS input enthalten: { "placeholder": "Vorname", "captures": "vorname", "followUpText": "Schön dich kennenzulernen, @vorname!" }
  4–6 Dialog-Zeilen bevor das input erscheint.

── ABSCHLUSS (immer am Ende) ──
Vorletzte - 1: quest_rating → { "question": "Wie war dein Arbeitstag?", "emoji": "⭐", "count": 5 }
Vorletzte:     quest_rating → { "question": "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", "emoji": "👍", "count": 5 }
Letzte:        quest_lead  → Kontaktformular (fields: [])

═══════════════════════════════════════════════════════
  BLOCK-TYPEN
═══════════════════════════════════════════════════════

quest_scene
  Props: { title: string, description: string, imageUrl: "", subtext?: string, accentText?: string, buttonText?: string, bulletPoints?: string[] }
  → Szeneneinstieg: kurze, bildhafte Beschreibung.
  → Seite 0: Nutze subtext, accentText und buttonText wie oben.

quest_spinner
  Props: { text: string, doneText: string }

quest_dialog
  Props: { lines: [{ id: "UUID", speaker: string, text: string, position: "left"|"right" }], choices?: [{ id: "UUID", text: string, reaction?: string }], input?: { placeholder: string, captures?: string, followUpText?: string } }
  → BEVORZUGTER Block für Informationsvermittlung! Wandle statische Texte in Dialoge um.
  → 4–8 Zeilen. speaker mit Rolle (z.B. "Sarah (Teamleiterin)"). @vorname nutzen.
  → choices: 2–3 Antwortoptionen mit reaction.

quest_decision
  Props: { question: string, options: [{ id: "UUID", text: string, emoji: string, reaction: string, isWrong?: boolean, nextPageIndex?: number }] }
  → Für echte Entscheidungssituationen. 2–3 Optionen.
  → emoji: NUR Icon-Namen: Briefcase, Star, Heart, Zap, Target, Users, Clock, Globe, Shield, Lightbulb, Rocket, TrendingUp, Award, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Coffee, Smile, AlertTriangle, HelpCircle, MessageCircle, Phone, Mail, Clipboard, Search, Settings, Flag, Bookmark

quest_quiz
  Props: { question: string, options: [{ id: "UUID", text: string, correct: boolean, feedback: string }] }
  → Für Wissens-/Verhaltensfragen mit richtig/falsch. 3–4 Optionen, genau eine correct.

quest_info
  Props: { title: string, text: string }

quest_hotspot
  Props: { imageUrl: "", hotspots: [{ id: "UUID", x: number, y: number, label: string, description: string }], requireAll: boolean, doneText: string }

quest_zuordnung
  Props: { question: string, pairs: [{ id: "UUID", left: string, right: string }], shuffleRight: boolean, showFeedback: boolean, feedbackText: string }

quest_rating
  Props: { question: string, emoji: string, count: number }

quest_lead
  Props: { headline: string, subtext: string, buttonText: "Weitere Infos anfordern", privacyText: "", fields: [] }

═══════════════════════════════════════════════════════
  QUALITÄTSANFORDERUNGEN
═══════════════════════════════════════════════════════

• Wandle ALLE statischen Informationsseiten in quest_dialog um – keine reine Textseite darf übrig bleiben.
• Nutze quest_quiz statt quest_decision wenn es klar richtige/falsche Antworten gibt.
• Nutze quest_decision für echte Entscheidungen ohne objektiv richtige Antwort.
• Seitennamen = Ort oder Situation (z.B. "Schichtübergabe", "Frühstück", "Notfall"). Max 4 Wörter.
• Jede id: eindeutiger UUID-String.
• @vorname überall einsetzen, um den Nutzer persönlich anzusprechen.
• Normale Groß-/Kleinschreibung. Keine ALL CAPS.

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON:

{
  "beruf": "Erkannter Beruf aus dem Heyflow-Inhalt",
  "pages": [
    {
      "name": "Willkommen",
      "hideLocationHint": true,
      "blocks": [{ "type": "quest_scene", "props": { ... } }]
    },
    {
      "name": "Schichtübergabe",
      "blocks": [{ "type": "quest_dialog", "props": { ... } }]
    }
  ]
}`;

const DEFAULT_LEAD_FIELDS = [
  { type: 'text',     label: 'Vorname',  placeholder: 'Vorname',          required: true,  variable: 'vorname'    },
  { type: 'text',     label: 'Nachname', placeholder: 'Nachname',         required: false, variable: 'nachname'   },
  { type: 'email',    label: 'E-Mail',   placeholder: 'E-Mail-Adresse',   required: true,  variable: 'email'      },
  { type: 'tel',      label: 'Telefon',  placeholder: 'Telefonnummer',    required: false, variable: 'telefon'    },
  { type: 'checkbox', label: 'Ich kann mir vorstellen, in diesem Bereich ein Praktikum zu machen.', required: false, variable: 'praktikum' },
  { type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank">@companyName</a> meine Daten gemäß <a href="@datenschutzUrl" target="_blank">Datenschutzerklärung</a> verarbeitet. <a href="@impressumUrl" target="_blank">Impressum</a>', required: true, variable: 'datenschutz' },
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  // Feature-Flag-Check
  if (!session.company.features?.heyflowImport) {
    return NextResponse.json({ error: 'Feature nicht freigeschaltet' }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'validation_error' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API-Schlüssel (OPENAI_API_KEY) nicht konfiguriert' }, { status: 500 });
  }

  // ── Fetch Heyflow page and extract text ────────────────────────────────────
  let heyflowHtml: string;
  try {
    const res = await fetch(parsed.data.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobQuest/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    heyflowHtml = await res.text();
  } catch (err) {
    console.error('[import-heyflow] fetch failed', err);
    return NextResponse.json({ error: 'Heyflow-Seite konnte nicht geladen werden.' }, { status: 502 });
  }

  // Strip HTML tags, keep text content. Simple but effective for Heyflow pages.
  const textContent = heyflowHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (textContent.length < 50) {
    return NextResponse.json({ error: 'Heyflow-Seite enthält zu wenig Inhalt.' }, { status: 400 });
  }

  // ── Build user message ─────────────────────────────────────────────────────
  const companyContext: string[] = [];
  companyContext.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) companyContext.push(`Branche: ${session.company.industry}`);
  if (session.company.location) companyContext.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) companyContext.push(`Über uns: ${session.company.description.trim()}`);

  const userMessage = `${companyContext.join('\n')}\n\n══ HEYFLOW-INHALT (konvertiere diesen Prototyp in eine JobQuest) ══\n\n${textContent.slice(0, 12000)}`;

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    console.error('[import-heyflow] OpenAI error:', openaiRes.status, errText);
    return NextResponse.json({ error: 'KI-Anfrage fehlgeschlagen.' }, { status: 502 });
  }

  const aiData = await openaiRes.json() as { choices?: Array<{ message: { content: string } }> };
  const rawText = aiData.choices?.[0]?.message?.content ?? '';

  type RawOption = Record<string, unknown> & { nextPageIndex?: number };
  type RawBlock = { type: string; props: Record<string, unknown> };
  type RawPage  = { name: string; nextPageIndex?: number; hideLocationHint?: boolean; blocks: RawBlock[] };

  let aiResult: { beruf?: string; pages: RawPage[] };
  try {
    aiResult = JSON.parse(rawText);
  } catch {
    console.error('[import-heyflow] JSON parse failed, raw length=', rawText.length);
    return NextResponse.json({ error: 'KI-Antwort ungültig.' }, { status: 502 });
  }

  // ── Post-processing (same logic as generate-quest) ─────────────────────────
  const pageIds = aiResult.pages.map(() => crypto.randomUUID());

  const pages = aiResult.pages.map((page, pIdx) => {
    const pageNextId = typeof page.nextPageIndex === 'number' && pageIds[page.nextPageIndex]
      ? pageIds[page.nextPageIndex]
      : undefined;
    const hideHint = pIdx === 0 || page.hideLocationHint === true;

    return {
      id: pageIds[pIdx],
      name: page.name,
      ...(pageNextId ? { nextPageId: pageNextId } : {}),
      ...(hideHint ? { hideLocationHint: true } : {}),
      nodes: page.blocks.map((block) => {
        let props = block.props;

        // Resolve nextPageIndex in quest_decision options → targetPageId
        if (block.type === 'quest_decision' && Array.isArray(props.options)) {
          props = {
            ...props,
            options: (props.options as RawOption[]).map(({ nextPageIndex, ...rest }) => {
              if (typeof nextPageIndex === 'number' && pageIds[nextPageIndex]) {
                return { ...rest, targetPageId: pageIds[nextPageIndex] };
              }
              return rest;
            }),
          };
        }

        // Inject default lead fields when AI leaves fields empty
        if (block.type === 'quest_lead') {
          const fields = (props.fields as unknown[]) ?? [];
          if (fields.length === 0) {
            props = { ...props, fields: DEFAULT_LEAD_FIELDS.map((f) => ({ ...f, id: crypto.randomUUID() })) };
          }
        }

        return {
          id: crypto.randomUUID(),
          kind: 'block' as const,
          type: block.type,
          props,
        };
      }),
    };
  });

  return NextResponse.json({ beruf: aiResult.beruf ?? '', pages });
}
