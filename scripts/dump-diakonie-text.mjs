#!/usr/bin/env node
// READ-ONLY: Gibt je Diakonie-JobQuest die vollständigen Texte der für die
// Emoji-/Tagesplan-Angleichung relevanten Felder aus, damit exakte `old`-Werte
// für scripts/emojify-diakonie-quests.mjs erzeugt werden können.
//
//   node scripts/dump-diakonie-text.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function readEnv(name) {
  const txt = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = txt.match(new RegExp("^" + name + "=(.*)$", "m"));
  if (!m) throw new Error("Env-Variable fehlt: " + name);
  return m[1].trim().replace(/^["']|["']$/g, "");
}
const URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const q = async (p) => (await fetch(`${URL}/rest/v1/${p}`, { headers: H })).json();

// Nur die 9 aktiven Quests (gelöschte Altversionen ausgeschlossen).
const QUESTS = [
  ["Erzieher", "8ac17402-684f-4527-b84a-f446997877e3"],
  ["Hauswirtschaftskraft", "b1c9860d-e0db-4895-ac2c-38786cfb2302"],
  ["Heilerziehungspfleger", "a9c5aeea-9810-495f-8ee3-bcbe5c30d2b1"],
  ["Kaufmännischer Bereich", "be1c4b68-973c-45b3-ade2-70f1fdf58c92"],
  ["Koch", "0bee9d32-ae0f-4639-9641-bae2a4e9e559"],
  ["Landwirt", "6571b66d-e747-4e3b-9790-b7bece4e0848"],
  ["Pflegefachassistenz", "468e2ec4-12c8-4866-b910-1ec97a45b737"],
  ["Pflegefachkraft", "bc3e777b-cd10-47d5-b50d-4a05136c0c55"],
  ["Zerspanungsmechaniker", "7483673e-2e0e-48df-9829-1ac2dd70665a"],
];

const emojiRe = /\p{Extended_Pictographic}/u;
const PRAISE = /^(sehr gut|super|perfekt|top|gut gemacht|gut reagiert|genau richtig|genau so|stark|klasse|toll|großartig)\b/i;

for (const [name, id] of QUESTS) {
  const docs = await q(`funnel_docs?content_id=eq.${id}&select=pages`);
  const pages = docs[0]?.pages || [];
  console.log(`\n\n############### ${name} (${id}) — ${pages.length} Seiten ###############`);
  pages.forEach((pg, p) => {
    (pg.nodes || []).forEach((node, n) => {
      const t = node.type;
      const pr = node.props || {};
      const tag = `[p${p} n${n}] ${t} | page.name="${pg.name ?? ""}"`;
      if (t === "quest_scene") {
        console.log(`${tag}`);
        if (pr.title) console.log(`    title: ${JSON.stringify(pr.title)}`);
        if (pr.description) console.log(`    description: ${JSON.stringify(pr.description)}`);
        if (Array.isArray(pr.bulletPoints) && pr.bulletPoints.length)
          console.log(`    bulletPoints: ${JSON.stringify(pr.bulletPoints)}`);
      } else if (t === "quest_dialog") {
        const lines = pr.lines || [];
        const first = lines[0]?.text || "";
        const praise = PRAISE.test(first.trim());
        const hasEmoji = emojiRe.test(first);
        console.log(`${tag}${praise ? " «LOB»" : ""}${hasEmoji ? " «hat-emoji»" : ""}`);
        lines.forEach((l, li) =>
          console.log(`    lines.${li}.text: ${JSON.stringify(l.text)}`));
      } else if (t === "quest_decision" || t === "quest_quiz") {
        console.log(`${tag}  question: ${JSON.stringify(pr.question)}`);
      }
    });
  });
}
