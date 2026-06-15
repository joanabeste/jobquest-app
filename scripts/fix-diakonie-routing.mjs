#!/usr/bin/env node
// Repariert die kaputte Story-Verzweigung in Erzieher + Zerspanungsmechaniker
// und kürzt überlange Setup-Texte / splittet zwei lange Payoff-Bubbles.
//
//   node scripts/fix-diakonie-routing.mjs --dry-run   # zeigt Transitions + Reachability, schreibt nichts
//   node scripts/fix-diakonie-routing.mjs             # PATCHt zurück
//
// Sicherheit: Routing-Ops prüfen den aktuellen Ziel-Index (oldIdx) vor dem Umbiegen;
// Text-Ops prüfen den alten Wert (whitespace-normalisiert). Mismatch -> Quest wird NICHT geschrieben.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
function env(n){ const m=readFileSync(join(ROOT,".env.local"),"utf8").match(new RegExp("^"+n+"=(.*)$","m")); if(!m) throw new Error("env "+n); return m[1].trim().replace(/^["']|["']$/g,""); }
const URL=env("NEXT_PUBLIC_SUPABASE_URL"), KEY=env("SUPABASE_SERVICE_ROLE_KEY");
const norm=s=>String(s??"").replace(/\s+/g," ").trim();

const ERZIEHER="8ac17402-684f-4527-b84a-f446997877e3";
const ZERSPANUNG="7483673e-2e0e-48df-9829-1ac2dd70665a";
const LANDWIRT="6571b66d-e747-4e3b-9790-b7bece4e0848";
const KAUFMANN="be1c4b68-973c-45b3-ade2-70f1fdf58c92";
const KOCH="0bee9d32-ae0f-4639-9641-bae2a4e9e559";

// pageNext: pages[p].nextPageId = id(to)  (verify current resolves to oldIdx)
// decTarget: decision option (matched by substring) .targetPageId = id(to) (verify oldIdx)
// setDesc: full description replace
// splitLine: replace lines[li] (verify old) with two bubbles (same speaker)
const PLAN = {
  [ERZIEHER]: {
    name: "Erzieher",
    pageNext: [
      { p:6,  to:9,  oldIdx:10 },   // Jonas-Erfolg  -> Zahnarzt-Setup
      { p:8,  to:9,  oldIdx:10 },   // Jonas-Fehler  -> Zahnarzt-Setup
      { p:11, to:14, oldIdx:15 },   // Zahnarzt-Erfolg -> Hausaufgaben-Setup
      { p:13, to:14, oldIdx:15 },   // Zahnarzt-Fehler -> Hausaufgaben-Setup
      { p:16, to:19, oldIdx:20 },   // Hausaufgaben-Erfolg -> Streit-Setup
      { p:17, to:19, oldIdx:20 },   // Hausaufgaben-Fehler1 -> Streit-Setup
      { p:18, to:19, oldIdx:20 },   // Hausaufgaben-Fehler2 -> Streit-Setup
      { p:21, to:23, oldIdx:24 },   // Streit-Fehler -> Feierabend
    ],
    decTarget: [
      { p:15, match:"Hausaufgaben gemacht werden müssen", to:17, oldIdx:18 }, // Druck -> Korrektur "Druck verstärkt Widerstand"
      { p:15, match:"erstmal in Ruhe",                    to:18, oldIdx:19 }, // Rückzug -> Korrektur "allein lassen"
      { p:20, match:"stoppe den Streit ruhig",            to:22, oldIdx:23 }, // richtig -> Erfolgsdialog
      { p:20, match:"Regelverletzung",                    to:21, oldIdx:22 }, // falsch  -> Korrektur
    ],
    setDesc: [
      { p:14,
        old:'Die Jugendlichen sitzen am Tisch bei den Hausaufgaben. Der 14-jährige Tim, der ADHS hat, knallt plötzlich sein Heft zu und ruft: "Ich check das eh nicht! Das ist alles sinnlos!" Er wirkt frustriert. Zwei andere Jugendliche beginnen zu lachen.',
        new:'Bei den Hausaufgaben knallt der 14-jährige Tim, der ADHS hat, plötzlich sein Heft zu: "Ich check das eh nicht – alles sinnlos!" Er ist frustriert, zwei andere fangen an zu lachen.' },
    ],
  },

  [ZERSPANUNG]: {
    name: "Zerspanungsmechaniker",
    pageNext: [
      { p:11, to:14, oldIdx:15 },   // CNC-Erfolg  -> "Maschine arbeitet"
      { p:12, to:14, oldIdx:15 },   // Start-Korrektur -> "Maschine arbeitet"
      { p:17, to:18, oldIdx:21 },   // Qualität-Korrektur -> "Neues Werkstück fertigen"
    ],
    decTarget: [
      { p:10, match:"Direkt auf Start",  to:12, oldIdx:13 }, // -> Start-Korrektur (statt Tür-Korrektur)
      { p:10, match:"Schutztür offen",   to:13, oldIdx:14 }, // -> Tür-Korrektur (statt direkt Maschine)
      { p:16, match:"ich fertige es neu", to:18, oldIdx:19 }, // richtig -> Neu-Fertigen-Szene (vor Erfolgsdialog)
    ],
    setDesc: [
      { p:7,
        old:'Markus legt dir einen Zettel mit der technischen Zeichnung auf den Tisch. Du sollst 20 Abstandshalter für eine Industriepumpe fertigen. Länge: 20 mm, mit Bohrung in der Mitte. Alle Werkstücke müssen exakt gleich sein und nach der Fertigung geprüft werden.',
        new:'Markus legt dir die technische Zeichnung hin: 20 Abstandshalter für eine Industriepumpe, je 20 mm lang mit Bohrung in der Mitte. Alle müssen exakt gleich sein und werden danach geprüft.' },
      { p:15,
        old:'Du nimmst das fertige Werkstück aus der Maschine und greifst zum Messschieber. Die Zeichnung verlangt 20,0 mm ±0,1 mm – also zwischen 19,9 mm und 20,1 mm. Dein Messschieber zeigt: 20,2 mm. Das Werkstück liegt außerhalb der Toleranz. Wie reagierst du?',
        new:'Du misst das fertige Werkstück mit dem Messschieber. Erlaubt sind 20,0 mm ±0,1 mm – also 19,9 bis 20,1 mm. Angezeigt werden 20,2 mm: zu groß. Wie reagierst du?' },
    ],
  },

  [LANDWIRT]: {
    name: "Landwirt",
    setDesc: [
      { p:8,
        old:'Heute streust du zusammen mit den Beschäftigten der Diakonie den Schweinestall ein. Zum Team gehören auch Menschen mit Behinderung – sie unterstützen beim Stallausmisten, beim Füttern und bei der Feldarbeit. Ihr arbeitet Hand in Hand. Du siehst, dass Johann nicht weiß, was er machen soll.',
        new:'Im Schweinestall arbeitest du mit den Beschäftigten zusammen – darunter Menschen mit Behinderung, die fest zum Team gehören. Du siehst: Johann weiß gerade nicht, was er tun soll.' },
    ],
  },

  [KAUFMANN]: {
    name: "Kaufmännischer Bereich",
    setDesc: [
      { p:4,
        old:'Es ist kurz nach 9 Uhr. Du bist gerade dabei, deine E-Mails zu sichten, als Mia aus dem Nachbarbüro hereinkommt. Sie wirkt leicht gestresst und erklärt, dass sie bei der Erfassung von Abwesenheiten im System nicht weiterkommt und dringend Hilfe braucht.',
        new:'Du sichtest gerade deine E-Mails, als Mia aus dem Nachbarbüro hereinkommt. Sie wirkt gestresst: Bei der Erfassung von Abwesenheiten im System kommt sie nicht weiter und braucht dringend Hilfe.' },
    ],
    splitLine: [
      { p:23, li:1,
        old:'Sehr gut, @vorname! Zuhören, verstehen, verständlich erklären – so baust du Vertrauen auf. Genau das ist kaufmännische Arbeit: Du hältst den Laden am Laufen und bist für alle der Anker. Starker erster Tag!',
        new:['Sehr gut, @vorname! Zuhören, verstehen, verständlich erklären – so baust du Vertrauen auf.',
             'Genau das ist kaufmännische Arbeit: Du hältst den Laden am Laufen und bist für alle der Anker. Starker erster Tag!'] },
    ],
  },

  [KOCH]: {
    name: "Koch",
    splitLine: [
      { p:21, li:1,
        old:'Vielen Dank, @vorname – du hast unter Zeitdruck den Kopf behalten, im Team angepackt und ehrlich gehandelt. So werden aus 200 Portionen warme Mahlzeiten für echte Menschen. Toller erster Tag – Feierabend!',
        new:['Vielen Dank, @vorname – du hast unter Zeitdruck den Kopf behalten, im Team angepackt und ehrlich gehandelt.',
             'So werden aus 200 Portionen warme Mahlzeiten für echte Menschen. Toller erster Tag – Feierabend!'] },
    ],
  },
};

async function getPages(id){
  const r=await fetch(`${URL}/rest/v1/funnel_docs?content_id=eq.${id}&select=pages`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});
  if(!r.ok) throw new Error("GET "+r.status); const j=await r.json(); return j[0].pages;
}
async function putPages(id,pages){
  const r=await fetch(`${URL}/rest/v1/funnel_docs?content_id=eq.${id}`,{method:"PATCH",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({pages,updated_at:new Date().toISOString()})});
  if(!r.ok) throw new Error("PATCH "+r.status+" "+await r.text()); return r.status;
}
function decOptions(page){ for(const n of page.nodes||[]) if(n.type==="quest_decision") return n.props.options||[]; return null; }
function reach(pages){
  const idx=Object.fromEntries(pages.map((p,i)=>[p.id,i]));
  const edge=i=>{const p=pages[i],o=decOptions(p);
    if(o) return o.map(x=>idx[x.targetPageId]);
    if(p.nextPageId) return [idx[p.nextPageId]];
    return [i+1<pages.length?i+1:null];};
  const seen=new Set(),st=[0]; while(st.length){const c=st.pop(); if(c==null||seen.has(c))continue; seen.add(c); for(const t of edge(c)) if(t!=null&&!seen.has(t)) st.push(t);}
  return [...Array(pages.length).keys()].filter(i=>!seen.has(i));
}

let err=false, changes=0;
for(const [id,plan] of Object.entries(PLAN)){
  console.log(`\n=== ${plan.name} ===`);
  let pages; try{ pages=await getPages(id);}catch(e){console.error("  load:",e.message);err=true;continue;}
  const idOf=i=>pages[i].id, idx=Object.fromEntries(pages.map((p,i)=>[p.id,i]));
  let ok=true;
  const fail=m=>{console.error("  ✗",m);ok=false;};

  for(const e of plan.pageNext||[]){
    const cur=idx[pages[e.p].nextPageId];
    if(cur===e.to){console.log(`  = [${e.p}].next bereits ->${e.to}`);continue;}
    if(cur!==e.oldIdx){fail(`[${e.p}].next erwartet ->${e.oldIdx}, ist ->${cur}`);break;}
    pages[e.p].nextPageId=idOf(e.to); changes++; console.log(`  ✓ [${e.p}].next ${e.oldIdx} -> ${e.to}`);
  }
  if(ok) for(const e of plan.decTarget||[]){
    const opts=decOptions(pages[e.p]); const o=opts&&opts.find(x=>norm(x.text).includes(norm(e.match)));
    if(!o){fail(`[${e.p}] Option "${e.match}" nicht gefunden`);break;}
    const cur=idx[o.targetPageId];
    if(cur===e.to){console.log(`  = [${e.p}] "${e.match}" bereits ->${e.to}`);continue;}
    if(cur!==e.oldIdx){fail(`[${e.p}] "${e.match}" erwartet ->${e.oldIdx}, ist ->${cur}`);break;}
    o.targetPageId=idOf(e.to); changes++; console.log(`  ✓ [${e.p}] "${e.match}" ${e.oldIdx} -> ${e.to}`);
  }
  if(ok) for(const e of plan.setDesc||[]){
    const node=pages[e.p].nodes[0], cur=node.props.description;
    if(norm(cur)===norm(e.new)){console.log(`  = [${e.p}].desc bereits aktuell`);continue;}
    if(norm(cur)!==norm(e.old)){fail(`[${e.p}].desc old-Mismatch`);break;}
    node.props.description=e.new; changes++; console.log(`  ✓ [${e.p}].desc gekürzt (${norm(e.old).split(" ").length}->${e.new.split(" ").length} W)`);
  }
  if(ok) for(const e of plan.splitLine||[]){
    const lines=pages[e.p].nodes[0].props.lines, l=lines[e.li];
    if(!l){fail(`[${e.p}] line ${e.li} fehlt`);break;}
    if(norm(l.text)===norm(e.new[0]) && lines[e.li+1] && norm(lines[e.li+1].text)===norm(e.new[1])){console.log(`  = [${e.p}] line ${e.li} bereits gesplittet`);continue;}
    if(norm(l.text)!==norm(e.old)){fail(`[${e.p}] line ${e.li} old-Mismatch`);break;}
    const a={...l,text:e.new[0]}, b={...l,id:randomUUID(),text:e.new[1]};
    lines.splice(e.li,1,a,b); changes++; console.log(`  ✓ [${e.p}] line ${e.li} gesplittet (Sprecher: ${l.speaker||"?"})`);
  }

  if(!ok){err=true;console.error(`  -> ${plan.name}: NICHT geschrieben.`);continue;}
  const orphans=reach(pages);
  console.log(`  Reachability nach Fix -> unerreichbar: ${orphans.length?orphans.join(","):"keine"}`);
  if(DRY){console.log(`  (dry-run) ${plan.name}: würde geschrieben.`);}
  else{try{const s=await putPages(id,pages);console.log(`  -> PATCH ${s} OK`);}catch(e){console.error("  write:",e.message);err=true;}}
}
console.log(`\n${DRY?"[DRY-RUN] ":""}Änderungen: ${changes}`);
if(err) process.exit(1);
