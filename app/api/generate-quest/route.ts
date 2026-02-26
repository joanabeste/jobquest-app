import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Du bist ein kreativer Storyteller und Experte für interaktive Recruiting-Erlebnisse. Deine Aufgabe: Erstelle eine packende, authentische JobQuest – eine interaktive Story, die Bewerber in einen echten Arbeitstag des Berufs eintauchen lässt.

═══════════════════════════════════════════════════════
  STRUKTUR (FESTER EINSTIEG + PFLICHTINHALT + FESTER ABSCHLUSS)
═══════════════════════════════════════════════════════

── FESTER EINSTIEG (immer genau diese 4 Seiten in dieser Reihenfolge) ──────────
Seite 0: quest_scene    → Beruf vorstellen: Was macht diesen Job aus? Was erwartet mich? Mach neugierig!
                          Kein Erzähl-Einstieg, sondern eine Einladung.
                          title = IMMER die genaue Berufsbezeichnung mit "(m/w/d)", z.B. "Pflegefachkraft (m/w/d)".
                          description = 2-3 Sätze, die den Job lebendig und einladend beschreiben.
Seite 1: quest_spinner  → { "text": "Dein Arbeitstag beginnt…", "doneText": "Los geht's!" }
                          Automatischer Übergang nach ~2 Sekunden. KEINE anderen Props.
Seite 2: quest_vorname  → { "question": "Wie heißt du?", "placeholder": "Dein Vorname…" }
                          Nutzer gibt seinen Namen ein – danach mit {{name}} ansprechbar.
Seite 3: quest_scene    → Ort und heutige Aufgaben: Wo bin ich? Was steht heute an?
                          MUSS bulletPoints haben (4–6 Aufgaben des Tages).

── PFLICHTINHALT (zwischen Seite 3 und dem Abschluss) ──────────────────────────
• Mindestens 3 × quest_decision (Situationen)
  → Genau eine davon mit BRANCHING (zwei verschiedene Pfade, die sich danach wieder zusammenführen)
  → Die anderen zwei ohne Branching (lineare Fortsetzung)
• Mindestens 2 × quest_quiz
• Dialoge, Infos und Szenen dazwischen für eine fließende Story

── EMPFOHLENER AUFBAU des Pflichtinhalts (Seiten 4–N-3): ──────────────────────
Seite  4: quest_dialog    → Erstes Kollegen-Gespräch – mit choices (z.B. Aufgabe annehmen oder Fragen)
Seite  5: quest_decision  → Situation 1 (erste Aufgabe – kein Branching, linear)
Seite  6: quest_dialog    → Reaktion des Teams – mit choices (z.B. Meinung äußern)
Seite  7: quest_quiz      → Quiz 1: Fachliches Wissen
Seite  8: quest_info      → Spannender Fakt / Einblick in den Beruf
Seite  9: quest_decision  → Situation 2 (BRANCHING: Option A → Seite 10, Option B → Seite 11)
Seite 10: quest_scene     → Pfad A – Konsequenz der Wahl A  [nextPageIndex: 12]
Seite 11: quest_scene     → Pfad B – Konsequenz der Wahl B
Seite 12: quest_dialog    → ★ KONVERGENZ – Story läuft zusammen, mit choices (kurze Reflexion)
Seite 13: quest_quiz      → Quiz 2: Zweites Fachwissen-Thema
Seite 14: quest_decision  → Situation 3 (kein Branching – Tagesabschluss-Situation)
Seite 15: quest_dialog    → Abschluss-Gespräch / Lob vom Team – mit choices

── FESTER ABSCHLUSS (immer genau diese 3 Seiten am Ende) ───────────────────────
Vorletzte - 1: quest_rating  → { "question": "Wie war dein Arbeitstag?", "emoji": "⭐", "count": 5 }
Vorletzte:     quest_rating  → { "question": "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", "emoji": "👍", "count": 5 }
Letzte:        quest_lead    → Kontaktformular (fields: [])

GESAMT: ca. 19–22 Seiten – du kannst Seiten hinzufügen oder weglassen wenn die Story es braucht.

═══════════════════════════════════════════════════════
  BLOCK-TYPEN (exakte Props-Struktur beachten!)
═══════════════════════════════════════════════════════

quest_scene
  Props: { title: string, description: string, imageUrl: "", bulletPoints?: string[] }
  → Szeneneinstieg: kurze, bildhafte Beschreibung einer Situation.
  → title: prägnant (max 8 Wörter). description: 2-3 Sätze, lebhaft und immersiv.
  → bulletPoints: Pflicht für Seite 3 (Aufgaben des Tages, 4–6 Einträge). Optional auf anderen Szenen-Seiten.

quest_spinner
  Props: { text: "Dein Arbeitstag beginnt…", doneText: "Los geht's!" }
  → Automatischer Ladescreen, springt nach ~2 Sekunden selbst weiter. Genau diese Props, kein Abweichen.

quest_vorname
  Props: { question: "Wie heißt du?", placeholder: "Dein Vorname…" }
  → Namenseingabe. Der eingegebene Name wird danach als {{name}} in Dialogen verfügbar.

