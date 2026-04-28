import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, unauthorized } from '@/lib/api-auth';
import { defaultLeadFields } from '@/lib/lead-field-defaults';
import { aiChat, isAiConfigured, AiError } from '@/lib/ai-provider';

// ─── Input schema ─────────────────────────────────────────────────────────────
const GenerateCheckSchema = z.object({
  berufe: z.array(z.string().min(1).max(200)).max(60).optional().default([]),
  studiengaenge: z.array(z.string().min(1).max(200)).max(40).optional().default([]),
  notes: z.string().max(8000).optional(),
  cardCount: z.number().int().min(6).max(20).optional().default(10),
  // Optional HTTPS image URLs — the model reads them multimodally and
  // extracts Berufe, Studiengänge and zusätzliche Vorgaben from their contents.
  imageUrls: z
    .array(z.string().url().startsWith('https://').max(2000))
    .max(10)
    .optional()
    .default([]),
}).refine((v) => v.berufe.length > 0 || v.imageUrls.length > 0, {
  message: 'Bitte mindestens einen Beruf eingeben oder ein Bild hochladen.',
  path: ['berufe'],
});

// Palette of distinct hex colors for auto-generated dimensions.
const DIMENSION_PALETTE = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#0891b2', '#65a30d', '#ea580c', '#9333ea', '#0284c7',
];

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du bist ein Experte für Karriere-Orientierungstools mit psychometrischem Hintergrund. Deine Aufgabe: Erstelle einen interaktiven Berufscheck, der in ca. 2–3 Minuten passende Berufe (und optional Studiengänge) bei einem Unternehmen vorschlägt.

═══════════════════════════════════════════════════════
  QUALITÄTS-REGELN (GELTEN FÜR ALLE FRAGEN/KARTEN)
═══════════════════════════════════════════════════════

DIESE REGELN SIND WICHTIGER ALS ALLES, WAS DANACH KOMMT:

(R1) KEIN BERUFS-PRIMING
  • NIE den Namen eines Berufs oder Studiengangs in einer Frage/Karte nennen.
  • FALSCH: "Könntest du dir vorstellen, als Werkzeugmechaniker zu arbeiten?"
  • RICHTIG: "Du bearbeitest ein Metallstück so lange, bis es exakt millimetergenau passt."
  • Der User weiß meist nicht, was ein "Werkzeugmechaniker" konkret macht. Szenarien > Titel.

(R2) KEIN SOCIAL-DESIRABILITY-BIAS
  • Formuliere Fragen so, dass es KEINE "offensichtlich richtige" Antwort gibt. Jede Option muss eine authentische Charakter­eigenschaft zeigen, nicht eine moralische Wertung.
  • FALSCH: "Wie gerne hilfst du anderen?" (primed "sehr gerne" als sozial erwünscht)
  • RICHTIG als Slider: Linkes Label "Lieber allein arbeiten" ↔ Rechtes Label "Lieber im Team" (beide Pole valid)
  • RICHTIG als Swipe-Karte: "Ein Freund bittet dich um Hilfe bei einer Aufgabe, die du eigentlich nicht magst." (mehrdeutig, erlaubt echte Selbstwahrnehmung)

(R3) REVERSE-CODED ITEMS
  • Mindestens 1–2 Swipe-Karten pro Check müssen REVERSE-CODED sein: "optionPositive zu wählen" soll Dimension X stärken, "optionNegative zu wählen" soll Dimension Y stärken — beides gültige Charakter-Signale.
  • Beispiel: "Du sollst 8 Stunden konzentriert an einer einzigen Aufgabe sitzen." → "Klingt gut" +3 Analytik/Ausdauer; "Eher nicht" +2 Abwechslung/Aktion.
  • Das verhindert, dass User durch stumpfes "alles positiv wischen" den Check aushebeln.

(R4) KONKRETE ALLTAGSSZENARIEN
  • Swipe-Karten: aus Schule, Freizeit, Familie, Freundeskreis — nicht "im Beruf".
  • Slider: offene Selbstreflexion, keine Fähigkeits-Abfrage ("Wie gut kannst du Mathe?" ist schlecht; "Bei Zahlen fühle ich mich …" ist besser).

