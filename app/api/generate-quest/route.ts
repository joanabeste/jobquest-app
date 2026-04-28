import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

// Hard caps to limit prompt-injection blast-radius and OpenAI cost.
// Image URLs must be HTTPS and bounded in count; the model will only ever
// see allowlisted URLs because the body filters them too.
const GenerateQuestSchema = z.object({
  beruf: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  imageUrls: z
    .array(z.string().url().startsWith('https://').max(2000))
    .max(10)
    .optional()
    .default([]),
});

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
Seite 0: quest_scene    → Willkommensseite: Einladung zum virtuellen Arbeitstag.
                          hideLocationHint = true (Seitenname wird NICHT im Player angezeigt).
                          title = "Willkommen bei [Firmenname]" (exakter Firmenname aus dem Kontext).
                          subtext = "Erlebe virtuell einen typischen Arbeitstag als:"
                          accentText = Berufsbezeichnung mit "(m/w/d)", z.B. "Auszubildende Pflegefachkraft (m/w/d)".
                          description = "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen."
                          buttonText = "Alles klar, verstanden!"
                          Falls Bilder mitgeschickt: imageUrl = das beste/repräsentativste Bild.
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
Seite 12: quest_info / quest_hotspot / quest_zuordnung  → Typ je nach Story wählen:
                          quest_hotspot: Ort, Raum oder Gerät in der Story → Nutzer erkundet ihn
                          quest_zuordnung: Begriffe/Konzepte → Nutzer ordnet sie den richtigen Erklärungen zu
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

GESAMT: ca. 18–22 Seiten. Die Quest soll in ca. 3 Minuten durchspielbar sein.

═══════════════════════════════════════════════════════
  BLOCK-TYPEN (exakte Props-Struktur beachten!)
═══════════════════════════════════════════════════════

quest_scene
  Props: { title: string, description: string, imageUrl: "", subtext?: string, accentText?: string, buttonText?: string, bulletPoints?: string[] }
  → Szeneneinstieg: kurze, bildhafte Beschreibung einer Situation.
  → title: prägnant (max 8 Wörter). description: 2-3 Sätze, lebhaft und immersiv.
  → subtext: optionaler Einleitungstext unter dem Titel (z.B. "Erlebe virtuell einen typischen Arbeitstag als:").
  → accentText: optionaler Text in Akzentfarbe (z.B. Jobtitel). Wird farbig hervorgehoben.
  → buttonText: optionaler eigener CTA-Button (z.B. "Alles klar, verstanden!"). Ersetzt den Standard-"Weiter"-Button.
  → bulletPoints: Pflicht für Seite 3 (Aufgaben des Tages, 4–6 Einträge). Optional auf anderen Szenen-Seiten.
  → SEITE 0: Nutze subtext, accentText und buttonText wie oben beschrieben.
    Falls Bilder mitgeschickt wurden: Setze imageUrl auf eine der echten URLs.

quest_spinner
  Props: { text: "Dein Arbeitstag beginnt…", doneText: "Los geht's!" }
  → Automatischer Ladescreen, springt nach ~2 Sekunden selbst weiter. Genau diese Props, kein Abweichen.

quest_dialog
  Props: { lines: [{ id: "UUID", speaker: string, text: string, position: "left"|"right"|"center" }], choices?: [{ id: "UUID", text: string, reaction?: string }], input?: { placeholder: string, captures?: string, followUpText?: string } }
  → 3–5 Dialog-Zeilen pro Gesprach — kurz und knackig, kein Smalltalk-Fuller!
  → position: "left" = Kolleg:in oder andere Person spricht | "right" = der Nutzer (@vorname) spricht.
    "center" = Erzähler-Handlung / Regieanweisung (z.B. "Du klopfst an die Tür.", "Ihr geht gemeinsam in den Aufenthaltsraum.").
    Center-Zeilen haben KEINEN speaker — sie beschreiben was passiert, nicht was jemand sagt.
    Nutze center für Ortswechsel, Handlungen und Szenenbeschreibungen innerhalb eines Dialogs.
    Zeilen des Nutzers sind kurze Reaktionen ("Verstanden!" / "Mach ich sofort.") — kein Monolog.
  → speaker: Realistische deutsche Vornamen + Rolle (z.B. "Sarah (Teamleiterin)", "Dr. Meier", "Du").
    Bei position "right" immer speaker "@vorname" oder "Du" verwenden.
    Bei position "center" kann speaker leer sein oder "Erzähler".
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
  Props: { question: string, options: [{ id: "UUID", text: string, emoji: string, reaction: string, isWrong?: boolean, nextPageIndex?: number }] }
  → question: Konkrete Situation mit Handlungsdruck — kein abstraktes "Was würdest du tun?", sondern
    eine lebendige Beschreibung: "Ein Alarm piept. Du siehst, dass Patient 4 unruhig wird. Was tust du?"
  → 2 Optionen bei Branching, sonst 2–3.
  → isWrong: SEHR SPARSAM verwenden! Nur bei wirklich gefährlichem/absurdem Verhalten.
    Die meisten Optionen sollten valide sein — der Nutzer soll motiviert werden, nicht belehrt.
    Bei Branching-Decisions IMMER false (beide Pfade sind valide).
  → reaction: Kurze, ermutigende Konsequenz (1-2 Sätze). Immer positiv und motivierend formulieren.
    Bei isWrong: freundlich erklären, nicht tadeln ("Das wäre nicht ideal, weil..." statt "Das ist falsch!").
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
  → feedback: motivierend und lehrreich! Bei richtiger Antwort: kurzes Lob ("Genau!").
    Bei falscher: freundlich erklaren, nicht tadeln ("Guter Gedanke, aber tatsachlich...").
    Der Nutzer soll sich gut fuhlen, nicht dumm — es ist ein Erkundungserlebnis, keine Prufung.

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

