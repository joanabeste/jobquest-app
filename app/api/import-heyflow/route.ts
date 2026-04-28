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
• WANDLE echte Entscheidungsszenarien (mit spürbaren Konsequenzen) in quest_decision um: 2–3 Optionen mit Branching/Reactions.
• BEHALTE die Story-Struktur, Reihenfolge und alle Texte/Szenarien bei – optimiere nur die Darstellung.
• Nutze @vorname überall, wo der Prototyp den Namen des Nutzers verwendet.
• WICHTIG zum @vorname-Platzhalter im Heyflow-Quelltext: Wenn im Prototyp
  ein Text wie "Richtig, @vorname! Weiter geht's zur Kasse…" steht, ist das
  ein UNERSETZTER Platzhalter aus dem Heyflow-Bug. Übernimm den Text NICHT
  so wörtlich, sondern formuliere natürlich um — entweder mit @vorname als
  echter Variable oder ohne Anrede ("Weiter geht's zur Kasse…"). NIEMALS
  Roh-Strings wie "@vorname" mit Komma + Leerzeichen drumherum stehenlassen,
  als wäre der Platzhalter gewünschter Text.

═══════════════════════════════════════════════════════
  ABSOLUTE LOGIK-REGELN — KEINE DOPPELUNGEN
═══════════════════════════════════════════════════════

(L1) EINE SITUATION = EINE INTERAKTION
  Pro Szenario im Prototyp gibt es GENAU EINE Entscheidungs- oder Quizinteraktion.
  Niemals dieselbe Frage zweimal hintereinander stellen — auch nicht in unterschiedlicher Form.

  FALSCH (so NICHT machen):
    Seite N:   quest_dialog "Paul wirkt traurig. Was würdest du tun?" + 2 choices
    Seite N+1: quest_decision "Paul sitzt still, wie reagierst du?" + 3 Optionen
    → Das ist die GLEICHE Frage zweimal. Der User klickt zweimal das Gleiche.

  RICHTIG:
    Seite N:   quest_dialog (Setup, Kontext, KEINE choices, oder choices nur als Reaktion auf eine Anweisung der Kollegin)
    Seite N+1: quest_decision (eine echte Wahl mit Konsequenzen, Branching)
    Seite N+2: quest_dialog (Feedback der Kollegin auf die Wahl, mit "Verstanden!"-choice)

(L2) DIALOG-CHOICES vs. DECISION — KLARE TRENNUNG
  • quest_dialog.choices: NUR für REAKTIONEN auf eine Aussage/Anweisung der Kollegin.
    Beispiele: "Okay, mache ich!", "Klingt gut.", "Kurze Frage dazu…", "Verstanden!"
    Diese choices haben KEINE Konsequenzen — sie sind nur Gesprächs-Acks.
  • quest_decision: für jede SITUATIVE WAHL mit Konsequenzen.
    Beispiele: "Wie reagierst du auf Pauls Stimmung?", "Schützt du den Bewohner sofort oder schaust du nur zu?"
    Diese Wahlen haben Branching (verschiedene targetPageId) und reactions.

  WENN eine Frage im Prototyp eine echte Wahl ist → quest_decision, KEIN Dialog-Choice davor mit derselben Frage.
  WENN eine Frage im Prototyp nur Gesprächs-Smalltalk ist → quest_dialog mit choices, KEIN nachfolgender quest_decision.

(L3) STORY-FLUSS-PRÜFUNG
  Lies vor der Ausgabe deine Seiten in Reihenfolge durch und prüfe:
  • Stellt eine Seite eine Frage, die die nächste Seite nochmal stellt? → ZUSAMMENLEGEN.
  • Folgt nach einer quest_decision sofort eine zweite quest_decision zur selben Situation? → ZUSAMMENLEGEN.
  • Erklärt eine Feedback-Seite etwas, das dem Nutzer schon klar ist? → KÜRZEN oder STREICHEN.
  • Macht der Spielweg in Worten Sinn ("Erst sehe ich Paul → dann entscheide ich → dann erfahre ich, ob es richtig war")? Wenn nein, neu sortieren.

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

• Für JEDE Situation/Szenario im Heyflow GENAU EIN Drei-Seiten-Pattern:
  1. quest_scene ODER quest_dialog als Einstieg/Kontext (KEINE choices, wenn die nächste Seite eine Entscheidung ist!)
  2. quest_decision ODER quest_quiz als Interaktion (genau eine pro Situation)
  3. quest_dialog ODER quest_scene als Feedback/Konsequenz (kurz, mit "Verstanden!"-choice)

• Mindestens 2 quest_decision MIT BRANCHING (zwei verschiedene Pfade):
  → Jeder Pfad MINDESTENS 2 Seiten lang
  → Pfade führen danach wieder zusammen (Konvergenz)

• Mindestens 2 quest_quiz (Wissens-/Verhaltensfragen)

