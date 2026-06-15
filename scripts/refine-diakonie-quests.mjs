#!/usr/bin/env node
// Überarbeitet die 6 Diakonie-JobQuest-Entwürfe direkt in funnel_docs.pages.
// Ziel: klarere Storyline, weniger Text, mehr Begeisterung (siehe Plan).
//
// Nutzung:
//   node scripts/refine-diakonie-quests.mjs --dry-run   # zeigt Diffs, schreibt nichts
//   node scripts/refine-diakonie-quests.mjs             # schreibt per PATCH zurück
//
// Sicherheit: Jeder Edit hat ein `old` (Erwartungswert). Stimmt der aktuelle
// Feldwert (whitespace-normalisiert) nicht überein, bricht der Quest-Lauf ab
// und es wird NICHTS geschrieben. Ganzfeld-Ersetzung -> idempotenz-sicher.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

// --- .env.local einlesen (nur die zwei benötigten Keys; Datei hat sonst Parse-Eigenheiten) ---
function readEnv(name) {
  const txt = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = txt.match(new RegExp("^" + name + "=(.*)$", "m"));
  if (!m) throw new Error("Env-Variable fehlt: " + name);
  return m[1].trim().replace(/^["']|["']$/g, "");
}
const URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// Pfad innerhalb eines Node-Props auflösen: z.B. "props.lines.1.text"
function getAt(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj, path, val) {
  const parts = path.split(".");
  const last = parts.pop();
  const parent = parts.reduce((o, k) => o[k], obj);
  parent[last] = val;
}

// Edits je content_id. node:0 (alle betroffenen Seiten haben genau einen Node).
// p = pageIndex. path relativ zum Node. old = normalisierter Erwartungswert.
const QUESTS = {
  // ------------------------------------------------------------------ LANDWIRT
  "6571b66d-e747-4e3b-9790-b7bece4e0848": {
    name: "Landwirt",
    edits: [
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "Tiere versorgen, mit anpacken, Verantwortung übernehmen – erlebe in 3 Minuten einen echten Tag auf dem Hof und entscheide selbst, was zu tun ist." },
      // Quiz auf Durchschnitt umstellen (passt zu den 25–30 Litern in Szene [17])
      { p: 13, path: "props.question",
        old: "Bis zu wie viel Litern Milch kann eine Kuh am Tag geben, @vorname?",
        new: "Wie viel Milch gibt eine Kuh bei uns im Schnitt pro Tag, @vorname?" },
      { p: 13, path: "props.options.0.text",
        old: "Über 40 Liter",
        new: "25 bis 30 Liter" },
      // "Hof Klanhorst" raus + straffen
      { p: 17, path: "props.lines.0.text",
        old: "Stopp, @vorname. Unsere Biokühe auf dem Hof Klanhorst geben im Schnitt 25–30 Liter pro Tag. Nur 8 Liter sind ein klares Warnsignal.",
        new: "Stopp, @vorname. Unsere Kühe geben im Schnitt 25–30 Liter pro Tag. Nur 8 Liter sind ein klares Warnsignal." },
      { p: 17, path: "props.lines.1.text",
        old: "Richtiges Verhalten: Das kann auf eine Krankheit oder Euterentzündung hindeuten. In so einem Fall müssen wir sofort Ausbilder und Tierarzt informieren.",
        new: "Das kann auf eine Krankheit oder Euterentzündung hindeuten – dann sofort Ausbilder und Tierarzt informieren." },
      // Fehler-Pfad Schweinestall straffen
      { p: 11, path: "props.lines.1.text",
        old: "So fühlen sich alle sicher, und ihr schafft die Aufgabe als echtes Team. Das ist uns hier bei der Diakonie Salem besonders wichtig.",
        new: "So fühlt sich jeder sicher – und ihr schafft die Aufgabe als echtes Team." },
      // Feierabend-Payoff (Begeistern)
      { p: 20, path: "props.lines.1.text",
        old: "Danke, @vorname, für deine Hilfe heute auf dem Hof! Du hast dich wirklich gut geschlagen.",
        new: "Danke, @vorname! Du hast Tiere versorgt, im Team angepackt und im Notfall richtig reagiert. Genau das macht den Beruf aus – kein Tag ist wie der andere." },
    ],
  },

  // ------------------------------------------------------- ZERSPANUNGSMECHANIKER
  "7483673e-2e0e-48df-9829-1ac2dd70665a": {
    name: "Zerspanungsmechaniker",
    edits: [
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "Präzise arbeiten, eine CNC-Maschine bedienen, dein erstes eigenes Werkstück fertigen – erlebe in 3 Minuten einen Tag in der Werkstatt und entscheide selbst." },
      // CNC-Vorbereiten-Szene straffen
      { p: 9, path: "props.description",
        old: "Du stehst vor der CNC-Fräsmaschine (eine computergesteuerte Maschine, die Werkstücke automatisch nach Programm bearbeitet). Das Rohstück liegt bereit, das Programm ist geladen. Markus beobachtet dich aus der Ferne. Jetzt musst du entscheiden, wie du vorgehst.",
        new: "Du stehst vor der CNC-Fräsmaschine – sie bearbeitet Werkstücke automatisch nach Programm. Das Rohteil liegt bereit, das Programm ist geladen. Wie gehst du vor?" },
      // Gestapelte Begründung straffen
      { p: 17, path: "props.lines.1.text",
        old: "Ein fehlerhaftes Werkstück darf nicht verbaut werden – das kann Maschinen beschädigen oder zu Ausfällen führen. Kunden erwarten maßgenaue Teile, und fehlerhafte Lieferungen können Reklamationen und Produktionsstopps verursachen. Wir fertigen es neu.",
        new: "Ein fehlerhaftes Werkstück darf nicht verbaut werden – es kann später eine ganze Maschine lahmlegen. Wir fertigen es neu." },
      // KONTINUITÄTS-FIX: Teil wurde gerade neu & korrekt gefertigt
      { p: 19, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Das Werkstück liegt außerhalb der Toleranz – du hast das sofort erkannt und richtig gehandelt.",
        new: "Sehr gut, @vorname! Das alte Werkstück lag außerhalb der Toleranz – du hast es sofort erkannt und neu gefertigt. Jetzt passt es exakt." },
      { p: 19, path: "props.lines.1.text",
        old: "Qualitätskontrolle ist keine Kleinigkeit. Ein fehlerhaftes Werkstück kann eine ganze Pumpe zum Ausfall bringen. Du machst das gut.",
        new: "Qualitätskontrolle ist keine Kleinigkeit – ein einziges falsches Teil kann eine ganze Pumpe ausfallen lassen. Stark gemacht!" },
      // Schluss-Szene: Payoff + Begeistern, Aufzählung weg
      { p: 20, path: "props.description",
        old: "Das neu gefertigte Werkstück misst exakt 20,0 mm – mitten in der Toleranz. Markus gibt dir ein Daumen-hoch. Dein erster Arbeitstag neigt sich dem Ende. Du hast heute Schutzregeln eingehalten, Toleranzen verstanden, die CNC-Maschine richtig bedient und Qualitätskontrolle durchgeführt.",
        new: "Dein Werkstück misst exakt 20,0 mm – perfekt. Markus gibt dir ein Daumen-hoch: „Starker erster Tag, @vorname!“ Aus einem Stück Rohmetall ein präzises Bauteil zu machen, das wirklich gebraucht wird – genau das ist Zerspanungsmechanik." },
    ],
  },

  // ------------------------------------------------------------------- ERZIEHER
  "8ac17402-684f-4527-b84a-f446997877e3": {
    name: "Erzieher",
    edits: [
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "Jugendliche begleiten, in schwierigen Momenten da sein, echte Verantwortung übernehmen – erlebe in 3 Minuten einen Tag in der Wohngruppe und entscheide selbst." },
      // Grammatik-Fix @vorname + leicht straffen
      { p: 3, path: "props.description",
        old: "Heute begleitest du @vorname die Jugendlichen durch ihren Alltag. Das erwartet dich heute:",
        new: "Heute begleitest du, @vorname, die Jugendlichen durch ihren Alltag. Das steht an:" },
      // Doppelte Verstärkungs-Schleife entschärfen: Erfolgsdialog straffen
      { p: 6, path: "props.lines.1.text",
        old: "So fühlt Jonas sich ernst genommen – und du kannst die Situation wirklich klären, statt nur zu unterdrücken.",
        new: "So fühlt Jonas sich ernst genommen – und geht danach freiwillig zur Schule. Klasse!" },
      { p: 6, path: "props.lines.2.text",
        old: "Er ist danach freiwillig zur Schule gegangen. Klasse!",
        new: "Solche Momente sind der Kern des Berufs: zuhören, statt nur Ansagen machen." },
      // Feierabend-Szene: Payoff + Begeistern
      { p: 23, path: "props.description",
        old: "Danke, @vorname, für deinen Einsatz heute! Du hast Jugendliche begleitet, Konflikte gelöst, Termine organisiert und Hausaufgaben unterstützt. Du hast nun Feierabend – das war ein echter Einblick in die Arbeit als Erzieher bei der Diakonie Stiftung Salem.",
        new: "Danke, @vorname! Du hast heute zugehört, Streit geschlichtet und Verantwortung für andere übernommen. Genau diese Momente machen den Beruf aus: Du begleitest junge Menschen ein Stück auf ihrem Weg – und das zählt wirklich." },
    ],
  },

  // -------------------------------------------------------- HAUSWIRTSCHAFTSKRAFT
  "b1c9860d-e0db-4895-ac2c-38786cfb2302": {
    name: "Hauswirtschaftskraft",
    edits: [
      // Branding vereinheitlichen
      { p: 0, path: "props.title",
        old: "Willkommen in unserer Einrichtung!",
        new: "Willkommen bei der Diakonie Stiftung Salem" },
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "Für andere sorgen, Hygiene im Blick behalten, ein Fest organisieren – erlebe in 3 Minuten einen abwechslungsreichen Tag in der Hauswirtschaft und entscheide selbst." },
      // Feierabend/Payoff (letzter Story-Beat vor den Bewertungen): wärmer + Begeistern
      { p: 17, path: "props.lines.0.text",
        old: "Danke, @vorname, für die tolle Planung! Sicherheit geht immer vor – du hast das gut im Blick gehabt.",
        new: "Danke, @vorname! Frühstück, Wäsche, Hygiene, Festplanung – du hast heute dafür gesorgt, dass sich die Bewohner*innen wohlfühlen. Genau darum geht's in der Hauswirtschaft." },
    ],
  },

  // ---------------------------------------------------------- KAUFMÄNNISCHER BER.
  "be1c4b68-973c-45b3-ade2-70f1fdf58c92": {
    name: "Kaufmännischer Bereich",
    edits: [
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "Mit Zahlen jonglieren, Probleme lösen, Ansprechpartner:in für andere sein – erlebe in 3 Minuten einen Tag im Büro und entscheide selbst." },
      // Lange Falsch-Reaktion straffen
      { p: 5, path: "props.options.1.reaction",
        old: "Als Auszubildender gehört es dazu, Kolleg:innen zu unterstützen – auch wenn es nicht deine Kernaufgabe ist. Hilfsbereitschaft und Teamgeist sind im Büroalltag unverzichtbar. Beim nächsten Mal einfach kurz nachfragen, wie du helfen kannst!",
        new: "Kolleg:innen zu unterstützen gehört dazu – auch wenn's nicht deine Kernaufgabe ist. Frag beim nächsten Mal einfach: Wie kann ich helfen?" },
      // Letzter Story-Beat (Erfolg) doubelt als Tagesabschluss + Payoff
      { p: 23, path: "props.lines.1.text",
        old: "Sehr gut, @vorname! Genau das ist es: zuhören, verstehen, verständlich erklären. So baust du Vertrauen auf und hilfst wirklich weiter – egal ob am Telefon oder persönlich.",
        new: "Sehr gut, @vorname! Zuhören, verstehen, verständlich erklären – so baust du Vertrauen auf. Genau das ist kaufmännische Arbeit: Du hältst den Laden am Laufen und bist für alle der Anker. Starker erster Tag!" },
      // Falsch-Pfad nicht auf einer Rüge enden lassen
      { p: 24, path: "props.lines.1.text",
        old: "Hör aktiv zu, stelle Rückfragen und erkläre dann Schritt für Schritt. Wenn du es wirklich nicht weißt, hol dir Unterstützung – aber lass die Person nicht einfach stehen.",
        new: "Hör aktiv zu, stelle Rückfragen und erkläre dann Schritt für Schritt – und lass die Person nie einfach stehen. Kein Stress, das lernst du schnell. Starker erster Tag, @vorname!" },
    ],
  },

  // ----------------------------------------------------------------------- KOCH
  "0bee9d32-ae0f-4639-9641-bae2a4e9e559": {
    name: "Koch",
    edits: [
      { p: 0, path: "props.description",
        old: "In 3 Minuten bekommst du einen kleinen Einblick in den Arbeitstag und kannst selbst Entscheidungen treffen.",
        new: "200 Portionen, Zeitdruck, ein echtes Team – erlebe in 3 Minuten einen Tag in der Großküche und entscheide selbst, wie du kochst." },
      // KONTINUITÄT: nach richtigem Start trotzdem Zeitdruck -> externen Grund geben
      { p: 7, path: "props.description",
        old: "Die Kartoffeln sind fast fertig. Du merkst aber: Du bist zu langsam und wirst es nicht rechtzeitig zur Portionierung um 9:00 Uhr schaffen.",
        new: "Die Kartoffeln köcheln. Da kommt Marta: Eine zweite Gruppe hat sich kurzfristig zum Mittagessen angemeldet – jetzt wird die Zeit bis zur Portionierung um 9:00 Uhr knapp." },
      // Feierabend-Payoff (Begeistern)
      { p: 21, path: "props.lines.1.text",
        old: "Vielen Dank für deinen Einsatz, @vorname – du hast einen tollen ersten Tag hingelegt. Feierabend!",
        new: "Vielen Dank, @vorname – du hast unter Zeitdruck den Kopf behalten, im Team angepackt und ehrlich gehandelt. So werden aus 200 Portionen warme Mahlzeiten für echte Menschen. Toller erster Tag – Feierabend!" },
    ],
  },
};

