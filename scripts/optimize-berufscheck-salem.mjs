#!/usr/bin/env node
// Optimiert den Berufscheck "Lass uns deine Traum-Ausbildung finden"
// (Diakonie Stiftung Salem) direkt in funnel_docs.pages.
//
// Ziele (siehe Plan):
//   A) Swipe-Deck: "Nein"/"Neutral" vergeben KEINE Punkte mehr an fremde
//      Berufsfelder (Fremdpunkte raus). "Ja" bleibt + auf das eigene Feld.
//      Karte 8 Positiv P:2 -> 3 (einheitlich +3).
//   B) Entweder/Oder Seite 3: check_this_or_that -> check_frage (3 Optionen),
//      damit Verwaltung fair abgefragt wird und die Dopplung zu Seite 2 wegfällt.
//   C) Slider Seite 5: "planen vs anpacken" -> sauber auf Handwerk (kein
//      falscher Verwaltungs-Pol). Seite 4: vager Fragetext geschärft.
//   D) Wording fuer ~15 J.: Fachwoerter (CNC, Ruecklagen, Cateringangebote).
//
// Nutzung:
//   node scripts/optimize-berufscheck-salem.mjs --dry-run   # zeigt Diffs, schreibt nichts
//   node scripts/optimize-berufscheck-salem.mjs             # PATCHt zurueck
//
// Sicherheit: Jeder Edit prueft den alten Wert (whitespace-normalisiert bzw.
// per Typ). Stimmt der Ist-Zustand nicht, wird der Schritt uebersprungen (kein
// Crash) und gemeldet. Re-run ist idempotent: bereits angewandte Edits werden
// als "= bereits aktuell" erkannt und nicht doppelt geschrieben.
//
// Hinweis: Kartenanzahl pro Feld bleibt bewusst 3/4/3 (Handwerk leicht ueber) -
// dank Pro-Dimension-Normalisierung im Ergebnis unkritisch.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");