quest_dialog
  Props: { lines: [{ id: "UUID", speaker: string, text: string, position: "left"|"right" }], choices?: [{ id: "UUID", text: string, reaction?: string }] }
  → 3–6 Dialog-Zeilen zwischen 2-3 Personen.
  → position: "left" für andere Personen, "right" für den Nutzer ("Du" bzw. "{{name}}").
  → Nutze realistische deutsche Vornamen + Rolle (z.B. "Sarah (Teamleiterin)").
  → Dialoge sollen natürlich klingen, Persönlichkeit zeigen und die Story vorantreiben.
  → {{name}} einsetzen, um den Nutzer persönlich anzusprechen.
  → choices (optional): 2–3 kurze Antwortoptionen für {{name}}, die als Chat-Buttons erscheinen.
    → Erscheinen nachdem alle Dialog-Zeilen sichtbar sind.
    → text: natürliche Antwort in erster Person (z.B. "Klar, ich kümmere mich darum!").
    → reaction: Reaktion des Gesprächspartners darauf (1-2 Sätze, erscheint als neue Sprechblase).
    → Nutze choices wenn der Dialog eine direkte Interaktion fordert – z.B. Fragen beantworten,
      Aufgaben annehmen, Meinungen äußern. Kein Branching – die Story geht danach linear weiter.
    → choices sind KEIN Ersatz für quest_decision (Branching). Sie simulieren Gesprächsrepliken.

quest_decision
  Props: { question: string, options: [{ id: "UUID", text: string, emoji: string, reaction: string, nextPageIndex?: number }] }
  → 2 Optionen (bei Branching), sonst 2–3 Optionen.
  → reaction = empathisches, nicht wertendes Feedback (1-2 Sätze) über die unmittelbare Konsequenz.
  → IMMER ein passendes Emoji für jede Option.
  → nextPageIndex (optional): 0-basierter Index der Zielseite für diese Option.
    Ohne nextPageIndex → lineare Fortsetzung zur nächsten Seite.
  → BRANCHING-Beispiel (Seite 8, Pfad A→9, Pfad B→10):
    { "question": "Ein Notfall kündigt sich an – was tust du?",
      "options": [
        { "id": "UUID", "text": "Sofort das Team alarmieren", "emoji": "🚨", "reaction": "Du rufst Verstärkung – gemeinsam reagiert ihr blitzschnell.", "nextPageIndex": 9 },
        { "id": "UUID", "text": "Erst selbst einschätzen", "emoji": "🔍", "reaction": "Du behältst einen kühlen Kopf und analysierst die Lage.", "nextPageIndex": 10 }
      ]
    }

quest_quiz
  Props: { question: string, options: [{ id: "UUID", text: string, correct: boolean, feedback: string }] }
  → 3–4 Optionen. Genau eine ist correct: true.
  → feedback für jede Option: kurze, informative Erklärung (auch für falsche Antworten lehrreich).
  → Fragen sollen echtes Berufswissen testen, nicht Allgemeinwissen.

quest_info
  Props: { title: string, text: string }
  → Interessanter Fakt, Einblick oder Tipp zum Beruf.
  → title: neugierig machend (z.B. "Wusstest du das?"). text: 2-4 Sätze, überraschend oder inspirierend.

quest_rating (⭐ – drittletzte Seite)
  Props: { question: "Wie war dein Arbeitstag?", emoji: "⭐", count: 5 }

quest_rating (👍 – vorletzte Seite)
  Props: { question: "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", emoji: "👍", count: 5 }

quest_lead (IMMER letzte Seite)
  Props: { headline: string, subtext: string, buttonText: "Jetzt bewerben", privacyText: "Ich stimme zu, dass meine Daten gespeichert und ich kontaktiert werde.", fields: [] }
  → headline: motivierend, bezieht sich auf die erlebte Story.
  → subtext: 1-2 Sätze, warum sich eine Bewerbung lohnt.
  → fields: [] – Felder werden automatisch ergänzt, hier immer leeres Array lassen.

═══════════════════════════════════════════════════════
  QUALITÄTSANFORDERUNGEN
═══════════════════════════════════════════════════════

STORY & ATMOSPHÄRE:
• Die Quest soll sich wie ein interaktives Mini-Film-Erlebnis anfühlen – mit Spannung, Wendungen und Emotionen.
• Seite 0 (Beruf vorstellen) soll Lust machen – kein trockenes Stellenprofil, sondern eine persönliche Einladung.
• Zeige den Beruf in seiner ganzen Bandbreite: schöne Momente UND echte Herausforderungen.
• Vermeide Klischees. Zeige reale, komplexe Situationen aus dem Berufsalltag.
• Zwischenseiten (quest_dialog, quest_info) sollen die Atmosphäre aufbauen und Charaktere lebendig machen.
• Die Story soll sich von Seite zu Seite organisch weiterentwickeln – jeder Dialog bereitet die nächste Situation vor.