(R5) FRAGEN-VIELFALT
  • Mindestens 3 verschiedene Fragetypen pro Check (Swipe + Slider + optional This-or-That oder single-choice Werte-Frage).
  • Nie mehr als 2 gleiche Blocktypen hintereinander.

(R6) BALANCE DER DIMENSIONEN
  • Jede Dimension braucht in Summe ähnlich viele Punkte-Chancen. Wenn Dimension X 3 Swipe-Karten + 1 Slider hat, muss auch Dimension Y 3 Swipe-Karten + 1 Slider haben.
  • Berechne vor der Generierung: "Bei 10 Karten / 4 Dimensionen = 2,5 Karten pro Dim → also 2–3 Karten pro Dim, alle Dimensionen mit optionPositive=3 gleich häufig als Gewinner".

(R7) STORY-BOGEN
  • Start leicht (Intro → Swipe-Deck spielerisch).
  • Mitte fokussierend (This-or-That, wenn visuelle Dichotomie sinnvoll).
  • Reflexion (Slider, dann bei Bedarf Werte-Frage).
  • Abschluss (Ergebnis → Lead).
  • Der User soll eine Kurve spüren: erst warmwerden, dann ernster, dann loslassen.

═══════════════════════════════════════════════════════


═══════════════════════════════════════════════════════
  BILDER & EXTRAHIERTE INHALTE
═══════════════════════════════════════════════════════
Wenn im User-Prompt ein Block "=== Aus Bildern extrahiert ===" vorkommt:
• Die dort genannten Kategorien werden 1:1 zu Dimensionen (z.B. "Gewerbliche Ausbildungsberufe" → Dimension "Gewerblich" oder "Gewerbliche Ausbildung"). Keine Kategorie darf verloren gehen.
• Jeder aufgelistete Beruf wird im Ergebnis in der zugehörigen Dimensions-Gruppe als Suggestion platziert.
• Beispiel-Fragen aus dem Block übernimmst du wörtlich (oder eng angelehnt) als Swipe-Karten. Die "maps_to"-Angabe bestimmt das Scoring der optionPositive auf genau die Dimensionen, die den genannten Berufen/Kategorien entsprechen.
• Der Text-Block gilt als Ground Truth. Die angehängten Rohbilder dienen nur zur visuellen Gegenprobe.
Wenn kein Block vorhanden ist, aber Bilder angehängt sind: lies sie direkt und extrahiere Berufe, Kategorien und Beispiel-Fragen selbst.


═══════════════════════════════════════════════════════
  PFLICHT-AUFBAU der Pages
═══════════════════════════════════════════════════════

Du gibst ZWEI Top-Level-Felder zurück: dimensions[] und pages[].

── DIMENSIONS (3–4 Stuck, NICHT mehr!) ────────────────────────────────────
Leite aus den vorgegebenen Berufen 3–4 ubergeordnete Berufsfelder ab. MAXIMAL 4!
Wenige, klare Kategorien sind besser als viele kleine. Beispiele:
• Pflege + Sozialarbeit + Betreuung → "Pflege & Soziales"
• Handwerk + Technik + IT → "Handwerk & Technik"
• Kaufmann + Buro + Verwaltung → "Organisation & Verwaltung"

Jede Dimension hat: { "name": string, "description": string }
Die Namen werden als Schlussel in scores-Maps verwendet — konsistent verwenden!
JEDER Beruf muss eindeutig einer Dimension zugeordnet werden konnen.

── PAGES (in dieser Reihenfolge — Story-Bogen Leicht → Fokus → Reflexion) ──
Die Seiten bilden einen klaren emotionalen Bogen:
  • Einstieg LEICHT: Intro + optional Schulabschluss (Seiten 0–1).
  • Warm-up SPIELERISCH: Swipe-Deck (Seite 2) — der Nutzer kommt in Flow.
  • FOKUSSIEREND: optional 1–2 This-or-That (Arbeitsumfeld/Tätigkeitsart).
  • REFLEXION: Slider (genau 1 pro Dimension), optional 1 Werte-Frage als Tiebreaker.
  • ABSCHLUSS: Ergebnis → Lead-Formular.
Gesamt-Länge angepeilt: 9–13 Seiten (bei 4 Dimensionen typisch 11).

