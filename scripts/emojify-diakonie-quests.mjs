#!/usr/bin/env node
// Verleiht allen 9 aktiven Diakonie-JobQuests den freundlichen, emoji-reichen
// Charakter der Pflegefachkraft (Wunsch: "mit Emojis, Tagesplan etc.").
//
// Es werden NUR Texte ergänzt/angeglichen – keine Inhalte umgeschrieben:
//   • Begrüßung im Ankommen-Dialog: freundliches 😊
//   • Lob-Feedback ("Sehr gut!", "Super!", …): 🌟
//   • Notfall-/Gefahrenmomente: 🚨
//   • Feierabend-/Abschluss-Beat: 🎉
//   • Tagesplan: Pflegefachkraft erhält Emoji-Bullets; Orts-Badge überall "Tagesplan"
//
// Nutzung:
//   node scripts/emojify-diakonie-quests.mjs --dry-run   # zeigt Diffs, schreibt nichts
//   node scripts/emojify-diakonie-quests.mjs             # schreibt per PATCH zurück
//
// Sicherheit (wie scripts/refine-diakonie-quests.mjs): Jeder Edit hat ein `old`
// (Erwartungswert). Stimmt der aktuelle Wert nicht überein, bricht die Quest ab und
// es wird NICHTS geschrieben. Ist `new` bereits gesetzt → übersprungen (idempotent).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

function readEnv(name) {
  const txt = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = txt.match(new RegExp("^" + name + "=(.*)$", "m"));
  if (!m) throw new Error("Env-Variable fehlt: " + name);
  return m[1].trim().replace(/^["']|["']$/g, "");
}
const URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");

// Gewünschtes "Zuletzt aktualisiert"-Datum für alle Diakonie-JobQuests: 12.05.2026.
// 10:00 UTC = 12:00 in Berlin (Sommerzeit), damit das Datum lokal sicher der 12.05.
// bleibt (formatDateShort nutzt toLocaleDateString('de-DE')).
const TARGET_UPDATED_AT = "2026-05-12T10:00:00.000Z";

const normStr = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
// Vergleich, der sowohl Strings (whitespace-normalisiert) als auch String-Arrays
// (bulletPoints) abdeckt.
function eq(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => normStr(v) === normStr(b[i]));
  }
  return normStr(a) === normStr(b);
}

function getAt(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj, path, val) {
  const parts = path.split(".");
  const last = parts.pop();
  const parent = parts.reduce((o, k) => o[k], obj);
  parent[last] = val;
}
// Wurzel + relativer Pfad bestimmen. "page.*" -> relativ zur Seite,
// sonst relativ zum Node pages[p].nodes[n] (n default 0).
function resolve(pages, ed) {
  if (ed.path.startsWith("page.")) {
    return { root: pages[ed.p], rel: ed.path.slice("page.".length) };
  }
  return { root: pages[ed.p]?.nodes?.[ed.n ?? 0], rel: ed.path };
}

const G = " 😊";   // wird mittels old/new gesetzt; hier nur zur Doku
const STAR = "🌟";

