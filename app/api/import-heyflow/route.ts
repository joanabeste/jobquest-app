import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

const ImportSchema = z.object({
  url: z.string().url().startsWith('https://'),
});

// The conversion prompt reuses the same block-type definitions as generate-quest
// but instructs the AI to convert existing Heyflow content rather than invent new content.
const SYSTEM_PROMPT = `Du konvertierst den Inhalt eines bestehenden Heyflow-Prototyps in eine optimierte, interaktive JobQuest.

WICHTIG – KONVERTIERUNGSREGELN:
• Konvertiere JEDE einzelne Seite und Situation aus dem Heyflow-Prototyp – NICHTS weglassen!
• Die fertige Quest MUSS MINDESTENS genauso viele Seiten haben wie der Prototyp (eher mehr, weil Branching-Pfade dazukommen).
• WANDLE statische Informationsseiten in quest_dialog um: Erstelle daraus lebendige Gespräche mit Kolleg:innen, die die Infos in einem natürlichen Dialog vermitteln. Nutze choices, damit der Nutzer aktiv teilnimmt.
• WANDLE Feedback-/Erklärseiten (z.B. "Richtiges Verhalten", "Super @vorname!") EBENFALLS in quest_dialog um:
  Eine Kollegin oder Ausbilderin erklärt im Gespräch, was richtig war und warum. Der Nutzer kann per choices reagieren (z.B. "Verstanden!", "Gut zu wissen!").
  KEIN reiner Textblock — immer als Dialog mit einer Figur!
• WANDLE Multiple-Choice-Fragen mit richtig/falsch-Bewertung in quest_quiz um: Formuliere klare Fragen mit feedback für jede Option.
• MANCHE Entscheidungen passen besser als quest_dialog MIT choices statt als quest_decision:
  → Wenn eine Kollegin oder Ausbilderin eine Anweisung gibt und der Nutzer reagieren soll ("Okay, mache ich!" / "Kurze Frage dazu…")
  → Wenn es ein lockeres Gespräch ist, in dem der Nutzer eine Haltung zeigt
  → quest_decision nur für echte Situationsentscheidungen mit Konsequenzen/Branching
• WANDLE echte Entscheidungsszenarien (mit spürbaren Konsequenzen) in quest_decision um: Zwei Optionen mit Branching.
• BEHALTE die Story-Struktur, Reihenfolge und alle Texte/Szenarien bei – optimiere nur die Darstellung.
• Nutze @vorname überall, wo der Prototyp den Namen des Nutzers verwendet.

═══════════════════════════════════════════════════════
  STRUKTUR (FESTER EINSTIEG + KONVERTIERTER INHALT + FESTER ABSCHLUSS)
═══════════════════════════════════════════════════════

── FESTER EINSTIEG (immer genau diese Seiten) ──────────
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

Seite 3: quest_scene → Ort und heutige Aufgaben: Wo bin ich? Was steht heute an?
  MUSS bulletPoints haben (4–6 Aufgaben des Tages).
  description soll den Nutzer direkt mit @vorname ansprechen.

── KONVERTIERTER INHALT (Seiten 4 bis N-3) ──────────────────────────
Konvertiere hier JEDEN einzelnen Inhalt aus dem Heyflow-Prototyp:

• Für JEDE Situation/Szenario im Heyflow:
  1. quest_scene oder quest_dialog als Einstieg/Kontext
  2. quest_decision oder quest_quiz als Interaktion
  3. quest_dialog oder quest_scene als Feedback/Konsequenz

• Mindestens 2 quest_decision MIT BRANCHING (zwei verschiedene Pfade):
  → Jeder Pfad MINDESTENS 2 Seiten lang
  → Pfade führen danach wieder zusammen (Konvergenz)

• Mindestens 2 quest_quiz (Wissens-/Verhaltensfragen)

• Mindestens 3 quest_dialog mit choices (interaktive Gespräche)

• Füge quest_zuordnung oder quest_hotspot ein, wenn der Inhalt es hergibt

── FESTER ABSCHLUSS (immer diese 3 Seiten am Ende) ────────────────
Vorletzte - 1: quest_rating → { "question": "Wie war dein Arbeitstag?", "emoji": "⭐", "count": 5 }
Vorletzte:     quest_rating → { "question": "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", "emoji": "👍", "count": 5 }
Letzte:        quest_lead  → Kontaktformular (fields: [])

GESAMT: ca. 15–22 Seiten. Halte die Quest KOMPAKT — in ca. 3 Minuten durchspielbar.

═══════════════════════════════════════════════════════
  BRANCHING-MECHANISMUS
═══════════════════════════════════════════════════════

Zwei Arten von nextPageIndex, beide nötig:

(A) OPTION-LEVEL nextPageIndex: In quest_decision-Optionen.
    Bestimmt die erste Seite des jeweiligen Pfades.

(B) PAGE-LEVEL nextPageIndex: Auf der letzten Seite von Pfad A.
    Lässt Pfad B überspringen → springt zur Konvergenzseite.

BEISPIEL:
  Seite 5 — quest_decision:
    Option A → nextPageIndex: 6, Option B → nextPageIndex: 8
  Seite 7 — letzte Seite Pfad A — PAGE nextPageIndex: 10
  Seite 9 — letzte Seite Pfad B — kein nextPageIndex
  Seite 10 — Konvergenz: passt zu beiden Pfaden

═══════════════════════════════════════════════════════
  BLOCK-TYPEN (exakte Props-Struktur!)
═══════════════════════════════════════════════════════

quest_scene
  Props: { title: string, description: string, imageUrl: "", subtext?: string, accentText?: string, buttonText?: string, bulletPoints?: string[] }
  → Szeneneinstieg. title: max 8 Wörter. description: 2-3 Sätze.
  → Seite 0: Nutze subtext, accentText und buttonText wie oben.

quest_spinner
  Props: { text: string, doneText: string }

quest_dialog
  Props: { lines: [{ id: "UUID", speaker: string, text: string, position: "left"|"right"|"center" }], choices?: [{ id: "UUID", text: string, reaction?: string }], input?: { placeholder: string, captures?: string, followUpText?: string } }
  → BEVORZUGTER Block fur Informationsvermittlung! Wandle statische Texte in Dialoge um.
  → 3–5 Zeilen pro Dialog — kurz und knackig! position: "left" = Kolleg:in, "right" = Nutzer.
    "center" = Erzahler-Handlung (z.B. "Du klopfst an die Tur.", "Ihr geht in den Aufenthaltsraum.").
    Center-Zeilen beschreiben Handlungen/Ortswechsel, keine gesprochenen Satze. speaker kann leer sein.
  → speaker mit Rolle (z.B. "Sarah (Teamleiterin)"). @vorname nutzen.
  → choices: 2–3 Antwortoptionen mit reaction. Nutze choices fur interaktive Gesprache.

quest_decision
  Props: { question: string, options: [{ id: "UUID", text: string, emoji: string, reaction: string, isWrong?: boolean, nextPageIndex?: number }] }
  → Für echte Entscheidungssituationen. 2–3 Optionen.
  → question: Konkrete Situation mit Handlungsdruck, nicht abstrakt.
  → isWrong: true wenn objektiv falsch/gefährlich. Bei Branching immer false.
  → emoji: NUR Icon-Namen: Briefcase, Star, Heart, Zap, Target, Users, Clock, Globe, Shield, Lightbulb, Rocket, TrendingUp, Award, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Coffee, Smile, AlertTriangle, HelpCircle, MessageCircle, Phone, Mail, Clipboard, Search, Settings, Flag, Bookmark

quest_quiz
  Props: { question: string, options: [{ id: "UUID", text: string, correct: boolean, feedback: string }] }
  → Für Wissens-/Verhaltensfragen mit richtig/falsch. 3–4 Optionen, genau eine correct.
  → feedback für jede Option: kurze, lehrreiche Erklärung.

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
  → headline: Personlich mit @vorname, z.B. "@vorname, danke fur deinen virtuellen Arbeitstag bei uns!"
  → subtext: "Wir wissen, wie schwer die Berufswahl sein kann, deshalb informieren wir dich uber unsere Ausbildungsangebote. Trage dich einfach ein und wir informieren dich uber Praktika und weitere Angebote."
  → Ubernimm den Stil aus dem Heyflow-Formular wenn vorhanden, aber immer personlich und einladend.
  → fields: [] — Felder werden automatisch erganzt, nicht manuell setzen.

═══════════════════════════════════════════════════════
  QUALITÄTSANFORDERUNGEN
═══════════════════════════════════════════════════════

• JEDE Situation aus dem Heyflow wird konvertiert — nichts weglassen!
• Wandle ALLE statischen Informationsseiten in quest_dialog um.
• Nutze quest_quiz wenn es klar richtige/falsche Antworten gibt.
• Nutze quest_decision für echte Entscheidungen, MINDESTENS 2× MIT BRANCHING.
• Vermeide mehrere gleichartige Blöcke direkt hintereinander.
• Seitennamen = immer der Ort, z.B. "Schichtübergabe", "Frühstück", "Notfall".
  NIEMALS "Feedback", "Feedback Falsch", "Reaktion" oder "Konsequenz". Auch Feedback-Seiten behalten den Ortsnamen. Max 4 Wörter.
• Jede id: eindeutiger UUID-String.
• @vorname überall einsetzen, um den Nutzer persönlich anzusprechen.
• Normale Groß-/Kleinschreibung. Keine ALL CAPS.

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON. Pages können optional nextPageIndex (0-basiert) und hideLocationHint enthalten.

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
    },
    {
      "name": "Medikamentenausgabe",
      "nextPageIndex": 12,
      "blocks": [{ "type": "quest_scene", "props": { ... } }]
    }
  ]
}

Seiten ohne Branching-Sprung lassen nextPageIndex weg.`;