Seite 0: check_intro
  Props: { headline: string, subtext: string, imageUrl: "", buttonText: "Berufscheck starten" }
  → headline: Eine prägnante Einladung mit EINEM farbig hervorgehobenen Schlagwort in <accent>…</accent>-Tags.
    Format: "<Einleitung> <accent><Schlagwort></accent> <Ausklang>."
    Beispiele:
      • "Lass uns deine <accent>Traum-Ausbildung</accent> finden."
      • "Finde den Beruf, der <accent>wirklich zu dir</accent> passt."
      • "Entdecke deinen <accent>Weg zu uns</accent>."
    → Genau EIN Accent-Abschnitt (2–4 Wörter). Rest der Headline ohne Formatierung.
    → Kein Fragezeichen, keine ALL-CAPS.
  → subtext: Ein einziger Satz, ca. 10–15 Wörter. Erwähnt die Dauer ("3 Minuten"), was der User bekommt.
    Beispiele:
      • "Finde in 3 Minuten heraus, welcher Beruf zu dir passen könnte."
      • "In 3 Minuten zeigen wir dir, welche Ausbildung zu dir passt."
  → buttonText: "Berufscheck starten" (Default belassen, außer der Nutzer-Kontext legt etwas Passenderes nahe).
  → imageUrl: "" (leer lassen, außer es wurde ein Bild mitgegeben).