async function fetchPages(id) {
  const res = await fetch(
    `${URL}/rest/v1/funnel_docs?content_id=eq.${id}&select=pages`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  if (!res.ok) throw new Error(`GET ${id}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!rows.length) throw new Error(`Kein funnel_doc für ${id}`);
  return rows[0].pages;
}

async function patchPages(id, pages) {
  const res = await fetch(`${URL}/rest/v1/funnel_docs?content_id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ pages, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
  return res.status;
}

let totalChanges = 0;
let hadError = false;

for (const [id, quest] of Object.entries(QUESTS)) {
  console.log(`\n=== ${quest.name} (${id}) ===`);
  let pages;
  try {
    pages = await fetchPages(id);
  } catch (e) {
    console.error("  FEHLER beim Laden:", e.message);
    hadError = true;
    continue;
  }

  let questOk = true;
  for (const ed of quest.edits) {
    const node = pages?.[ed.p]?.nodes?.[0];
    if (!node) {
      console.error(`  ✗ [${ed.p}] ${ed.path}: Node nicht gefunden`);
      questOk = false;
      break;
    }
    const cur = getAt(node, ed.path);
    if (norm(cur) === norm(ed.new)) {
      console.log(`  = [${ed.p}] ${ed.path}: bereits aktuell, übersprungen`);
      continue;
    }
    if (norm(cur) !== norm(ed.old)) {
      console.error(`  ✗ [${ed.p}] ${ed.path}: old stimmt NICHT überein`);
      console.error(`      erwartet: ${norm(ed.old)}`);
      console.error(`      ist:      ${norm(cur)}`);
      questOk = false;
      break;
    }
    setAt(node, ed.path, ed.new);
    totalChanges++;
    console.log(`  ✓ [${ed.p}] ${ed.path}`);
    console.log(`      vorher:  ${norm(ed.old)}`);
    console.log(`      nachher: ${ed.new}`);
  }

  if (!questOk) {
    hadError = true;
    console.error(`  -> ${quest.name}: NICHT geschrieben (Abgleichfehler).`);
    continue;
  }

  if (DRY) {
    console.log(`  (dry-run) ${quest.name}: würde geschrieben.`);
  } else {
    try {
      const status = await patchPages(id, pages);
      console.log(`  -> PATCH ${status} OK`);
    } catch (e) {
      console.error("  FEHLER beim Schreiben:", e.message);
      hadError = true;
    }
  }
}

console.log(`\n${DRY ? "[DRY-RUN] " : ""}Edits angewandt: ${totalChanges}`);
if (hadError) {
  console.error("Es gab Fehler/Abgleich-Mismatches – siehe oben.");
  process.exit(1);
}