const DEFAULT_LEAD_FIELDS = [
  { type: 'text',     label: 'Vorname',  placeholder: 'Vorname',          required: true,  variable: 'vorname'    },
  { type: 'text',     label: 'Nachname', placeholder: 'Nachname',         required: false, variable: 'nachname'   },
  { type: 'email',    label: 'E-Mail',   placeholder: 'E-Mail-Adresse',   required: true,  variable: 'email'      },
  { type: 'tel',      label: 'Telefon',  placeholder: 'Telefonnummer',    required: false, variable: 'telefon'    },
  { type: 'checkbox', label: 'Ich kann mir vorstellen, in diesem Bereich ein Praktikum zu machen.', required: false, variable: 'praktikum' },
  { type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank">@companyName</a> meine Daten gemäß <a href="@datenschutzUrl" target="_blank">Datenschutzerklärung</a> verarbeitet. <a href="@impressumUrl" target="_blank">Impressum</a>', required: true, variable: 'datenschutz' },
];

// AI generation can take 60-120s for complex conversions
export const maxDuration = 300;

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

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlüssel nicht konfiguriert' }, { status: 500 });
  }

  // ── Fetch Heyflow page and extract text ────────────────────────────────────
  // Heyflow is a SPA — the main URL is just a shell. The real slide content
  // lives at the assets bucket: assets.prd.heyflow.com/flows/{flow-id}/www/index.html
  // Step 1: Fetch the main page to discover the FLOW_BUCKET_URL
  // Step 2: Fetch the actual content from the assets URL

  let textContent = '';
  try {
    const mainRes = await fetch(parsed.data.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobQuest/1.0)' },
    });
    if (!mainRes.ok) throw new Error(`HTTP ${mainRes.status}`);
    const mainHtml = await mainRes.text();

    // Extract the flow bucket URL from the SPA shell
    const bucketMatch = mainHtml.match(/FLOW_BUCKET_URL\s*=\s*["']([^"']+)["']/);
    let contentHtml = mainHtml;

    if (bucketMatch) {
      // Fetch the real content from the assets bucket
      const assetsUrl = `${bucketMatch[1]}/www/index.html`;
      console.log('[import-heyflow] fetching assets from', assetsUrl);
      const assetsRes = await fetch(assetsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobQuest/1.0)' },
      });
      if (assetsRes.ok) {
        contentHtml = await assetsRes.text();
      }
    }

    // Strip HTML tags, keep text content
    textContent = contentHtml
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
  } catch (err) {
    console.error('[import-heyflow] fetch failed', err);
    return NextResponse.json({ error: 'Heyflow-Seite konnte nicht geladen werden.' }, { status: 502 });
  }

  if (textContent.length < 50) {
    return NextResponse.json({ error: 'Heyflow-Seite enthält zu wenig Inhalt.' }, { status: 400 });
  }

  // ── Build user message ─────────────────────────────────────────────────────
  const companyContext: string[] = [];
  companyContext.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) companyContext.push(`Branche: ${session.company.industry}`);
  if (session.company.location) companyContext.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) companyContext.push(`Über uns: ${session.company.description.trim()}`);

  const userMessage = `${companyContext.join('\n')}\n\n══ HEYFLOW-INHALT (konvertiere diesen Prototyp in eine JobQuest) ══\n\n${textContent.slice(0, 24000)}`;

  // ── Call AI provider ──────────────────────────────────────────────────────
  let rawText: string;
  try {
    rawText = await aiChat({
      system: SYSTEM_PROMPT,
      user: userMessage,
      temperature: 0.7,
      json: true,
    });
  } catch (err) {
    console.error('[import-heyflow] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'missing_key' ? 500
      : err instanceof AiError && err.code === 'auth' ? 500
      : err instanceof AiError && err.code === 'rate_limit' ? 429
      : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  type RawOption = Record<string, unknown> & { nextPageIndex?: number };
  type RawBlock = { type: string; props: Record<string, unknown> };
  type RawPage  = { name: string; nextPageIndex?: number; hideLocationHint?: boolean; blocks: RawBlock[] };

  // Strip markdown code fences that Claude sometimes wraps around JSON
  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let aiResult: { beruf?: string; pages: RawPage[] };
  try {
    aiResult = JSON.parse(jsonText);
  } catch {
    console.error('[import-heyflow] JSON parse failed, raw length=', rawText.length, 'first 200 chars:', rawText.slice(0, 200));
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