Seite 1 — NUR wenn studiengaenge nicht-leer ist:
  check_frage
  Props: {
    "frageType": "single_choice",
    "question": "Welchen Schulabschluss strebst du an oder hast du bereits?",
    "options": [
      { "text": "Hauptschulabschluss" },
      { "text": "Mittlerer Schulabschluss" },
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
  → WICHTIG: JEDE Dimension muss in mindestens 2 Karten mit VOLLER Punktzahl (3 Punkte bei optionPositive oder optionNegative bei Reverse-Coded Items) vorkommen. Keine Dimension darf strukturell unterrepräsentiert sein.
  → GLEICHGEWICHT: Verteile die cardCount Karten gleichmäßig. Bei 10 Karten / 4 Dimensionen = 2–3 pro Dimension als Top-Wahl.
  → Jede Karte: { "text": "Du sollst …", "optionPositive": { "label": "Klingt gut", "emoji": "👍", "scores": {...} }, "optionNeutral": { "label": "Geht so", "emoji": "😐", "scores": {...} }, "optionNegative": { "label": "Eher nicht", "emoji": "👎", "scores": {...} } }
  → scores-Maps: Dimensions-NAMEN als Keys, integer Punkte 1-3. Nur die Dimension(en) reinschreiben, die wirklich passen.
  → REVERSE-CODED ITEMS (Pflicht: 1–2 von cardCount):
    Bei diesen Karten gibt BEIDE extreme Optionen Punkte auf VERSCHIEDENE Dimensionen — nicht nur optionPositive.
    Beispiel: "Du sollst 8 Stunden konzentriert an einer Aufgabe sitzen."
      → optionPositive +3 Analytik/Ausdauer, optionNegative +3 Abwechslung/Aktion.
    Beispiel: "Am Samstag hilfst du jemandem bei einem langen Projekt — keine Pause."
      → optionPositive +3 Soziales, optionNegative +2 Unabhängigkeit.
    Das verhindert das "positive wischen"-Problem.
  → SOCIAL-DESIRABILITY-FALLE vermeiden: Formuliere KEINE Karten, bei denen "optionPositive" offensichtlich die moralisch "bessere" Antwort ist. Beispiel SCHLECHT: "Deine Oma bittet dich um Hilfe." (jeder sagt "Klingt gut"). STATT: konkretes Szenario mit echtem Trade-off.
  → SWIPE-FORMAT — Pflicht: JEDE Karte muss eine HYPOTHETISCHE Aufgabe / ein offenes Szenario sein, das der User klar mit „klingt gut" oder „eher nicht" (= ja/nein) beantworten kann. KEINE Erzählungen, in denen der User die Handlung schon AUSFÜHRT — solche Sätze setzen die Antwort voraus und sind nicht swipebar.
    SCHLECHT: "Deine Oma ist nach einem Sturz unsicher. Du bleibst den ganzen Nachmittag bei ihr, redest mit ihr und hilfst beim Aufstehen." (Mehrteilige Erzählung im Präsens — der User TUT es bereits, kann es nicht ablehnen ohne sich schlecht zu fühlen.)
    SCHLECHT: "Du tröstest deinen weinenden Bruder." (gleiche Falle, vollendete Handlung.)
    GUT: "Du sollst den ganzen Nachmittag eine Verwandte nach einem Sturz begleiten und mehrfach beim Aufstehen helfen." (Aufgabe → 👍/👎 möglich.)
    GUT: "Du sollst 8 Stunden konzentriert an einer einzigen Aufgabe sitzen."
    GUT: "Ein Freund bittet dich um Hilfe bei einer Aufgabe, die du eigentlich nicht magst." (offene Bitte, beide Reaktionen authentisch.)
    Faustregel: Beginne mit „Du sollst …", „Jemand bittet dich …", „Stell dir vor, du …" — nie mit „Du bleibst …", „Du hilfst …", „Du tröstest …".
  → Text: konkret aus Schule/Freizeit/Familie ("Nach dem Unterricht sitzt du 2 Stunden am Tablet, um ein Video zu schneiden"), NIEMALS Berufsnamen.
  → Wenn im User-Prompt konkrete Beispiel-Fragen aus Bildern stehen, übernimm sie sinngemäß (und scoren auf die in maps_to genannten Kategorien).

OPTIONAL: 1–2 Seiten check_this_or_that (Visual A/B — NUR bei klar visueller Dichotomie):
  Props: {
    "question": "Was ist eher dein Vibe?",
    "description": "",
    "allowSkip": false,
    "optionA": { "imageUrl": "", "label": "Werkhalle mit Maschine", "scores": { "<DIMENSION_NAME>": 2 } },
    "optionB": { "imageUrl": "", "label": "Monitor mit Code",       "scores": { "<DIMENSION_NAME>": 2 } }
  }
  → Zeigt zwei Bilder nebeneinander; ein Tap wählt eines, Auto-Advance.
  → DICHOTOMIE-Kategorien (wähle pro Block EINE davon — unterschiedliche Themen, wenn mehrere Blöcke):
    • Arbeitsumfeld: "Werkhalle" vs. "Büro", "Drinnen" vs. "Draußen", "Laut+Team" vs. "Ruhig+Allein"
    • Tätigkeitsart: "Mit Händen bauen" vs. "Mit Tastatur tippen", "Planen+Entwerfen" vs. "Bauen+Umsetzen"
    • Interaktionsstil: "Mit Menschen reden" vs. "Mit Material arbeiten", "Beraten" vs. "Machen"
    • Problemstil: "Strukturiert+Regeln" vs. "Kreativ+Frei", "Ein Problem tief" vs. "Viele Probleme parallel"
  → MAXIMAL 2 Blöcke pro Check.
  → POSITIONIERUNG: Zwischen Swipe-Deck und Slidern.
  → imageUrl immer als "" lassen — der Nutzer lädt die Bilder später im Editor hoch.
  → Label: Kurzer, konkreter Bild-Beschrieb (2–4 Wörter), z.B. "CNC-Maschine", "Programmier-Setup", "Kund:innen-Gespräch", "Lagerhalle".
  → Scores: JEWEILS 2 Punkte auf EINE Dimension pro Seite. Die zwei Optionen MÜSSEN gegensätzliche Dimensionen adressieren.
  → Wenn keine sinnvolle visuelle Dichotomie möglich (z.B. "Pflege" vs. "Soziales" — zu ähnlich), NICHT nutzen.

OPTIONAL: 1 Werte-Frage als check_frage mit single_choice (direkt vor check_ergebnis):
  Props: {
    "frageType": "single_choice",
    "question": "Was ist dir in deinem zukünftigen Job am wichtigsten?",
    "options": [
      { "text": "Sicherheit & feste Strukturen",       "scores": { "<DIM_X>": 2 } },
      { "text": "Abwechslung & neue Herausforderungen",  "scores": { "<DIM_Y>": 2 } },
      { "text": "Ein Team, auf das ich mich verlasse",    "scores": { "<DIM_Z>": 2 } },
      { "text": "Etwas Sinnvolles bewegen",               "scores": { "<DIM_W>": 2 } }
    ],
    "allowSkip": false
  }
  → Hilft, wenn die Dimensionen bisher knapp ausgegangen sind — ein letzter Tiebreaker.
  → MAXIMAL 1 solche Frage pro Check. Jede Option muss eine echte Werte-Dimension ansprechen (nicht alles "positiv").
  → Options-Text: 4–6 Wörter, KONKRET (nicht "gut bezahlt werden" — das wählt jeder).
  → Optional verzichten, wenn alle 4 Dimensionen bereits gut abgedeckt sind.

SWIPE-KARTEN vs. SELBST-SLIDER — wann was?
• Swipe-Karten eignen sich für konkrete Szenarien mit spürbarer Präferenz ("Du öffnest einen elektrischen Schaltkasten — was denkst du?"). Binär/ternär, affektiv, schnell.
• Slider (check_selbst) eignen sich für graduelle Selbsteinschätzungen zu einer generischen Fähigkeit/Neigung ("Wie gerne arbeitest du analytisch?"). Offen, kalibrierbar, nicht berufsspezifisch.
→ Nutze den jeweils passenderen Typ. Wenn eine Dimension am besten über ein Szenario rüberkommt (z.B. Pflege → "Du sollst eine ältere Dame nach einem Sturz nach Hause begleiten"), dann Swipe-Karte. Wenn eine Dimension eine ruhigere Selbstreflexion braucht (z.B. "Mir fällt es leicht, komplexe Probleme zu analysieren" → Technik), dann Slider.
→ Vermeide Routine: nicht für jede Dimension stumpf "Wie gerne arbeitest du mit X?" wiederholen. Variiere Formulierungen.

PRO-DIMENSION-SLIDER (check_selbst — Pflicht: GENAU 1 Slider pro Dimension):
  Props: {
    "question": "Was trifft eher zu?",
    "description": "",
    "sliderMin": 0, "sliderMax": 10, "sliderStep": 1,
    "sliderLabelMin": "Eher wenig",
    "sliderLabelMax": "Eher viel",
    "sliderEmojiMin": "😕",   // empfohlen
    "sliderEmojiMax": "😍",   // empfohlen
    "sliderDimensionId": "<DIMENSION_NAME>"
  }
  → sliderDimensionId MUSS exakt einem Dimensions-Namen entsprechen.
  → ERZEUGE FÜR JEDE DIMENSION GENAU EINEN SLIDER. 4 Dimensionen → 4 Slider. 3 → 3.
  → BIPOLAR wann immer möglich (Social-Desirability-Killer!):
    Linkes und rechtes Label beschreiben BEIDE eine valide Präferenz — keine Wertung.
    GUT: sliderLabelMin "Lieber allein" ↔ sliderLabelMax "Lieber im Team"
    GUT: sliderLabelMin "Ruhige Präzision" ↔ sliderLabelMax "Hektische Abwechslung"
    GUT: sliderLabelMin "Erst planen" ↔ sliderLabelMax "Sofort loslegen"
    SCHLECHT: sliderLabelMin "Gar nicht" ↔ sliderLabelMax "Sehr gerne" (bei Vorlieben → primed max-Wert)
    Unipolar ("Gar nicht" ↔ "Sehr gerne") NUR bei echten Fähigkeits-/Intensitäts-Fragen ("Wie sehr interessiert dich Technik an sich?").
  → question: offen formuliert, keine Berufsnamen, nicht "Wie gerne arbeitest du mit X".
    BESSER: "Was passt eher zu dir?" als generische Frage + bipolare Labels. Oder ein konkretes Szenario: "Nach einem langen Schultag — was tut dir gut?"
  → Jede Dimension soll OPTISCH und SPRACHLICH anders klingen — nicht Wort-Variation des Dimensions-Namens.

Vorletzte Seite: check_ergebnis
  Props: {
    "headline": "Dein Ergebnis, @firstName!",
    "subtext": "Diese Bereiche passen besonders gut zu dir.",
    "layout": "groups",
    "showDimensionBars": true,
    "groups": [ ... ]
  }

  Gruppen — EINE GRUPPE PRO DIMENSION, mit den zugehorigen Berufen:
  Erstelle fur JEDE Dimension eine eigene Gruppe, die als Tab im Ergebnis angezeigt wird.
  So sieht der Nutzer sofort, welche Berufe zu welcher Kategorie gehoren.

  Beispiel bei 3 Dimensionen:
  [
    {
      "label": "Pflege & Soziales",
      "dimensionIds": ["Pflege & Soziales"],
      "showBars": true,
      "topN": 3,
      "suggestions": [
        { "title": "Pflegefachkraft", "description": "...", "imageUrl": "", "requiresDimensionIds": ["Pflege & Soziales"], "links": [] },
        { "title": "Heilerziehungspfleger", "description": "...", "imageUrl": "", "requiresDimensionIds": ["Pflege & Soziales"], "links": [] }
      ]
    },
    {
      "label": "Handwerk & Technik",
      "dimensionIds": ["Handwerk & Technik"],
      "showBars": true,
      "topN": 3,
      "suggestions": [
        { "title": "Tischler", "description": "...", "imageUrl": "", "requiresDimensionIds": ["Handwerk & Technik"], "links": [] }
      ]
    }
  ]

  WENN studiengaenge gegeben sind: Fuege die Studiengange in die passende Dimensions-Gruppe ein
  (z.B. "B.Eng. Mechatronik" in "Handwerk & Technik"). Optional: Separate Gruppe "Duales Studium"
  mit visibleIf-Filter auf Schulabschluss-Frage.

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

// ─── Image extraction (Step A) ───────────────────────────────────────────────
// Runs BEFORE the main generation when images are attached. Uses a strict
// low-temperature OCR/structure prompt so the creative generation pass (Step B)
// works from reliable, locked-in ground-truth data instead of having to OCR
// and generate at the same time.

const EXTRACT_IMAGES_SYSTEM_PROMPT = `Du bist ein strenger OCR- und Struktur-Extraktor.
Lies die angehängten Bilder und gib AUSSCHLIESSLICH valides JSON nach dem unten definierten Schema zurück.

REGELN:
• Liste JEDEN sichtbaren Eintrag. Paraphrasiere nicht, fasse nicht zusammen, lasse nichts weg.
• Behalte Original-Schreibweise und Original-Kategorie-Namen exakt bei (Umlaute, Groß-/Kleinschreibung, Sonderzeichen).
• Wenn ein Eintrag schwer lesbar ist: Best-Effort-Transkription, aber aufnehmen.
• Bei Fragen mit Kategorie-Zuordnung in Klammern (z.B. "… (Elektrotechnik)" oder "… (Informatik/Software-Engineering)"): Text OHNE die Klammer in "text" speichern, die Kategorie(n) in "maps_to" als Array.
• Kategorien in Bildern (z.B. "Gewerbliche Ausbildungsberufe", "Alle Studiengänge") werden als "categories" abgebildet. Studiengänge (Bachelor/Master etc.) gehören bevorzugt in "studiengaenge" — auch wenn sie gleichzeitig in einer Kategorie stehen.
• Gib kein Markdown und keine Erklärung zurück. Nur JSON.

SCHEMA:
{
  "categories": [{ "name": string, "items": string[] }],
  "studiengaenge": string[],
  "exampleQuestions": [{ "text": string, "maps_to": string[] }],
  "hints": string
}`;

type Extracted = {
  categories: Array<{ name: string; items: string[] }>;
  studiengaenge: string[];
  exampleQuestions: Array<{ text: string; maps_to: string[] }>;
  hints: string;
};

function stripJsonFences(s: string): string {
  let t = s.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return t;
}

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

function coerceExtracted(raw: unknown): Extracted {
  const r = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const categories: Extracted['categories'] = Array.isArray(r.categories)
    ? (r.categories as unknown[]).map((c) => {
        const o = (c && typeof c === 'object') ? c as Record<string, unknown> : {};
        return {
          name: typeof o.name === 'string' ? o.name.trim() : '',
          items: coerceStringArray(o.items),
        };
      }).filter((c) => c.name.length > 0)
    : [];
  const studiengaenge = coerceStringArray(r.studiengaenge);
  const exampleQuestions: Extracted['exampleQuestions'] = Array.isArray(r.exampleQuestions)
    ? (r.exampleQuestions as unknown[]).map((q) => {
        const o = (q && typeof q === 'object') ? q as Record<string, unknown> : {};
        return {
          text: typeof o.text === 'string' ? o.text.trim() : '',
          maps_to: coerceStringArray(o.maps_to),
        };
      }).filter((q) => q.text.length > 0)
    : [];
  const hints = typeof r.hints === 'string' ? r.hints.trim() : '';
  return { categories, studiengaenge, exampleQuestions, hints };
}

async function extractFromImages(imageUrls: string[]): Promise<Extracted | null> {
  if (imageUrls.length === 0) return null;
  const userContent: Array<{ type: string; [key: string]: unknown }> = [
    { type: 'text', text: 'Extrahiere die Inhalte der folgenden Bild(er) strikt nach Schema.' },
  ];
  for (const url of imageUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }
  try {
    const raw = await aiChat({
      system: EXTRACT_IMAGES_SYSTEM_PROMPT,
      user: userContent,
      temperature: 0.1,
      json: true,
    });
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(raw));
    } catch (e) {
      console.warn('[generate-check:extract] JSON parse failed, first 200 chars:', raw.slice(0, 200), e);
      return null;
    }
    const result = coerceExtracted(parsed);
    const hasAnything = result.categories.length > 0
      || result.studiengaenge.length > 0
      || result.exampleQuestions.length > 0
      || result.hints.length > 0;
    if (!hasAnything) {
      console.warn('[generate-check:extract] extraction returned empty payload');
      return null;
    }
    return result;
  } catch (err) {
    console.warn('[generate-check:extract] AI call failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function dedupCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw?.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * Entfernt Quiz-Status-/Meta-Vokabeln aus KI-generierten Page-Namen, damit
 * der Location-Hint im Player nur den Ort/die Situation zeigt. Greift, wenn
 * die KI die Prompt-Regel ignoriert.
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

// ─── POST handler ─────────────────────────────────────────────────────────────
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
  const parsedBody = GenerateCheckSchema.safeParse(raw);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const path = issue?.path.join('.') || 'input';
    return NextResponse.json({
      error: `Eingabe ungültig (${path}): ${issue?.message ?? 'unbekannter Validierungsfehler'}`,
    }, { status: 400 });
  }
  const { berufe, studiengaenge, notes, cardCount, imageUrls } = parsedBody.data;

  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'KI-API-Schlüssel nicht konfiguriert' }, { status: 500 });
  }

  // ── Step A: strict extraction from attached images (best-effort, optional)
  const extracted = await extractFromImages(imageUrls);

  // Merge manual input + extracted items (case-insensitive dedup, first-seen wins)
  const mergedBerufe = dedupCaseInsensitive([
    ...berufe,
    ...(extracted?.categories.flatMap((c) => c.items) ?? []),
  ]);
  const mergedStudiengaenge = dedupCaseInsensitive([
    ...studiengaenge,
    ...(extracted?.studiengaenge ?? []),
  ]);

  // Build company context
  const ctx: string[] = [];
  ctx.push(`Unternehmen: ${session.company.name}`);
  if (session.company.industry) ctx.push(`Branche: ${session.company.industry}`);
  if (session.company.location) ctx.push(`Standort: ${session.company.location}`);
  if (session.company.description?.trim()) ctx.push(`Über uns: ${session.company.description.trim()}`);

  // Render the extracted-from-images block verbatim into the Step B prompt so
  // the model sees the ground truth as text (not just re-reads the images).
  let extractedBlock = '';
  if (extracted) {
    const lines: string[] = ['=== Aus Bildern extrahiert (hohe Konfidenz — NUTZE DIESE DATEN) ==='];
    if (extracted.categories.length > 0) {
      lines.push('');
      lines.push('Kategorien aus den Bildern (diese MÜSSEN als Dimensionen übernommen werden):');
      for (const c of extracted.categories) {
        lines.push(`• ${c.name}:`);
        for (const item of c.items) lines.push(`    – ${item}`);
      }
    }
    if (extracted.exampleQuestions.length > 0) {
      lines.push('');
      lines.push('Beispiel-Fragen aus den Bildern (ÜBERNIMM diese wörtlich oder sehr eng angelehnt als Swipe-Karten; scoren auf die jeweils in Klammern zugeordnete Kategorie/Dimension):');
      for (const q of extracted.exampleQuestions) {
        const mapStr = q.maps_to.length > 0 ? ` → ${q.maps_to.join(' / ')}` : ' → (keine explizite Zuordnung)';
        lines.push(`• ${q.text}${mapStr}`);
      }
    }
    if (extracted.hints) {
      lines.push('');
      lines.push(`Weitere Hinweise aus den Bildern: ${extracted.hints}`);
    }
    extractedBlock = lines.join('\n');
  }

  const userMessageText = [
    ctx.join('\n'),
    '',
    mergedBerufe.length > 0
      ? `Erstelle einen Berufscheck für folgende Ausbildungsberufe:\n${mergedBerufe.map((b) => `- ${b}`).join('\n')}`
      : 'Erstelle einen Berufscheck. Die Liste der Berufe (und ggf. Studiengänge) entnimm bitte den mitgeschickten Bildern.',
    mergedStudiengaenge.length > 0 ? `\nUnd folgende duale Studiengänge:\n${mergedStudiengaenge.map((s) => `- ${s}`).join('\n')}` : '',
    `\nAnzahl Swipe-Karten: ${cardCount}`,
    notes?.trim() ? `\nZusätzliche Hinweise: ${notes.trim()}` : '',
    extractedBlock ? `\n${extractedBlock}` : '',
    imageUrls.length > 0 && !extractedBlock
      ? `\nEs sind ${imageUrls.length} Bild(er) angehängt — extrahiere daraus Berufe, Studiengänge und weitere Vorgaben (Dimensionen/Kategorien, Beispiel-Fragen, Tonalität).`
      : '',
    imageUrls.length > 0 && extractedBlock
      ? `\nDie ${imageUrls.length} angehängten Bild(er) dienen als visuelle Gegenprobe — bei Widerspruch hat der Text oben Vorrang.`
      : '',
  ].filter(Boolean).join('\n');

  // Multimodal user content: text + optional image blocks.
  // aiChat (ai-provider.ts) normalizes image_url → Anthropic's image format.
  const userContent: Array<{ type: string; [key: string]: unknown }> = [
    { type: 'text', text: userMessageText },
  ];
  for (const url of imageUrls) {
    userContent.push({ type: 'image_url', image_url: { url } });
  }

  let rawText: string;
  try {
    rawText = await aiChat({
      system: SYSTEM_PROMPT,
      user: imageUrls.length > 0 ? userContent : userMessageText,
      temperature: 0.75,
      json: true,
    });
  } catch (err) {
    console.error('[generate-check] AI error:', err);
    const msg = err instanceof AiError ? err.message : 'KI-Anfrage fehlgeschlagen.';
    const status = err instanceof AiError && err.code === 'rate_limit' ? 429 : err instanceof AiError && (err.code === 'missing_key' || err.code === 'auth') ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }

  type AIDim = { name: string; description?: string };
  type AIBlock = { type: string; props: Record<string, unknown> };
  type AIPage = { name: string; visibleIf?: { sourceBlockIndex: number; optionIndex: number[] }; blocks: AIBlock[] };
  type AIResp = { dimensions?: AIDim[]; pages?: AIPage[] };

  // Strip markdown code fences that Claude sometimes wraps around JSON
  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: AIResp;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('[generate-check] JSON parse failed, raw length=', rawText.length, 'first 200 chars:', rawText.slice(0, 200));
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
      name: sanitizePageName(page.name, `Seite ${pIdx + 1}`),
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
        if (block.type === 'check_this_or_that') {
          const resolveOpt = (raw: unknown, side: 'A' | 'B') => {
            const o = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
            return {
              id: side,
              imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : '',
              label: typeof o.label === 'string' ? o.label : `Option ${side}`,
              scores: resolveScoreMap(o.scores),
            };
          };
          props.optionA = resolveOpt(props.optionA, 'A');
          props.optionB = resolveOpt(props.optionB, 'B');
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

        // check_lead: inject default fields + optional checkbox_group
        if (block.type === 'check_lead') {
          const fields = (props.fields as unknown[]) ?? [];
          if (fields.length === 0) {
            const base = defaultLeadFields();
            // Splice the checkbox_group BEFORE the GDPR checkbox (= last entry).
            const interestOptions = ['Ausbildung'];
            if (mergedStudiengaenge.length > 0) {
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
  const QUESTION_TYPES = new Set(['check_selbst', 'check_frage', 'check_ergebnisfrage', 'check_swipe_deck', 'check_this_or_that']);
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
          name: sanitizePageName(page.name, 'Frage'),
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
