#!/usr/bin/env node
// READ-ONLY: Listet alle Diakonie-JobQuests und je Seite den page.name
// (= Orts-Badge oben im Player) inkl. Node-Typen + kurzem Text-Snippet,
// damit erkennbar ist, welche Seitentitel eine Wertung statt Ort/Situation tragen.
//
//   node scripts/inspect-diakonie-page-names.mjs

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

async function q(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const snippet = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 70);

// 1) Diakonie-Firma(en)
const companies = await q("companies?select=id,name&name=ilike.*diakonie*");
console.log("Diakonie-Firmen:", companies.map((c) => `${c.name} (${c.id})`).join(", ") || "—");
const ids = companies.map((c) => c.id);
if (!ids.length) { console.log("Keine Diakonie-Firma gefunden."); process.exit(0); }

// 2) Alle JobQuests dieser Firma(en)
const inList = `(${ids.join(",")})`;
const quests = await q(`job_quests?select=id,title,status,deleted_at&company_id=in.${inList}&order=title`);
console.log(`\n${quests.length} JobQuests gefunden:\n`);

for (const quest of quests) {
  const flag = quest.deleted_at ? " [GELÖSCHT]" : "";
  console.log(`\n======== ${quest.title} (${quest.id}) [${quest.status}]${flag} ========`);
  const docs = await q(`funnel_docs?content_id=eq.${quest.id}&select=pages`);
  if (!docs.length) { console.log("  (kein funnel_doc)"); continue; }
  const pages = docs[0].pages || [];
  pages.forEach((pg, i) => {
    const types = (pg.nodes || []).map((n) => n.type).join(", ");
    const firstNode = pg.nodes?.[0]?.props || {};
    const txt = firstNode.title || firstNode.question || firstNode.description
      || firstNode.lines?.[0]?.text || "";
    console.log(`  [${String(i).padStart(2)}] name="${pg.name ?? ""}"  | {${types}} | ${snippet(txt)}`);
  });
}
