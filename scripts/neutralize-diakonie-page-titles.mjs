#!/usr/bin/env node
// Entfernt Wertungen aus den Seitentiteln (page.name = Orts-Badge oben im Player)
// der Diakonie-JobQuests und ersetzt sie durch eine reine Ort-/Situations-Angabe.
// Betroffen sind v. a. Feedback-Seiten ("Richtig gehandelt", "Falscher Weg",
// "Feedback Richtig/Falsch") und die Bewertungs-/Rating-Seiten ("Bewertung …").
//
//   node scripts/neutralize-diakonie-page-titles.mjs --dry-run   # zeigt Diffs, schreibt nichts
//   node scripts/neutralize-diakonie-page-titles.mjs             # schreibt per PATCH zurück
//
// Sicherheit: Jeder Edit hat ein `old` (Erwartungswert, whitespace-normalisiert).
// Stimmt der aktuelle page.name nicht überein, bricht der Quest-Lauf ab und es
// wird NICHTS geschrieben. Bereits-neu -> übersprungen (idempotent).
// Gelöschte (soft-deleted) Quests sind bewusst NICHT enthalten.

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

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// content_id -> { name, edits: [{ p: pageIndex, old, new }] } (Ziel: pages[p].name)
const QUESTS = {
  // ───────────────────────────────────────────────── HAUSWIRTSCHAFTSKRAFT
  "b1c9860d-e0db-4895-ac2c-38786cfb2302": {
    name: "Hauswirtschaftskraft",
    edits: [
      { p: 6,  old: "Küche: Platten sauber",       new: "Küche" },
      { p: 7,  old: "Küche: Hygiene-Hinweis",       new: "Küche" },
      { p: 10, old: "Wäscheraum: T-Shirt gefunden", new: "Wäscheraum" },
      { p: 11, old: "Wäscheraum: Empathie-Hinweis", new: "Wäscheraum" },
      { p: 14, old: "Kühlschrank: Ergebnis",        new: "Kühlschrank" },
      { p: 18, old: "Feierabend: Bewertung Tag",    new: "Feierabend" },
      { p: 19, old: "Feierabend: Bewertung Beruf",  new: "Feierabend" },
    ],
  },

  // ───────────────────────────────────────────────── HEILERZIEHUNGSPFLEGER
  "a9c5aeea-9810-495f-8ee3-bcbe5c30d2b1": {
    name: "Heilerziehungspfleger",
    edits: [
      { p: 10, old: "Wohnzimmer: Falscher Weg",  new: "Wohnzimmer" },
      { p: 21, old: "Supermarkt: Falsche Antwort", new: "Supermarkt" },
    ],
  },

  // ───────────────────────────────────────────────── KAUFMÄNNISCHER BEREICH
  "be1c4b68-973c-45b3-ade2-70f1fdf58c92": {
    name: "Kaufmännischer Bereich",
    edits: [
      { p: 6,  old: "Büro: Teamarbeit klappt",            new: "Büro" },
      { p: 7,  old: "Büro: Hilfsbereitschaft lernen",     new: "Büro" },
      { p: 10, old: "Zahlungsliste: Richtig gehandelt",   new: "Zahlungsliste" },
      { p: 11, old: "Zahlungsliste: Fehler erklärt",      new: "Zahlungsliste" },
      { p: 23, old: "Mitarbeiter-App: Richtig geholfen",  new: "Mitarbeiter-App" },
      { p: 24, old: "Mitarbeiter-App: Besser machen",     new: "Mitarbeiter-App" },
      { p: 26, old: "Berufsbild: Bewertung",              new: "Feierabend" },
    ],
  },

  // ───────────────────────────────────────────────── KOCH
  "0bee9d32-ae0f-4639-9641-bae2a4e9e559": {
    name: "Koch",
    edits: [
      { p: 6,  old: "Küche: Strukturiert gestartet",     new: "Küche" },
      { p: 8,  old: "Küche: Zu schnell gestartet",       new: "Küche" },
      { p: 9,  old: "Küche: Zeitdruck nach Fehler",      new: "Küche" },
      { p: 11, old: "Küche: Abgestimmt",                 new: "Küche" },
      { p: 12, old: "Küche: Hitze-Fehler",               new: "Küche" },
      { p: 16, old: "Soßenzubereitung: Ehrlich gemeldet", new: "Soßenzubereitung" },
      { p: 17, old: "Soßenzubereitung: Verschwiegen",     new: "Soßenzubereitung" },
      { p: 21, old: "Planung: Ergebnis",                 new: "Planung für morgen" },
      { p: 23, old: "Berufsbild bewerten",               new: "Feierabend" },
    ],
  },

  // ───────────────────────────────────────────────── PFLEGEFACHKRAFT
  "bc3e777b-cd10-47d5-b50d-4a05136c0c55": {
    name: "Pflegefachkraft",
    edits: [
      { p: 8,  old: "Richtiges Verhalten",                  new: "Frau Lehmanns Zimmer" },
      { p: 9,  old: "Feedback Frau Lehmann",                new: "Frau Lehmanns Zimmer" },
      { p: 10, old: "Feedback Frau Lehmann: Hinweis",       new: "Frau Lehmanns Zimmer" },
      { p: 13, old: "Feedback Medikamente: Einfühlsam",     new: "Medikamentengabe" },
      { p: 14, old: "Feedback Medikamente: Weglassen",      new: "Medikamentengabe" },
      { p: 15, old: "Feedback Medikamente: Heimlich",       new: "Medikamentengabe" },
      { p: 21, old: "Feedback Notfall: Besonnen",           new: "Notfall: Frau Schmidt" },
      { p: 22, old: "Feedback Notfall: Hinweis",            new: "Notfall: Frau Schmidt" },
      { p: 25, old: "Bewertung Arbeitstag",                 new: "Feierabend" },
      { p: 26, old: "Bewertung Beruf",                      new: "Feierabend" },
    ],
  },

  // ───────────────────────────────────────────────── ZERSPANUNGSMECHANIKER
  "7483673e-2e0e-48df-9829-1ac2dd70665a": {
    name: "Zerspanungsmechaniker",
    edits: [
      { p: 6, old: "Werkstatt: Sicherheit bestätigt", new: "Werkstatt" },
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
    const page = pages?.[ed.p];
    if (!page) {
      console.error(`  ✗ [${ed.p}] Seite nicht gefunden`);
      questOk = false;
      break;
    }
    const cur = page.name;
    if (norm(cur) === norm(ed.new)) {
      console.log(`  = [${ed.p}] bereits "${ed.new}", übersprungen`);
      continue;
    }
    if (norm(cur) !== norm(ed.old)) {
      console.error(`  ✗ [${ed.p}] old stimmt NICHT überein`);
      console.error(`      erwartet: "${norm(ed.old)}"`);
      console.error(`      ist:      "${norm(cur)}"`);
      questOk = false;
      break;
    }
    page.name = ed.new;
    totalChanges++;
    console.log(`  ✓ [${ed.p}] "${ed.old}"  →  "${ed.new}"`);
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

console.log(`\n${DRY ? "[DRY-RUN] " : ""}Seitentitel geändert: ${totalChanges}`);
if (hadError) {
  console.error("Es gab Fehler/Abgleich-Mismatches – siehe oben.");
  process.exit(1);
}