// Edits je content_id. p = Seitenindex, n = Node-Index (default 0).
const QUESTS = {
  // ------------------------------------------------------------------ ERZIEHER
  "8ac17402-684f-4527-b84a-f446997877e3": {
    name: "Erzieher",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Hey, schön, dass du da bist! Ich bin Jana, deine Teamleiterin hier in der Wohngruppe.",
        new: "Hey, schön, dass du da bist! 😊 Ich bin Jana, deine Teamleiterin hier in der Wohngruppe." },
      { p: 6, path: "props.lines.0.text",
        old: "Gut gemacht, @vorname! Du bist ruhig geblieben und hast nachgefragt.",
        new: "Gut gemacht, @vorname! 🌟 Du bist ruhig geblieben und hast nachgefragt." },
      { p: 11, path: "props.lines.0.text",
        old: "Perfekt, @vorname! Bei akuten Schmerzen reicht es nicht, Wochen zu warten.",
        new: "Perfekt, @vorname! 🌟 Bei akuten Schmerzen reicht es nicht, Wochen zu warten." },
      { p: 16, path: "props.lines.0.text",
        old: "Gut gemacht, @vorname! Du bist ruhig geblieben und auf Tim eingegangen.",
        new: "Gut gemacht, @vorname! 🌟 Du bist ruhig geblieben und auf Tim eingegangen." },
      { p: 22, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Du hast den Streit ruhig gestoppt und die Situation strukturiert geklärt.",
        new: "Sehr gut, @vorname! 🌟 Du hast den Streit ruhig gestoppt und die Situation strukturiert geklärt." },
      { p: 23, path: "props.lines.0.text",
        old: "Danke, @vorname! Du hast heute zugehört, einen Streit geschlichtet und richtig Verantwortung übernommen. Genau diese Momente machen den Beruf aus: Du begleitest junge Menschen ein Stück auf ihrem Weg, und das zählt wirklich.",
        new: "🎉 Danke, @vorname! Du hast heute zugehört, einen Streit geschlichtet und richtig Verantwortung übernommen. Genau diese Momente machen den Beruf aus: Du begleitest junge Menschen ein Stück auf ihrem Weg, und das zählt wirklich." },
    ],
  },

  // -------------------------------------------------------- HAUSWIRTSCHAFTSKRAFT
  "b1c9860d-e0db-4895-ac2c-38786cfb2302": {
    name: "Hauswirtschaftskraft",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Guten Morgen! Schön, dass du heute dabei bist. Ich bin Lena, deine Teamleiterin. Wie heißt du eigentlich?",
        new: "Guten Morgen! Schön, dass du heute dabei bist! 😊 Ich bin Lena, deine Teamleiterin. Wie heißt du eigentlich?" },
      { p: 6, path: "props.lines.0.text",
        old: "Gut gemacht, @vorname! Sauberes Geschirr ist bei uns Pflicht, Essensreste und Wasserflecken können Keime übertragen. Du hast das genau richtig gemacht.",
        new: "Gut gemacht, @vorname! 🌟 Sauberes Geschirr ist bei uns Pflicht, Essensreste und Wasserflecken können Keime übertragen. Du hast das genau richtig gemacht." },
      { p: 10, path: "props.lines.0.text",
        old: "Toll, @vorname! Du hast ruhig reagiert und das T-Shirt in der Wäsche gefunden. Herr Fröhlich ist sehr erleichtert.",
        new: "Toll, @vorname! 🌟 Du hast ruhig reagiert und das T-Shirt in der Wäsche gefunden. Herr Fröhlich ist sehr erleichtert." },
      { p: 14, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Verdorbene Lebensmittel müssen sofort entfernt und im Kontrollbuch dokumentiert werden. Ein guter Überblick und klare Struktur im Kühlschrank sind in der Hauswirtschaft unverzichtbar.",
        new: "Sehr gut, @vorname! 🌟 Verdorbene Lebensmittel müssen sofort entfernt und im Kontrollbuch dokumentiert werden. Ein guter Überblick und klare Struktur im Kühlschrank sind in der Hauswirtschaft unverzichtbar." },
      { p: 17, path: "props.lines.0.text",
        old: "Danke, @vorname! Frühstück, Wäsche, Hygiene, Festplanung, du hast heute dafür gesorgt, dass sich die Bewohner*innen wohlfühlen. Genau darum geht's in der Hauswirtschaft.",
        new: "🎉 Danke, @vorname! Frühstück, Wäsche, Hygiene, Festplanung, du hast heute dafür gesorgt, dass sich die Bewohner*innen wohlfühlen. Genau darum geht's in der Hauswirtschaft." },
    ],
  },

  // ----------------------------------------------------------- HEILERZIEHUNGSPFLEGER
  "a9c5aeea-9810-495f-8ee3-bcbe5c30d2b1": {
    name: "Heilerziehungspfleger",
    edits: [
      { p: 2, path: "props.lines.0.text",
        old: "Herzlich willkommen in unserer Wohngruppe! Schön, dass du heute dabei bist.",
        new: "Herzlich willkommen in unserer Wohngruppe! Schön, dass du heute dabei bist! 😊" },
      { p: 3, path: "page.name", old: "Tagesablauf", new: "Tagesplan" },
      { p: 9, path: "props.lines.0.text",
        old: "Das war wirklich klasse, @vorname! Du hast Paul zugehört, sein Problem ernst genommen und ihm aktiv geholfen.",
        new: "Das war wirklich klasse, @vorname! 🌟 Du hast Paul zugehört, sein Problem ernst genommen und ihm aktiv geholfen." },
      { p: 14, path: "props.lines.0.text",
        old: "Super, @vorname! Du konntest Schlimmeres verhindern.",
        new: "Super, @vorname! 🌟 Du konntest Schlimmeres verhindern." },
      { p: 24, path: "props.lines.1.text",
        old: "Gut gemacht, @vorname! Du bist ruhig geblieben und hast freundlich erklärt, dass das Geld nicht reicht.",
        new: "Gut gemacht, @vorname! 🌟 Du bist ruhig geblieben und hast freundlich erklärt, dass das Geld nicht reicht." },
    ],
  },

  // ---------------------------------------------------------- KAUFMÄNNISCHER BEREICH
  "be1c4b68-973c-45b3-ade2-70f1fdf58c92": {
    name: "Kaufmännischer Bereich",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Guten Morgen! Schön, dass du heute dabei bist. Ich bin Jana, deine Ausbilderin hier im kaufmännischen Bereich.",
        new: "Guten Morgen! Schön, dass du heute dabei bist! 😊 Ich bin Jana, deine Ausbilderin hier im kaufmännischen Bereich." },
      { p: 3, path: "page.name", old: "Büro: Tagesplan", new: "Tagesplan" },
      { p: 6, path: "props.lines.0.text",
        old: "Danke, @vorname! Das hätte ich alleine nicht so schnell hinbekommen. Super, dass du dir die Zeit genommen hast.",
        new: "Danke, @vorname! 🌟 Das hätte ich alleine nicht so schnell hinbekommen. Super, dass du dir die Zeit genommen hast." },
      { p: 10, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Wenn eine Buchung nicht aufgeht, prüfst du den Vorgang nochmal in Ruhe und holst dir bei Bedarf Unterstützung. So vermeidest du Folgefehler.",
        new: "Sehr gut, @vorname! 🌟 Wenn eine Buchung nicht aufgeht, prüfst du den Vorgang nochmal in Ruhe und holst dir bei Bedarf Unterstützung. So vermeidest du Folgefehler." },
      { p: 20, path: "props.lines.0.text",
        old: "Super, @vorname! Genau so macht man das: erst alle Anschreiben vorbereiten, dann alles auf einmal drucken und anschließend verpacken. Das spart Zeit und du behältst den Überblick.",
        new: "Super, @vorname! 🌟 Genau so macht man das: erst alle Anschreiben vorbereiten, dann alles auf einmal drucken und anschließend verpacken. Das spart Zeit und du behältst den Überblick." },
      { p: 23, path: "props.lines.2.text",
        old: "Genau das ist kaufmännische Arbeit: Du hältst den Laden am Laufen und bist für alle der Anker. Starker erster Tag!",
        new: "Genau das ist kaufmännische Arbeit: Du hältst den Laden am Laufen und bist für alle der Anker. Starker erster Tag! 🎉" },
    ],
  },

  // ----------------------------------------------------------------------- KOCH
  "0bee9d32-ae0f-4639-9641-bae2a4e9e559": {
    name: "Koch",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Guten Morgen! Schön, dass du pünktlich bist. Ich bin Marta, die Küchenleitung. Wie heißt du denn?",
        new: "Guten Morgen! Schön, dass du pünktlich bist! 😊 Ich bin Marta, die Küchenleitung. Wie heißt du denn?" },
      { p: 3, path: "page.name", old: "Küche: Tagesplan", new: "Tagesplan" },
      { p: 6, path: "props.lines.0.text",
        old: "Super, @vorname! Du verschaffst dir zuerst einen Überblick. Bei 200 Portionen können kleine Fehler große Folgen haben. Struktur spart später Zeit.",
        new: "Super, @vorname! 🌟 Du verschaffst dir zuerst einen Überblick. Bei 200 Portionen können kleine Fehler große Folgen haben. Struktur spart später Zeit." },
      { p: 11, path: "props.lines.0.text",
        old: "Genau richtig, @vorname! In der Großküche arbeitest du im Team. Abstimmung ist wichtiger als Schnellschüsse, so vermeidest du Qualitätsprobleme kurz vor der Ausgabe.",
        new: "Genau richtig, @vorname! 🌟 In der Großküche arbeitest du im Team. Abstimmung ist wichtiger als Schnellschüsse, so vermeidest du Qualitätsprobleme kurz vor der Ausgabe." },
      { p: 18, path: "props.lines.0.text",
        old: "Stark, @vorname! Gemeinsam habt ihr schnell eine neue Soße angesetzt. Jetzt steht noch die Planung für morgen an.",
        new: "Stark, @vorname! 🌟 Gemeinsam habt ihr schnell eine neue Soße angesetzt. Jetzt steht noch die Planung für morgen an." },
      { p: 21, path: "props.lines.2.text",
        old: "So werden aus 200 Portionen warme Mahlzeiten für echte Menschen. Toller erster Tag, Feierabend!",
        new: "So werden aus 200 Portionen warme Mahlzeiten für echte Menschen. Toller erster Tag, Feierabend! 🎉" },
    ],
  },

  // ------------------------------------------------------------------ LANDWIRT
  "6571b66d-e747-4e3b-9790-b7bece4e0848": {
    name: "Landwirt",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Moin! Schön, dass du pünktlich bist. Ich bin Anna, deine Ausbilderin hier auf dem Hof.",
        new: "Moin! Schön, dass du pünktlich bist! 😊 Ich bin Anna, deine Ausbilderin hier auf dem Hof." },
      { p: 3, path: "page.name", old: "Schichtübergabe", new: "Tagesplan" },
      { p: 6, path: "props.lines.0.text",
        old: "Perfekt, @vorname! Die Kühe fressen das Futter. Auf einem Hof gilt: Erst die Tiere, dann alles andere.",
        new: "Perfekt, @vorname! 🌟 Die Kühe fressen das Futter. Auf einem Hof gilt: Erst die Tiere, dann alles andere." },
      { p: 10, path: "props.lines.0.text",
        old: "Super gemacht, @vorname! Alle Beschäftigten sind mit Freude dabei, genau so soll das sein.",
        new: "Super gemacht, @vorname! 🌟 Alle Beschäftigten sind mit Freude dabei, genau so soll das sein." },
      { p: 16, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Du hast sofort richtig reagiert. Plötzlicher Milchverlust ist immer ein Warnsignal.",
        new: "Sehr gut, @vorname! 🌟 Du hast sofort richtig reagiert. Plötzlicher Milchverlust ist immer ein Warnsignal." },
      { p: 20, path: "props.lines.1.text",
        old: "Danke, @vorname! Du hast Tiere versorgt, im Team angepackt und im Notfall richtig reagiert. Genau das macht den Beruf aus, kein Tag ist wie der andere.",
        new: "🎉 Danke, @vorname! Du hast Tiere versorgt, im Team angepackt und im Notfall richtig reagiert. Genau das macht den Beruf aus, kein Tag ist wie der andere." },
    ],
  },

  // ----------------------------------------------------------- PFLEGEFACHASSISTENZ
  "468e2ec4-12c8-4866-b910-1ec97a45b737": {
    name: "Pflegefachassistenz",
    edits: [
      { p: 2, path: "props.lines.0.text",
        old: "Guten Morgen! Schön, dass du heute dabei bist. Ich bin Simon, deine Ansprechperson für die Frühschicht.",
        new: "Guten Morgen! Schön, dass du heute dabei bist! 😊 Ich bin Simon, deine Ansprechperson für die Frühschicht." },
      { p: 3, path: "page.name", old: "Schichtübergabe", new: "Tagesplan" },
      { p: 6, path: "props.lines.0.text",
        old: "Gut gemacht, @vorname! Herrn Krüger so zu unterstützen, wie er es wirklich braucht, das ist aktivierende Pflege.",
        new: "Gut gemacht, @vorname! 🌟 Herrn Krüger so zu unterstützen, wie er es wirklich braucht, das ist aktivierende Pflege." },
      { p: 10, path: "props.lines.3.text",
        old: "Super, @vorname! So geht Pflege mit Respekt und Einfühlungsvermögen.",
        new: "Super, @vorname! 🌟 So geht Pflege mit Respekt und Einfühlungsvermögen." },
      { p: 14, path: "props.lines.0.text",
        old: "Gut reagiert, @vorname! Du hast sofort Bescheid gegeben, genau so läuft das in der Pflege.",
        new: "Gut reagiert, @vorname! 🌟 Du hast sofort Bescheid gegeben, genau so läuft das in der Pflege." },
      { p: 17, path: "props.lines.1.text",
        old: "Ich kann euch sagen, @vorname hat heute wirklich gut mitgemacht. Einfühlsam, aufmerksam und teamfähig!",
        new: "Ich kann euch sagen, @vorname hat heute wirklich gut mitgemacht. Einfühlsam, aufmerksam und teamfähig! 🎉" },
    ],
  },

  // -------------------------------------------------------------- PFLEGEFACHKRAFT
  "bc3e777b-cd10-47d5-b50d-4a05136c0c55": {
    name: "Pflegefachkraft",
    edits: [
      { p: 2, path: "props.lines.0.text",
        old: "Guten Morgen! Schön, dass du heute dabei bist Ich bin Sandra, deine Praxisanleiterin hier bei der Diakonie Stiftung Salem.",
        new: "Guten Morgen! Schön, dass du heute dabei bist! 😊 Ich bin Sandra, deine Praxisanleiterin hier bei der Diakonie Stiftung Salem." },
      { p: 3, path: "page.name", old: "Überblick Arbeitstag", new: "Tagesplan" },
      { p: 3, path: "props.bulletPoints",
        old: ["6:30 Uhr, Schichtübergabe mit dem Team", "Pflegedokumentation von Frau Lehmann lesen", "Frau Lehmann besuchen und Blutdruck messen", "Medikamenteneinnahme begleiten", "Herrn Meyer bei Bedarf unterstützen", "Auf unvorhergesehene Situationen reagieren"],
        new: ["🕧 6:30 Uhr, Schichtübergabe mit dem Team", "📋 Pflegedokumentation von Frau Lehmann lesen", "🩺 Frau Lehmann besuchen und Blutdruck messen", "💊 Medikamenteneinnahme begleiten", "🤝 Herrn Meyer bei Bedarf unterstützen", "🚨 Auf unvorhergesehene Situationen reagieren"] },
      { p: 9, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Blutdruck messen, respektvoller Umgang und einfühlsames Nachfragen, das hat Frau Lehmann sichtlich gutgetan.",
        new: "Sehr gut, @vorname! 🌟 Blutdruck messen, respektvoller Umgang und einfühlsames Nachfragen, das hat Frau Lehmann sichtlich gutgetan." },
      { p: 13, path: "props.lines.0.text",
        old: "Super gemacht, @vorname! Einfühlsam auf sie zugehen und ihr die Bedeutung zu erklären, genau so geht das.",
        new: "Super gemacht, @vorname! 🌟 Einfühlsam auf sie zugehen und ihr die Bedeutung zu erklären, genau so geht das." },
      { p: 19, path: "props.lines.0.text",
        old: "Schnell, Frau Schmidt ist gestürzt!",
        new: "🚨 Schnell, Frau Schmidt ist gestürzt!" },
      { p: 21, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Bei einem Sturz gilt immer: Nicht bewegen, die Person beruhigen und sofort eine Pflegefachkraft rufen. Verletzungen können von außen nicht sichtbar sein.",
        new: "Sehr gut, @vorname! 🌟 Bei einem Sturz gilt immer: Nicht bewegen, die Person beruhigen und sofort eine Pflegefachkraft rufen. Verletzungen können von außen nicht sichtbar sein." },
      { p: 24, path: "props.title",
        old: "Feierabend: Dein Tag ist vorbei!",
        new: "🎉 Feierabend: Dein Tag ist vorbei!" },
    ],
  },

  // -------------------------------------------------------- ZERSPANUNGSMECHANIKER
  "7483673e-2e0e-48df-9829-1ac2dd70665a": {
    name: "Zerspanungsmechaniker",
    edits: [
      { p: 2, path: "props.lines.1.text",
        old: "Hey, schön dass du heute dabei bist! Ich bin Markus, dein Ausbilder. Bevor wir loslegen, wie heißt du eigentlich?",
        new: "Hey, schön dass du heute dabei bist! 😊 Ich bin Markus, dein Ausbilder. Bevor wir loslegen, wie heißt du eigentlich?" },
      { p: 3, path: "page.name", old: "Werkstatt: Tagesplan", new: "Tagesplan" },
      { p: 6, path: "props.lines.0.text",
        old: "Top, @vorname! Du bist richtig ausgerüstet. Jetzt können wir in die Halle.",
        new: "Top, @vorname! 🌟 Du bist richtig ausgerüstet. Jetzt können wir in die Halle." },
      { p: 11, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Genau so macht man das. Werkstück eingespannt, Werkzeug geprüft, Maße kontrolliert, jetzt kann die Maschine starten.",
        new: "Sehr gut, @vorname! 🌟 Genau so macht man das. Werkstück eingespannt, Werkzeug geprüft, Maße kontrolliert, jetzt kann die Maschine starten." },
      { p: 19, path: "props.lines.0.text",
        old: "Sehr gut, @vorname! Das alte Werkstück lag außerhalb der Toleranz, du hast es sofort erkannt und neu gefertigt. Jetzt passt es exakt.",
        new: "Sehr gut, @vorname! 🌟 Das alte Werkstück lag außerhalb der Toleranz, du hast es sofort erkannt und neu gefertigt. Jetzt passt es exakt." },
      { p: 20, path: "props.lines.0.text",
        old: "Dein Werkstück misst exakt 20,0 mm, @vorname, perfekt. Starker erster Tag! Aus einem Stück Rohmetall ein präzises Bauteil zu machen, das wirklich gebraucht wird, genau das ist Zerspanungsmechanik.",
        new: "🎉 Dein Werkstück misst exakt 20,0 mm, @vorname, perfekt. Starker erster Tag! Aus einem Stück Rohmetall ein präzises Bauteil zu machen, das wirklich gebraucht wird, genau das ist Zerspanungsmechanik." },
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
    body: JSON.stringify({ pages, updated_at: TARGET_UPDATED_AT }),
  });
  if (!res.ok) throw new Error(`PATCH ${id}: ${res.status} ${await res.text()}`);
  return res.status;
}