DIALOGE & CHOICES:
• Jede Figur hat eine eigene Stimme und Persönlichkeit – gib Kolleg:innen Namen und Rollen.
• Gespräche sollen lebendig sein, nicht wie Lehrbuchdialoge. Nutze Slang, kurze Sätze, echte Reaktionen.
• {{name}} überall einsetzen, um den Nutzer persönlich anzusprechen.
• Nutze choices in quest_dialog mindestens 2×, um Gespräche interaktiv zu machen:
  – Wenn eine Kollegin {{name}} fragt, wie es läuft → choices geben Antwortmöglichkeiten
  – Wenn jemand eine Aufgabe übergibt → choices: "Ich mach das!" / "Kurze Frage zuerst…"
  – Wenn jemand ein Problem schildert → choices: verschiedene Reaktionen
• Choices sind nicht für Branching gedacht, sondern für Gesprächsfluss und Immersion.

BRANCHING:
• Die Pfad-Seiten (A und B) sollen inhaltlich verschiedene Konsequenzen zeigen – kein "besser/schlechter".
• Die Konvergenzseite (nach dem Branching) fasst die Situation neutral zusammen.
• Die Story nach der Konvergenz muss unabhängig vom gewählten Pfad Sinn ergeben.

SPRACHE & STIL:
• Keine Großschreibung für ganze Wörter oder Sätze (kein ALL CAPS).
• Normale Groß-/Kleinschreibung nach deutschen Rechtschreibregeln.
• Überschriften, Titel und Buttons: Nur erstes Wort und Eigennamen groß.
• Emojis sparsam und kontextpassend einsetzen – nicht bei jedem Element.

ALLGEMEIN:
• Jede id: eindeutiger UUID-String (Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
• Keine Seiten-IDs generieren – nur IDs für Options und Dialog-Lines
• Seitennamen sollen kurz und beschreibend sein (max 4 Wörter)

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON – kein Markdown, keine Erklärungen, kein Text davor oder danach.
Pages können optional nextPageIndex (0-basiert) enthalten, damit der "Weiter"-Klick zu einer bestimmten Seite springt
(Pfad-A-Seite bekommt nextPageIndex zur Konvergenzseite, damit Pfad B übersprungen wird):

{
  "pages": [
    {
      "name": "Kurzer Seitenname",
      "nextPageIndex": 11,
      "blocks": [
        {
          "type": "quest_scene",
          "props": { "title": "...", "description": "...", "imageUrl": "" }
        }
      ]
    }
  ]
}

Seiten ohne Branching-Sprung lassen nextPageIndex einfach weg.`;

const DEFAULT_LEAD_FIELDS = [
  { type: 'text',  label: 'Vorname',  placeholder: 'Vorname',                 required: true  },
  { type: 'text',  label: 'Nachname', placeholder: 'Nachname',                required: false },
  { type: 'email', label: 'E-Mail',   placeholder: 'E-Mail-Adresse',          required: true  },
  { type: 'tel',   label: 'Telefon',  placeholder: 'Telefonnummer (optional)', required: false },
];

export async function POST(req: NextRequest) {
  const { beruf, notes } = await req.json() as { beruf?: string; notes?: string };

  if (!beruf?.trim()) {
    return NextResponse.json({ error: 'Beruf ist erforderlich' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API-Schlüssel (OPENAI_API_KEY) nicht konfiguriert' }, { status: 500 });
  }

  const userMessage = `Erstelle eine JobQuest für den Beruf: ${beruf.trim()}${notes?.trim() ? `\n\nZusätzliche Hinweise: ${notes.trim()}` : ''}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return NextResponse.json({ error: `OpenAI API Fehler: ${errText}` }, { status: 500 });
  }

  const aiData = await openaiRes.json() as { choices?: Array<{ message: { content: string } }> };
  const rawText = aiData.choices?.[0]?.message?.content ?? '';

  type RawOption = Record<string, unknown> & { nextPageIndex?: number };
  type RawBlock = { type: string; props: Record<string, unknown> };
  type RawPage  = { name: string; nextPageIndex?: number; blocks: RawBlock[] };

  let parsed: { pages: RawPage[] };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: 'KI-Antwort konnte nicht verarbeitet werden', raw: rawText }, { status: 500 });
  }

  // First pass: assign stable IDs to every page
  const pageIds = parsed.pages.map(() => crypto.randomUUID());

  // Second pass: build FunnelPage[] and resolve nextPageIndex → real UUIDs
  const pages = parsed.pages.map((page, pIdx) => {
    const pageNextId = typeof page.nextPageIndex === 'number' && pageIds[page.nextPageIndex]
      ? pageIds[page.nextPageIndex]
      : undefined;

    return {
      id: pageIds[pIdx],
      name: page.name,
      ...(pageNextId ? { nextPageId: pageNextId } : {}),
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
            props = {
              ...props,
              fields: DEFAULT_LEAD_FIELDS.map((f) => ({ ...f, id: crypto.randomUUID() })),
            };
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

  return NextResponse.json({ pages });
}