quest_zuordnung
  Props: { question: string, pairs: [{ id: "UUID", left: string, right: string }], shuffleRight: boolean, showFeedback: boolean, feedbackText: string }
  → Nutzer ordnet Begriffe (links) den richtigen Erklärungen/Werten (rechts) zu – per Klick/Tap, mobilfreundlich.
  → Ideal für: Fachbegriffe erklären, Tools ↔ Einsatzgebiete, Aufgaben ↔ Abteilungen, Werte ↔ Bedeutungen.
  → question: klare Aufgabenstellung (z.B. "Ordne die Werkzeuge dem richtigen Einsatzgebiet zu!").
  → pairs: 3–6 Paare. left = Begriff/Kürzel, right = passende Erklärung/Definition.
  → shuffleRight: true (rechte Seite wird beim Laden gemischt – Standard).
  → showFeedback: true – zeigt nach Bestätigung grün/rot pro Paar.
  → feedbackText: positiv, z.B. "Genau! Jetzt kennst du die wichtigsten Werkzeuge.".
  → Beispiel: "Ordne die medizinischen Abkürzungen ihrer Bedeutung zu"
    Paare: EKG ↔ Herzaktivität messen, MRT ↔ Schichtaufnahmen des Körpers, RR ↔ Blutdruckmessung

quest_rating (⭐ – drittletzte Seite)
  Props: { question: "Wie war dein Arbeitstag?", emoji: "⭐", count: 5 }

quest_rating (👍 – vorletzte Seite)
  Props: { question: "Wie gut kannst du dir vorstellen, als [Berufsbezeichnung] zu arbeiten?", emoji: "👍", count: 5 }

quest_lead (IMMER letzte Seite)
  Props: { headline: string, subtext: string, buttonText: "Weitere Infos anfordern", privacyText: "", fields: [] }
  → WICHTIG: Es geht NICHT um eine Bewerbung, sondern um WEITERE INFORMATIONEN zum Ausbildungsberuf.
  → headline: Personlich mit @vorname, z.B. "@vorname, danke fur deinen virtuellen Arbeitstag bei uns!"
  → subtext: IMMER in diesem Stil: "Wir wissen, wie schwer die Berufswahl sein kann, deshalb informieren wir dich uber unsere Ausbildungsangebote. Trage dich einfach ein und wir informieren dich uber Praktika und weitere Angebote."
  → fields: [] – Felder (inkl. Praktikum-Checkbox + DSGVO mit Impressum) werden automatisch ergänzt.

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
• Feedback IMMER ermutigend und motivierend! Kollegin reagiert kurz und positiv
  ("Super, @vorname!", "Gut gemacht!", "Das war genau richtig!"). Auch bei nicht-optimalen
  Entscheidungen: freundlich und verstandnisvoll, nie streng oder belehrend.
  Feedback-Dialoge maximal 2–3 Zeilen.
• Manche Entscheidungen passen besser als quest_dialog MIT choices statt quest_decision:
  → Wenn eine Kollegin eine Aufgabe übergibt ("Okay, mache ich!" / "Kurze Frage dazu…")
  → Lockere Gespräche, in denen der Nutzer eine Haltung zeigt
  → quest_decision NUR für echte Situationsentscheidungen mit Konsequenzen/Branching
• Nutze choices in quest_dialog mindestens 3×, um Gespräche interaktiv zu machen:
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
• Setze quest_zuordnung ein wenn Fachbegriffe, Konzepte oder Werkzeuge erklärt werden sollen.
• Die Quest soll sich wie ein interaktives Filmerlebnis anfühlen: Spannung, Wendungen, echte Charaktere.
• Pflicht pro Quest: mindestens 3 × quest_decision, 2 × quest_quiz, 1 × quest_dialog mit choices,
  und mindestens 1 × quest_zuordnung ODER quest_hotspot (je nach Beruf und Storytelling).