function env(n) {
  const m = readFileSync(join(ROOT, ".env.local"), "utf8").match(new RegExp("^" + n + "=(.*)$", "m"));
  if (!m) throw new Error("Env-Variable fehlt: " + n);
  return m[1].trim().replace(/^["']|["']$/g, "");
}
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");

const ID = "55715639-4b11-4636-8e95-12ed8009a1ee";

// Dimensionen
const P = "b5c577a2-d889-4ee1-81f4-a59961a42b1d"; // Pflege & Begleitung
const H = "1ee056f5-4de1-4f7f-8dc0-73da25d31400"; // Handwerk & Technik
const V = "a58cd277-608f-45e1-bc7a-7678a04d58c9"; // Verwaltung & Organisation

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

async function getDoc() {
  const r = await fetch(`${URL}/rest/v1/funnel_docs?content_id=eq.${ID}&select=pages`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error("GET " + r.status + " " + (await r.text()));
  const j = await r.json();
  if (!j[0]) throw new Error("Kein funnel_doc fuer content_id " + ID);
  return j[0].pages;
}
async function putPages(pages) {
  const r = await fetch(`${URL}/rest/v1/funnel_docs?content_id=eq.${ID}`, {
    method: "PATCH",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ pages, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("PATCH " + r.status + " " + (await r.text()));
  return r.status;
}

// findet den ersten Block-Node eines Typs auf einer Seite (auch in Layouts)
function findNode(nodes, type) {
  let res = null;
  (nodes || []).forEach((n) => {
    if (res) return;
    if (n.kind === "layout") {
      res = findNode(n.children, type);
      (n.columns || []).forEach((c) => {
        res = res || findNode(c.nodes || c.children, type);
      });
    } else if (n.type === type) {
      res = n;
    }
  });
  return res;
}
function pageWith(pages, type) {
  return pages.find((p) => findNode(p.nodes, type));
}

let changes = 0;
let warn = 0;
const ok = (m) => console.log("  ✓ " + m);
const same = (m) => console.log("  = " + m);
const miss = (m) => {
  console.warn("  ✗ " + m);
  warn++;
};

const pages = await getDoc();

// ---------------------------------------------------------------- A) Swipe-Deck
console.log("\n=== A) Swipe-Deck: Fremdpunkte raus + Karte 8 vereinheitlichen ===");
{
  const node = findNode(pageWith(pages, "check_swipe_deck")?.nodes ?? [], "check_swipe_deck");
  if (!node) miss("Swipe-Deck nicht gefunden");
  else {
    const cards = node.props.cards || [];
    cards.forEach((card, i) => {
      const label = `Karte ${i + 1}`;
      // Fremdpunkte bei "Nein" entfernen
      const negHad = Object.keys(card.optionNegative?.scores || {}).length > 0;
      if (negHad) {
        card.optionNegative.scores = {};
        changes++;
        ok(`${label}: Nein-Fremdpunkte entfernt`);
      } else if (card.optionNegative) {
        same(`${label}: Nein bereits 0 Punkte`);
      }
      // Sicherheitshalber Neutral ebenfalls auf 0
      if (Object.keys(card.optionNeutral?.scores || {}).length > 0) {
        card.optionNeutral.scores = {};
        changes++;
        ok(`${label}: Neutral-Punkte entfernt`);
      }
      // Karte 8: Positiv P:2 -> 3 (alle anderen Positiv = 3)
      const pos = card.optionPositive?.scores || {};
      if (pos[P] === 2 && Object.keys(pos).length === 1) {
        pos[P] = 3;
        changes++;
        ok(`${label}: Positiv Pflege 2 -> 3`);
      }
    });
  }
}

// --------------------------------------------- D) Swipe-Karten-Wording (~15 J.)
console.log("\n=== D) Swipe-Karten: Fachwoerter glaetten ===");
{
  const node = findNode(pageWith(pages, "check_swipe_deck")?.nodes ?? [], "check_swipe_deck");
  const cards = node?.props.cards || [];
  const TEXT = [
    {
      key: "Cateringangebote",
      old: "Drei Cateringangebote vergleichen, Tabelle erstellen, Auswertung präsentieren – klingt das nach dir?",
      neu: "Drei Catering-Angebote (Essen für eine Feier) vergleichen, in eine Tabelle bringen und vorstellen – klingt das nach dir?",
    },
    {
      key: "CNC-Maschine läuft",
      old: "Eine CNC-Maschine läuft nicht rund. Stundenlang Fehler suchen und systematisch testen – macht dir das etwas aus?",
      neu: "Eine computergesteuerte Maschine (CNC) läuft nicht rund. Stundenlang den Fehler suchen und systematisch testen – macht dir das etwas aus?",
    },
    {
      key: "Rücklagen",
      old: "Du planst das Budget für ein Sommerfest: Einnahmen, Ausgaben, Rücklagen. Macht dir das Spaß oder Stress?",
      neu: "Du planst das Budget für ein Sommerfest: Was kommt rein, was geht raus, was bleibt übrig. Macht dir das Spaß oder Stress?",
    },
  ];
  for (const t of TEXT) {
    const card = cards.find((c) => String(c.text).includes(t.key) || norm(c.text) === norm(t.neu));
    if (!card) {
      miss(`Karte mit "${t.key}" nicht gefunden`);
      continue;
    }
    if (norm(card.text) === norm(t.neu)) {
      same(`"${t.key}" bereits aktuell`);
      continue;
    }
    if (norm(card.text) !== norm(t.old)) {
      miss(`"${t.key}" old-Mismatch -> nicht geaendert`);
      continue;
    }
    card.text = t.neu;
    changes++;
    ok(`"${t.key}" umformuliert`);
  }
}

// --------------------------------------------------- C) Slider Seite 4 + Seite 5
console.log("\n=== C) Slider-Logik & Fragetexte ===");
{
  // Seite 5 = check_selbst mit Handwerk-Dimension
  const node5 = pages
    .map((p) => findNode(p.nodes, "check_selbst"))
    .find((n) => n && n.props.sliderDimensionId === H);
  if (!node5) miss("Handwerk-Slider (Seite 5) nicht gefunden");
  else {
    const edits = [
      { path: "question", old: "Wie gehst du an Probleme heran?", neu: "Wie packst du Aufgaben am liebsten an?" },
      { path: "sliderLabelMin", old: "Erst planen & besprechen", neu: "Erst in Ruhe durchdenken" },
      { path: "sliderLabelMax", old: "Sofort anpacken & ausprobieren", neu: "Direkt mit den Händen loslegen" },
    ];
    for (const e of edits) {
      const cur = node5.props[e.path];
      if (norm(cur) === norm(e.neu)) same(`Slider H .${e.path} bereits aktuell`);
      else if (norm(cur) !== norm(e.old)) miss(`Slider H .${e.path} old-Mismatch`);
      else {
        node5.props[e.path] = e.neu;
        changes++;
        ok(`Slider H .${e.path} aktualisiert`);
      }
    }
  }

  // Seite 4 = check_selbst mit Pflege-Dimension (nur Fragetext)
  const node4 = pages
    .map((p) => findNode(p.nodes, "check_selbst"))
    .find((n) => n && n.props.sliderDimensionId === P);
  if (!node4) miss("Pflege-Slider (Seite 4) nicht gefunden");
  else {
    const old = "Was passt eher zu dir?";
    const neu = "Bist du lieber für dich – oder gern für andere da?";
    const cur = node4.props.question;
    if (norm(cur) === norm(neu)) same("Slider P .question bereits aktuell");
    else if (norm(cur) !== norm(old)) miss("Slider P .question old-Mismatch");
    else {
      node4.props.question = neu;
      changes++;
      ok("Slider P .question geschaerft");
    }
  }
}

// ------------------------------- B) Entweder/Oder Seite 3 -> single_choice Frage
console.log("\n=== B) Seite 3: This-or-That -> 3-Options-Frage (Verwaltung fair) ===");
{
  const page3 = pageWith(pages, "check_this_or_that") &&
    pages.find((p) => {
      const n = findNode(p.nodes, "check_this_or_that");
      // genau die "Taetigkeit"-Seite (nicht die Arbeitsumfeld-Seite 2)
      return n && /tätigkeit|taetigkeit|tätigkeitsart/i.test(p.name || "");
    });
  // schon konvertiert?
  const alreadyConverted = pages.find((p) => /^tätigkeit$/i.test(norm(p.name)) && findNode(p.nodes, "check_frage"));
  if (alreadyConverted) {
    same("Seite 3 bereits zu Frage konvertiert");
  } else if (!page3) {
    miss('Seite "Tätigkeitsart" (check_this_or_that) nicht gefunden');
  } else {
    const node = findNode(page3.nodes, "check_this_or_that");
    node.type = "check_frage";
    node.props = {
      frageType: "single_choice",
      question: "Womit verbringst du am liebsten deinen Arbeitstag?",
      description: "Wähle, was dir am meisten liegt.",
      options: [
        { id: randomUUID(), text: "Mit Menschen reden, helfen und sie begleiten", scores: { [P]: 2 } },
        { id: randomUUID(), text: "Mit den Händen etwas bauen oder reparieren", scores: { [H]: 2 } },
        { id: randomUUID(), text: "Planen, ordnen und den Überblick behalten", scores: { [V]: 2 } },
      ],
    };
    page3.name = "Tätigkeit";
    changes++;
    ok("Seite 3 -> single_choice mit 3 Feldern (P/H/V) konvertiert");
  }
}

// ----------------------------------------------------------------------- Schreiben
console.log(`\n=== Zusammenfassung: ${changes} Aenderung(en), ${warn} Warnung(en) ===`);
if (warn) console.warn("Es gab Mismatch-Warnungen oben – betroffene Edits wurden NICHT angewandt.");

if (changes === 0) {
  console.log("Nichts zu tun (bereits aktuell).");
} else if (DRY) {
  console.log("[DRY-RUN] Es wurde NICHTS geschrieben.");
} else {
  const s = await putPages(pages);
  console.log(`-> PATCH ${s} OK – ${changes} Aenderung(en) gespeichert.`);
}
if (warn) process.exit(1);