• quest_dialog mit choices ist OPTIONAL — nur dort einsetzen, wo es ein
  echtes Gespräch ist (z.B. Kollegin gibt Anweisung, Nutzer reagiert).
  KEINE Pflicht-Anzahl. Lieber WENIGER Dialog-Choices als Doppelungen
  mit dem nachfolgenden quest_decision.

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
  → question: KURZ und prägnant — maximal 8–12 Wörter, EIN Satz. Die Frage ist die
    Headline im Player und wirkt bei langen Sätzen erschlagen. Beispiele:
      GUT: "Wie reagierst du, @vorname?"  /  "Was machst du jetzt?"
      SCHLECHT: "Luisa legt einen teuren Käse in den Wagen, der nicht auf dem
                 Einkaufszettel steht. Wie reagierst du, @vorname?"
    Setup/Kontext gehört in eine vorgelagerte quest_scene (description-Feld).
  → isWrong: true wenn objektiv falsch/gefährlich. Bei Branching immer false.
  → emoji: PFLICHT — JEDE Option in einem quest_decision MUSS ein UNTERSCHIEDLICHES
    Icon haben. Niemals dasselbe Icon (z.B. zweimal ThumbsDown) in einem Block.
    Wähle das Icon passend zum INHALT, nicht nur zu "richtig/falsch":
      Hände/Eingreifen → Hand, HandHelping  ·  Reden → MessageCircle, MessageSquare
      Beobachten → Eye, Clock  ·  Wegschauen → Ban, EyeOff  ·  Schützen → Shield, ShieldCheck
      Hilfe holen → Phone, Users, Bell  ·  Stoppen → StopCircle, Hand
      Gefährlich → AlertTriangle, OctagonAlert  ·  Zustimmen → ThumbsUp, CheckCircle
      Ablehnen → ThumbsDown, XCircle (nur EINMAL pro Block!)
      Geld → Wallet, ShoppingCart, Receipt  ·  Zeit → Clock, Hourglass, Timer
      Erklären → Lightbulb, BookOpen
    Allowlist (KEINE Erfindungen wie "DangerSign"):
    Briefcase, Star, Heart, Zap, Target, Users, Clock, Globe, Shield, ShieldCheck,
    Lightbulb, Rocket, TrendingUp, Award, CheckCircle, XCircle, ThumbsUp, ThumbsDown,
    Coffee, Smile, Frown, AlertTriangle, AlertCircle, HelpCircle, MessageCircle,
    MessageSquare, Phone, Mail, Clipboard, ClipboardCheck, Search, Settings, Flag,
    Bookmark, StopCircle, Ban, OctagonAlert, Hand, ShieldX, ShieldAlert,
    Eye, EyeOff, Bell, Hourglass, Timer, Wallet, ShoppingCart, Receipt, BookOpen,
    Sparkles, HeartPulse, HeartHandshake, Handshake, Cross, Pill
    Wenn unsicher: lieber CheckCircle / XCircle / AlertTriangle nehmen.

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

  // Include company jobs if available — AI should reference them in the lead form
  const companyJobs = session.company.successPage?.jobs ?? [];
  const jobsInfo = companyJobs.length > 0
    ? `\n\nBerufe des Unternehmens: ${companyJobs.map((j) => j.title).join(', ')}`
    : '';

  const userMessage = `${companyContext.join('\n')}${jobsInfo}\n\n══ HEYFLOW-INHALT (konvertiere diesen Prototyp in eine JobQuest) ══\n\n${textContent.slice(0, 24000)}`;

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

  // ── Pre-pass: dedupe consecutive same-question interactions ───────────────
  // Wenn das Modell trotz Prompt-Regel zwei aufeinanderfolgende Pages mit
  // derselben Entscheidungs-/Quizfrage produziert, droppen wir die zweite.
  // Defense in Depth gegen "Dialog mit choices + Decision mit derselben
  // Frage"-Doppelung.
  aiResult.pages = dedupeConsecutiveInteractions(aiResult.pages);

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
        // + Duplikat-Icons auflockern, damit jede Option visuell unterscheidbar ist.
        if (block.type === 'quest_decision' && Array.isArray(props.options)) {
          const resolved = (props.options as RawOption[]).map(({ nextPageIndex, ...rest }) => {
            if (typeof nextPageIndex === 'number' && pageIds[nextPageIndex]) {
              return { ...rest, targetPageId: pageIds[nextPageIndex] };
            }
            return rest;
          });
          props = { ...props, options: diversifyDecisionIcons(resolved) };
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

// ─── Decision-Icon Diversifier ───────────────────────────────────────────────
const ICON_POOLS = {
  negative: ['XCircle', 'ThumbsDown', 'AlertTriangle', 'OctagonAlert', 'StopCircle', 'Ban', 'Frown', 'EyeOff', 'ShieldX', 'AlertCircle'],
  positive: ['CheckCircle', 'ThumbsUp', 'Smile', 'Heart', 'Sparkles', 'ShieldCheck', 'HandHelping', 'Star', 'Award'],
  neutral: ['MessageCircle', 'MessageSquare', 'Hand', 'Eye', 'Clock', 'Hourglass', 'Lightbulb', 'BookOpen', 'Phone', 'Bell', 'HelpCircle', 'ClipboardCheck', 'Search', 'Wallet', 'ShoppingCart', 'Receipt'],
} as const;

function poolFor(icon: string): readonly string[] | null {
  if (ICON_POOLS.negative.includes(icon as never)) return ICON_POOLS.negative;
  if (ICON_POOLS.positive.includes(icon as never)) return ICON_POOLS.positive;
  if (ICON_POOLS.neutral.includes(icon as never)) return ICON_POOLS.neutral;
  return null;
}

function diversifyDecisionIcons<T extends { emoji?: string; isWrong?: boolean }>(options: T[]): T[] {
  const used = new Set<string>();
  return options.map((opt) => {
    const original = opt.emoji;
    if (!original) return opt;
    if (!used.has(original)) {
      used.add(original);
      return opt;
    }
    const pool = poolFor(original) ?? (opt.isWrong ? ICON_POOLS.negative : ICON_POOLS.neutral);
    const alt = pool.find((c) => !used.has(c));
    if (!alt) return opt;
    used.add(alt);
    return { ...opt, emoji: alt };
  });
}

// ─── Dedup helper ────────────────────────────────────────────────────────────

interface DedupePage {
  name: string;
  nextPageIndex?: number;
  hideLocationHint?: boolean;
  blocks: Array<{ type: string; props: Record<string, unknown> }>;
}

const STOP_WORDS = new Set([
  'wie','was','ist','der','die','das','dem','den','des','ein','eine','einen','und','oder','aber','dass','wenn','würdest','tust','reagierst','jetzt','tun','machst','machen','du','er','sie','es','auf','mit','bei','zu','in','im','für','vor','an','nach',
]);

function normalizeQuestion(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .replace(/@\w+/g, '')          // @vorname raus
    .replace(/[^\w\säöüß]/g, ' ')  // Satzzeichen
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .sort()
    .join(' ');
}

/** Sehr ähnliche Fragen erkennen — Jaccard-Ähnlichkeit über Token-Sets. */
function similar(a: string, b: string, threshold = 0.6): boolean {
  if (!a || !b) return false;
  const aSet = new Set(a.split(' '));
  const bSet = new Set(b.split(' '));
  let intersection = 0;
  aSet.forEach((t) => { if (bSet.has(t)) intersection++; });
  const union = aSet.size + bSet.size - intersection;
  if (union === 0) return false;
  return intersection / union >= threshold;
}

function pageInteractionQuestion(page: DedupePage): string {
  for (const block of page.blocks ?? []) {
    if (block.type === 'quest_decision' || block.type === 'quest_quiz') {
      return normalizeQuestion(block.props?.question);
    }
    if (block.type === 'quest_dialog') {
      const choices = block.props?.choices;
      if (Array.isArray(choices) && choices.length > 0) {
        // Letzte Sprecher-Zeile als Frage interpretieren (Modell stellt
        // typischerweise dort die Wahl-Frage).
        const lines = block.props?.lines;
        if (Array.isArray(lines)) {
          const last = [...lines].reverse().find((l) =>
            l && typeof l === 'object' && typeof (l as { text?: unknown }).text === 'string',
          ) as { text?: string } | undefined;
          return normalizeQuestion(last?.text);
        }
      }
    }
  }
  return '';
}

/**
 * Erkennt aufeinanderfolgende Pages, die dieselbe Entscheidungsfrage stellen,
 * und entfernt die schwächere (= dialog-with-choices vor decision wird gedropt,
 * sonst die zweite). Greift, wenn die KI die L1-Regel ignoriert.
 */
function dedupeConsecutiveInteractions(pages: DedupePage[]): DedupePage[] {
  const out: DedupePage[] = [];
  for (let i = 0; i < pages.length; i++) {
    const cur = pages[i];
    const next = pages[i + 1];
    const curQ = pageInteractionQuestion(cur);
    const nextQ = next ? pageInteractionQuestion(next) : '';
    if (curQ && nextQ && similar(curQ, nextQ)) {
      // Beide stellen dieselbe Frage. Wir behalten quest_decision/quest_quiz
      // (echte Wahl mit Konsequenzen) und droppen den dialog-mit-choices.
      const curIsDecision = cur.blocks.some((b) => b.type === 'quest_decision' || b.type === 'quest_quiz');
      if (curIsDecision) {
        out.push(cur);
        i++; // skip next
      } else {
        // cur ist dialog-with-choices, next ist decision → dialog droppen,
        // aber Setup-Lines des Dialogs erhalten wir nicht — der next.dialog
        // ist meist sowieso reicher. Skip cur, push next im nächsten Loop.
        // Wir loggen für Debug.
        console.warn('[import-heyflow] Doppelte Frage erkannt, entferne dialog-mit-choices:', curQ.slice(0, 60));
        // Kein push — fahren mit next fort.
      }
    } else {
      out.push(cur);
    }
  }
  return out;
}