SPRACHE & STIL:
• Keine Großschreibung für ganze Wörter oder Sätze (kein ALL CAPS).
• Normale Groß-/Kleinschreibung nach deutschen Rechtschreibregeln.
• Überschriften, Titel und Buttons: Nur erstes Wort und Eigennamen groß.
• Emojis sparsam und kontextpassend einsetzen – nicht bei jedem Element.

ALLGEMEIN:
• Jede id: eindeutiger UUID-String (Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
• Keine Seiten-IDs generieren – nur IDs für Options und Dialog-Lines
• SEITENNAMEN — DEFINITIV WICHTIG (Location-Hint im Header zeigt diesen Namen):
  Der Name MUSS der Ort oder die konkrete Situation sein, an der der Spieler gerade steht.
  Beispiele RICHTIG:  "Schichtübergabe", "Frühstück", "Notfall", "Frau Lehmanns Zimmer", "Medikamentenausgabe"
  Beispiele FALSCH:  "Feedback Notfall Falsch", "Feedback", "Reaktion", "Konsequenz", "Antwort A", "Pfad B", "Korrekt", "Seite 1"
  → Pfad-A- und Pfad-B-Folgeseiten nach einer Entscheidung NEHMEN denselben Ortsnamen wie die Auslöse-Seite (oder eine kleine Verfeinerung wie "Notfall – im Gang"). KEIN Quiz-Status im Namen.
  → Auch Reaktions-/Erklär-Seiten der KI bekommen den Ortsnamen. Niemals "Feedback X" oder "X Falsch".
  → Maximal 4 Wörter, keine Doppelpunkte, keine technischen Suffixe.

═══════════════════════════════════════════════════════
  AUSGABEFORMAT
═══════════════════════════════════════════════════════

Antworte NUR mit validem JSON – kein Markdown, keine Erklärungen, kein Text davor oder danach.
Pages können optional nextPageIndex (0-basiert) und hideLocationHint (boolean) enthalten.
Seite 0 MUSS hideLocationHint: true haben (Willkommensseite zeigt keinen Ortsnamen).

{
  "pages": [
    {
      "name": "Willkommen",
      "hideLocationHint": true,
      "blocks": [
        {
          "type": "quest_scene",
          "props": { "title": "Willkommen bei ...", "subtext": "...", "accentText": "...", "description": "...", "buttonText": "Alles klar, verstanden!", "imageUrl": "" }
        }
      ]
    },
    {
      "name": "Schichtübergabe",
      "nextPageIndex": 5,
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
  { type: 'text',     label: 'Vorname',  placeholder: 'Vorname',          required: true,  variable: 'vorname'    },
  { type: 'text',     label: 'Nachname', placeholder: 'Nachname',         required: false, variable: 'nachname'   },
  { type: 'email',    label: 'E-Mail',   placeholder: 'E-Mail-Adresse',   required: true,  variable: 'email'      },
  { type: 'tel',      label: 'Telefon',  placeholder: 'Telefonnummer',    required: false, variable: 'telefon'    },
  { type: 'checkbox', label: 'Ich kann mir vorstellen, in diesem Bereich ein Praktikum zu machen.', required: false, variable: 'praktikum' },
  { type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank">@companyName</a> meine Daten gemäß <a href="@datenschutzUrl" target="_blank">Datenschutzerklärung</a> verarbeitet. <a href="@impressumUrl" target="_blank">Impressum</a>', required: true, variable: 'datenschutz' },
];

/**
 * Entfernt Quiz-Status-/Meta-Vokabeln aus KI-generierten Page-Namen, damit
 * der Location-Hint im Player nur den Ort/die Situation zeigt. Greift, wenn
 * die KI die Prompt-Regel ignoriert und Pfad-Folge-Seiten als
 * "Feedback Notfall Falsch" o.ä. benennt.
 */
const PAGE_NAME_STATUS_TOKENS = /\b(feedback|reaktion|reaction|konsequenz|consequence|falsch|wrong|korrekt|richtig|right|antwort|response|ergebnis|result|pfad|path)\s*[:\-—–]?\s*/gi;
function sanitizePageName(raw: unknown, fallback: string): string {
  const s = typeof raw === 'string' ? raw : '';
  if (!s) return fallback;
  let cleaned = s.replace(PAGE_NAME_STATUS_TOKENS, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—:,.]+|[\s\-–—:,.]+$/g, '');
  if (cleaned.length < 2) return fallback;
  return cleaned;
}

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsedBody = GenerateQuestSchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  }
  const beruf = parsedBody.data.beruf;
  const notes = parsedBody.data.notes;
  const imageUrls = parsedBody.data.imageUrls;

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlüssel nicht konfiguriert' }, { status: 500 });
  }

  // Build company context block from settings
  const companyContext: string[] = [];
  companyContext.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) companyContext.push(`Branche: ${session.company.industry}`);
  if (session.company.location) companyContext.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) companyContext.push(`Über uns: ${session.company.description.trim()}`);

  // Include company jobs for context (lead form, other career options)
  const companyJobs = session.company.successPage?.jobs ?? [];
  if (companyJobs.length > 0) {
    companyContext.push(`Weitere Ausbildungsberufe des Unternehmens: ${companyJobs.map((j) => j.title).join(', ')}`);
  }

  let userMessageText = `${companyContext.join('\n')}\n\nErstelle eine JobQuest für den Beruf: ${beruf.trim()}${notes?.trim() ? `\n\nZusätzliche Hinweise: ${notes.trim()}` : ''}`;

  if (imageUrls.length > 0) {
    userMessageText += `\n\nDir wurden ${imageUrls.length} Bilder vom Unternehmen mitgeschickt. Verteile diese Bilder sinnvoll auf die quest_scene-Blöcke (besonders Page 0!), quest_hotspot-Blöcke und quest_dialog-Lines. Verwende EXAKT folgende URLs (keine erfinden):\n${imageUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`;
  }

  // Multimodal user message: text + optional images
  const userContent: Array<{ type: string; [key: string]: unknown }> = [{ type: 'text', text: userMessageText }];
  for (const url of imageUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }

  let rawText: string;
  try {
    rawText = await aiChat({
      system: SYSTEM_PROMPT,
      user: imageUrls.length > 0 ? userContent : userMessageText,
      temperature: 0.85,
      json: true,
    });
  } catch (err) {
    console.error('[generate-quest] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : err instanceof AiError && (err.code === 'missing_key' || err.code === 'auth') ? 500 : 502;
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

  let parsed: { pages: RawPage[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('[generate-quest] JSON parse failed, raw length=', rawText.length, 'first 200 chars:', rawText.slice(0, 200));
    return NextResponse.json({ error: 'KI-Antwort ungültig.' }, { status: 502 });
  }

  // First pass: assign stable IDs to every page
  const pageIds = parsed.pages.map(() => crypto.randomUUID());

  // Second pass: build FunnelPage[] and resolve nextPageIndex → real UUIDs
  // Whitelist of allowed image URLs (only the ones the user uploaded)
  const allowedImageUrls = new Set(imageUrls);
  function sanitizeImageUrl(url: unknown, fallbackIndex: number): string {
    if (typeof url !== 'string' || !url) return '';
    if (allowedImageUrls.has(url)) return url;
    // Model invented a URL — fall back to one of the real images by index
    return imageUrls[fallbackIndex % imageUrls.length] ?? '';
  }
  let imageBlockCounter = 0;

  // Carry-over for sanitized fallbacks: wenn die KI für eine Pfad-Folge-Seite
  // einen Quiz-Status-Namen geliefert hat, erbt sie den Ortsnamen der
  // unmittelbaren Vorgänger-Seite (bei Pfad A/B passt das semantisch).
  let lastValidPageName = 'Weiter';
  const pages = parsed.pages.map((page, pIdx) => {
    const pageNextId = typeof page.nextPageIndex === 'number' && pageIds[page.nextPageIndex]
      ? pageIds[page.nextPageIndex]
      : undefined;

    // Page 0 always hides location hint; respect AI output for other pages
    const hideHint = pIdx === 0 || page.hideLocationHint === true;

    const cleanName = sanitizePageName(page.name, lastValidPageName);
    lastValidPageName = cleanName;

    return {
      id: pageIds[pIdx],
      name: cleanName,
      ...(pageNextId ? { nextPageId: pageNextId } : {}),
      ...(hideHint ? { hideLocationHint: true } : {}),
      nodes: page.blocks.map((block) => {
        let props = block.props;

        // Sanitize imageUrl on scene/hotspot blocks
        if ((block.type === 'quest_scene' || block.type === 'quest_hotspot') && imageUrls.length > 0) {
          props = {
            ...props,
            imageUrl: sanitizeImageUrl(props.imageUrl, imageBlockCounter++),
          };
        }

        // Sanitize imageUrl on dialog lines
        if (block.type === 'quest_dialog' && Array.isArray(props.lines) && imageUrls.length > 0) {
          props = {
            ...props,
            lines: (props.lines as Array<Record<string, unknown>>).map((line) => ({
              ...line,
              imageUrl: line.imageUrl ? sanitizeImageUrl(line.imageUrl, imageBlockCounter++) : '',
            })),
          };
        }

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
