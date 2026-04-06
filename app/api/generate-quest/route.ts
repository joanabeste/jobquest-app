import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized } from '@/lib/api-auth';

const SYSTEM_PROMPT = `Du bist ein kreativer Storyteller und Experte für interaktive Recruiting-Erlebnisse. Deine Aufgabe: Erstelle eine packende, authentische JobQuest – eine interaktive Story, die Bewerber in einen echten Arbeitstag des Berufs eintauchen lässt.

WICHTIG – STORY-KOHÄRENZ:
• Die Story muss sich wie ein zusammenhängender Film anfühlen. Jede Seite baut logisch auf der vorherigen auf.
• Charaktere, die früh eingeführt werden, tauchen später wieder auf.
• Entscheidungen haben spürbare Konsequenzen – die Story entwickelt sich konsistent.
• Kein Szenenbruch ohne Überleitung. Wenn die Situation wechselt, erkläre kurz warum.

═══════════════════════════════════════════════════════
  STRUKTUR (FESTER EINSTIEG + PFLICHTINHALT + FESTER ABSCHLUSS)
═══════════════════════════════════════════════════════

── FESTER EINSTIEG (immer genau diese Seiten in dieser Reihenfolge) ──────────
Seite 0: quest_scene    → Beruf vorstellen: Was macht diesen Job aus? Was erwartet mich? Mach neugierig!
                          Kein Erzähl-Einstieg, sondern eine Einladung.
                          title = IMMER die genaue Berufsbezeichnung mit "(m/w/d)", z.B. "Pflegefachkraft (m/w/d)".
                          description = 2-3 Sätze, die den Job lebendig und einladend beschreiben.
Seite 1: quest_spinner  → { "text": "Dein Arbeitstag beginnt…", "doneText": "Los geht's!" }
                          Automatischer Übergang nach ~2 Sekunden. KEINE anderen Props.
Seite 2: quest_dialog   → PFLICHT: Namensabfrage über Gespräch.
                          Eine Kollegin stellt sich vor und fragt natürlich nach dem Namen.
                          MUSS input enthalten: { "placeholder": "Vorname", "captures": "vorname", "followUpText": "Schön dich kennenzulernen, @vorname!" }
                          4–6 Dialog-Zeilen bevor das input erscheint.
                          Beispiel: "Hallo! Ich bin Sarah. Ich zeige dir heute alles. Wie heißt du?"
                          KEIN quest_vorname Block – ausschließlich quest_dialog mit input verwenden!
Seite 3: quest_scene    → Ort und heutige Aufgaben: Wo bin ich? Was steht heute an?
                          MUSS bulletPoints haben (4–6 Aufgaben des Tages).
                          description soll den Nutzer direkt mit @vorname ansprechen.

── PFLICHTINHALT (zwischen Seite 3 und dem Abschluss) ──────────────────────────
• Mindestens 3 × quest_decision (Situationen)
  → MINDESTENS 2 davon mit BRANCHING (zwei verschiedene Pfade, die sich danach wieder zusammenführen)
  → Jeder Pfad muss MINDESTENS 2 Seiten lang sein (z.B. quest_scene + quest_dialog), bevor die Story wieder zusammenläuft
  → Die verbleibenden Entscheidungen: ohne Branching (lineare Fortsetzung)
• Mindestens 2 × quest_quiz
• Dialoge, Infos und Szenen dazwischen für eine fließende Story

── EMPFOHLENER AUFBAU des Pflichtinhalts (Seiten 4–N-3): ──────────────────────
Hinweis: [PAGE nextPageIndex: X] bedeutet, dass die Seite selbst nextPageIndex:X bekommt
         (damit der "Weiter"-Button Pfad B überspringt). Sieh auch BRANCHING-MECHANISMUS.

Seite  4: quest_dialog    → Erstes Kollegen-Gespräch – 5–7 Zeilen, mit choices (Aufgabe annehmen oder Fragen)
Seite  5: quest_decision  → BRANCHING 1 (Option A → nextPageIndex:6, Option B → nextPageIndex:8)
Seite  6: quest_scene     → Pfad A, Teil 1 – unmittelbare Konsequenz der Wahl A
Seite  7: quest_dialog    → Pfad A, Teil 2 – Entwicklung Wahl A  [PAGE nextPageIndex:10]
Seite  8: quest_scene     → Pfad B, Teil 1 – unmittelbare Konsequenz der Wahl B
Seite  9: quest_dialog    → Pfad B, Teil 2 – Entwicklung Wahl B  (kein nextPageIndex)
Seite 10: quest_scene     → ★ KONVERGENZ 1 – neutral, passt zu beiden Pfaden
Seite 11: quest_quiz      → Quiz 1: Fachliches Wissen aus dem bisher Erlebten
Seite 12: quest_info / quest_hotspot / quest_sort  → Typ je nach Story wählen:
                          quest_hotspot: Ort, Raum oder Gerät in der Story → Nutzer erkundet ihn
                          quest_sort: Ablauf oder Prozessschritte → Nutzer bringt sie in Reihenfolge
                          quest_info: Überraschender Berufsfakt ohne Interaktion
Seite 13: quest_decision  → BRANCHING 2 (Option A → nextPageIndex:14, Option B → nextPageIndex:16)
Seite 14: quest_scene     → Pfad A, Teil 1 – Konsequenz der Wahl A
Seite 15: quest_dialog    → Pfad A, Teil 2 – Entwicklung Wahl A  [PAGE nextPageIndex:18]
Seite 16: quest_scene     → Pfad B, Teil 1 – Konsequenz der Wahl B
Seite 17: quest_dialog    → Pfad B, Teil 2 – Entwicklung Wahl B  (kein nextPageIndex)
Seite 18: quest_scene     → ★ KONVERGENZ 2 – neutral, passt zu beiden Pfaden
Seite 19: quest_quiz      → Quiz 2: Zweites Fachwissen-Thema
Seite 20: quest_decision  → Situation 3 – lineares Tagesabschluss-Dilemma (kein Branching)
Seite 21: quest_dialog    → Abschluss-Gespräch / Lob vom Team – 6–8 Zeilen, mit choices

── FESTER ABSCHLUSS (immer genau diese 3 Seiten am Ende) ───────────────────────
Vorletzte - 1: quest_rating  → { "question": "Wie war dein Arbeitstag?", "emoji": "⭐", "count": 5 }
Vorletzte:     quest_rating  → { "question": "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", "emoji": "👍", "count": 5 }
Letzte:        quest_lead    → Kontaktformular (fields: [])

GESAMT: ca. 25–28 Seiten – du kannst weitere Seiten hinzufügen wenn die Story es braucht.

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

quest_dialog
  Props: { lines: [{ id: "UUID", speaker: string, text: string, position: "left"|"right" }], choices?: [{ id: "UUID", text: string, reaction?: string }], input?: { placeholder: string, captures?: string, followUpText?: string } }
  → 4–8 Dialog-Zeilen zwischen 2-3 Personen. Mindestens ein Dialog im Pflichtinhalt soll 6+ Zeilen haben.
  → position: "left" = Kolleg:in oder andere Person spricht | "right" = der Nutzer (@vorname) spricht.
    Zeilen des Nutzers sind kurze Reaktionen ("Verstanden!" / "Mach ich sofort.") — kein Monolog.
  → speaker: Realistische deutsche Vornamen + Rolle (z.B. "Sarah (Teamleiterin)", "Dr. Meier", "Du").
    Bei position "right" immer speaker "@vorname" oder "Du" verwenden.
  → @vorname in Zeilen anderer Personen einsetzen, um den Nutzer direkt anzusprechen.
  → choices (optional): 2–3 kurze Antwortoptionen als Chat-Buttons — erscheinen nach allen Dialog-Zeilen.
    → text: Erste-Person-Antwort (z.B. "Klar, ich übernehme das!").
    → reaction: Kurze Reaktion des Gesprächspartners (1-2 Sätze, erscheint als neue Sprechblase).
    → Nutze choices bei direkten Fragen, Aufgaben-Übergaben, Meinungsabfragen.
    → choices sind KEIN Branching — die Story läuft danach immer linear weiter.
  → input (optional): Texteingabe am Ende — nur für direkte Fragen wie "Wie heißt du?".
    → captures: "vorname" → Antwort wird als @vorname im Rest der Quest verfügbar.
    → followUpText: Reaktion der Kollegin darauf (z.B. "Schön dich kennenzulernen, @vorname!").

quest_decision
  Props: { question: string, options: [{ id: "UUID", text: string, emoji: string, reaction: string, nextPageIndex?: number }] }
  → question: Konkrete Situation mit Handlungsdruck — kein abstraktes "Was würdest du tun?", sondern
    eine lebendige Beschreibung: "Ein Alarm piept. Du siehst, dass Patient 4 unruhig wird. Was tust du?"
  → 2 Optionen bei Branching, sonst 2–3. Keine "richtige" Option — beide Wege sind valide.
  → reaction: Kurze, empathische Konsequenz (1-2 Sätze) — zeigt unmittelbare Folge, nicht Bewertung.
  → emoji: NUR Icon-Namen aus dieser Liste (kein Emoji-Zeichen wie 🚨 oder 👍):
    Briefcase, Star, Heart, Zap, Target, Users, Clock, Globe, Shield, Lightbulb,
    Rocket, TrendingUp, Award, CheckCircle, XCircle, ThumbsUp, ThumbsDown,
    Coffee, Smile, AlertTriangle, HelpCircle, MessageCircle, Phone, Mail,
    Clipboard, Search, Settings, Flag, Bookmark

BRANCHING-MECHANISMUS — ZWEI Arten von nextPageIndex, beide nötig:

  (A) OPTION-LEVEL nextPageIndex: Wohin führt eine bestimmte Wahl?
      Setze nextPageIndex in der Option selbst → bestimmt die erste Seite des jeweiligen Pfades.

  (B) PAGE-LEVEL nextPageIndex: Wohin geht der "Weiter"-Button am Ende einer Pfad-Seite?
      Setze nextPageIndex auf der PAGE (nicht im Block) → lässt den anderen Pfad überspringen.

  VOLLSTÄNDIGES BEISPIEL (Branching 1, entspricht empfohlenem Aufbau):

  Seite 5 — quest_decision (OPTION-LEVEL nextPageIndex in den Optionen):
    { "question": "Ein Notfall kündigt sich an – was tust du?",
      "options": [
        { "id": "UUID", "text": "Sofort das Team alarmieren", "emoji": "Users",
          "reaction": "Ihr reagiert blitzschnell als Team.", "nextPageIndex": 6 },
        { "id": "UUID", "text": "Erst selbst die Lage einschätzen", "emoji": "Search",
          "reaction": "Du behältst Ruhe und analysierst.", "nextPageIndex": 8 }
      ] }

  Seite 7 — letzte Seite von Pfad A — PAGE-LEVEL nextPageIndex:
    { "name": "Pfad A: Fazit", "nextPageIndex": 10, "blocks": [...] }
    → "Weiter" springt zu Seite 10 (Konvergenz), überspringt Seite 8 und 9 (Pfad B)

  Seite 9 — letzte Seite von Pfad B — KEIN nextPageIndex:
    → läuft automatisch zu Seite 10 weiter

  Seite 10 — Konvergenz: kein nextPageIndex, passt inhaltlich zu BEIDEN Pfaden

  Analog für Branching 2 (Seite 13, Pfad A→14+15, Pfad B→16+17, Konvergenz→18):
    Seite 13: Option A → nextPageIndex:14, Option B → nextPageIndex:16
    Seite 15: PAGE nextPageIndex:18
    Seite 17: kein nextPageIndex

quest_quiz
  Props: { question: string, options: [{ id: "UUID", text: string, correct: boolean, feedback: string }] }
  → 3–4 Optionen. Genau eine ist correct: true.
  → feedback für jede Option: kurze, informative Erklärung (auch für falsche Antworten lehrreich).
  → Fragen sollen echtes Berufswissen testen, nicht Allgemeinwissen.

quest_info
  Props: { title: string, text: string }
  → Interessanter Fakt, Einblick oder Tipp zum Beruf.
  → title: neugierig machend (z.B. "Wusstest du das?"). text: 2-4 Sätze, überraschend oder inspirierend.

quest_hotspot
  Props: { imageUrl: "", hotspots: [{ id: "UUID", x: number, y: number, label: string, description: string, icon?: string }], requireAll: boolean, doneText: string }
  → Bild mit anklickbaren Pins – Nutzer klickt Punkte an um mehr zu erfahren.
  → Ideal für: Arbeitsräume, Geräte, Werkzeuge, Orte entdecken.
  → imageUrl: "" (Bild wird im Editor hochgeladen — leer lassen).
  → hotspots: 3–5 Pins. Labels kurz (2-4 Wörter), descriptions 1-2 informative/spannende Sätze.
    x, y: Position in Prozent (0–100). Verteile Pins auf verschiedene Bereiche (z.B. 20/30, 70/20, 50/70, 30/65).
  → requireAll: true damit Nutzer alle Punkte sieht bevor er weitermacht.
  → doneText: passend zur Situation, z.B. "Alles erkundet!" oder "Weiter erkunden".
  → Beispiel: "Erkunde die Intensivstation" mit Pins für Monitor, Medikamentenschrank, Pflegebett, Notrufanlage.

quest_sort
  Props: { question: string, items: [{ id: "UUID", text: string, correctIndex?: number }], showFeedback: boolean, feedbackText: string, shuffleItems: boolean }
  → Nutzer bringt eine Liste von Elementen per ↑↓-Buttons in die richtige Reihenfolge.
  → Ideal für: Handlungsabläufe, Prioritäten setzen, Prozessschritte kennenlernen.
  → question: direkte Aufgabenstellung (z.B. "Bring die Schritte in die richtige Reihenfolge!").
  → items: 4–6 Elemente. correctIndex (0-basiert) setzen wenn es eine richtige Reihenfolge gibt
    (0 = das Element das an erster Stelle stehen soll, 1 = zweite Stelle, usw.).
  → showFeedback: true wenn correctIndex gesetzt ist — dann erscheint nach Bestätigen grünes/rotes Feedback.
  → feedbackText: positiv und informativ (z.B. "Genau! So läuft es in der Praxis ab.").
  → shuffleItems: true (Standard – Items werden beim Laden zufällig gemischt).
  → Beispiel: "Bring die Schritte der Patientenaufnahme in die richtige Reihenfolge"
    Items: Empfang, Versicherungsprüfung, Erstanamnese, Arzt informieren, Bett zuweisen

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
• Die Quest ist kein Stellenprofil — sie ist eine interaktive Erfahrung. Bewerber sollen vergessen, dass sie eine Bewerbung machen.
• Seite 0: Beginne mit einem starken Hook — ein Versprechen, ein Widerspruch, eine überraschende Aussage über den Beruf.
  Beispiel: "Du rettest nicht nur Leben — manchmal rettest du auch den Tag von jemandem mit einem Lächeln."
  Kein Aufzählen von Anforderungen. Kein "Wir suchen…". Nur: Was macht diesen Job einzigartig?
• Die Story braucht einen Spannungsbogen: Am Anfang ruhig ankommen → Mitte eskaliert (Entscheidungen, Konflikte) → Ende befriedigend auflösen.
• Charaktere, die früh eingeführt werden, tauchen später wieder auf. Kolleg:innen sind echte Persönlichkeiten mit Eigenheiten.
• Zeige den Beruf ehrlich: schöne Momente UND echte Herausforderungen. Keine Hochglanz-Werbung.
• Vermeide Klischees: kein "harmonisches Team", keine "spannenden Herausforderungen" ohne Kontext.
• Jede Seite hat eine Funktion — kein Füller. Jeder Dialog treibt die Story voran oder baut Beziehung auf.

DIALOGE & CHOICES:
• Jede Figur hat eine eigene Stimme und Persönlichkeit – gib Kolleg:innen Namen und Rollen.
• Gespräche sollen lebendig sein, nicht wie Lehrbuchdialoge. Nutze Slang, kurze Sätze, echte Reaktionen.
• @vorname überall einsetzen, um den Nutzer persönlich anzusprechen.
• Nutze choices in quest_dialog mindestens 2×, um Gespräche interaktiv zu machen:
  – Wenn eine Kollegin @vorname fragt, wie es läuft → choices geben Antwortmöglichkeiten
  – Wenn jemand eine Aufgabe übergibt → choices: "Ich mach das!" / "Kurze Frage zuerst…"
  – Wenn jemand ein Problem schildert → choices: verschiedene Reaktionen
• Choices sind nicht für Branching gedacht, sondern für Gesprächsfluss und Immersion.

BRANCHING:
• MINDESTENS 2 quest_decision mit Branching – mehr machen die Story spannender.
• Jeder Pfad (A und B) umfasst MINDESTENS 2 Seiten – eine quest_scene und ein quest_dialog, oder zwei Seiten die inhaltlich zusammenhängen.
• Die Pfad-Seiten sollen inhaltlich verschiedene Konsequenzen zeigen – kein "besser/schlechter", beide Wege sind valide.
• Die letzte Seite von Pfad A muss nextPageIndex zur Konvergenzseite enthalten, damit Pfad B übersprungen wird.
• Die Konvergenzseite fasst die Situation neutral zusammen und ergibt Sinn egal welchen Pfad man gewählt hat.
• Die Story nach der Konvergenz muss unabhängig vom gewählten Pfad logisch und konsistent sein.

INTERAKTIVITÄT & BLOCKVIELFALT:
• Nutze die volle Bandbreite aller Block-Typen – nicht nur quest_scene und quest_dialog.
• Vermeide mehrere gleichartige Blöcke direkt hintereinander (z.B. zwei quest_scene ohne Interaktion dazwischen).
• Setze quest_hotspot ein wenn ein Ort, Raum oder Gerät in der Story auftaucht.
• Setze quest_sort ein wenn Abläufe, Reihenfolgen oder Prioritäten thematisiert werden.
• Die Quest soll sich wie ein interaktives Filmerlebnis anfühlen: Spannung, Wendungen, echte Charaktere.
• Pflicht pro Quest: mindestens 3 × quest_decision, 2 × quest_quiz, 1 × quest_dialog mit choices,
  und mindestens 1 × quest_sort ODER quest_hotspot (je nach Beruf und Storytelling).

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
  { type: 'tel',   label: 'Telefon',  placeholder: 'Telefonnummer', required: false },
];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

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