// Setzt job_quests.updated_at (= "Aktualisiert" im Dashboard) für ALLE
// Diakonie-JobQuests auf das Zieldatum.
async function setDiakonieQuestDates() {
  const cRes = await fetch(
    `${URL}/rest/v1/companies?select=id,name&name=ilike.*diakonie*`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  if (!cRes.ok) throw new Error(`GET companies: ${cRes.status} ${await cRes.text()}`);
  const companies = await cRes.json();
  const ids = companies.map((c) => c.id);
  if (!ids.length) throw new Error("Keine Diakonie-Firma gefunden.");

  const inList = `(${ids.join(",")})`;
  const listRes = await fetch(
    `${URL}/rest/v1/job_quests?select=id,title&company_id=in.${inList}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const list = await listRes.json();
  console.log(`\n=== Datum "Aktualisiert" → 12.05.2026 (${list.length} Diakonie-JobQuests) ===`);

  if (DRY) {
    console.log(`  (dry-run) würde job_quests.updated_at = ${TARGET_UPDATED_AT} setzen.`);
    return;
  }
  const res = await fetch(`${URL}/rest/v1/job_quests?company_id=in.${inList}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ updated_at: TARGET_UPDATED_AT }),
  });
  if (!res.ok) throw new Error(`PATCH job_quests: ${res.status} ${await res.text()}`);
  console.log(`  -> PATCH ${res.status} OK (updated_at = ${TARGET_UPDATED_AT})`);
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
    const { root, rel } = resolve(pages, ed);
    if (!root) {
      console.error(`  ✗ [p${ed.p} n${ed.n ?? 0}] ${ed.path}: Ziel nicht gefunden`);
      questOk = false;
      break;
    }
    const cur = getAt(root, rel);
    if (eq(cur, ed.new)) {
      console.log(`  = [p${ed.p}] ${ed.path}: bereits aktuell, übersprungen`);
      continue;
    }
    if (!eq(cur, ed.old)) {
      console.error(`  ✗ [p${ed.p}] ${ed.path}: old stimmt NICHT überein`);
      console.error(`      erwartet: ${JSON.stringify(ed.old)}`);
      console.error(`      ist:      ${JSON.stringify(cur)}`);
      questOk = false;
      break;
    }
    setAt(root, rel, ed.new);
    totalChanges++;
    console.log(`  ✓ [p${ed.p}] ${ed.path}`);
    console.log(`      nachher: ${JSON.stringify(ed.new)}`);
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

// Datum "Aktualisiert" für alle Diakonie-JobQuests vereinheitlichen.
try {
  await setDiakonieQuestDates();
} catch (e) {
  console.error("  FEHLER beim Datum-Setzen:", e.message);
  hadError = true;
}

console.log(`\n${DRY ? "[DRY-RUN] " : ""}Edits angewandt: ${totalChanges}`);
if (hadError) {
  console.error("Es gab Fehler/Abgleich-Mismatches, siehe oben.");
  process.exit(1);
}
