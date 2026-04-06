# Code-Qualitäts­kriterien — JobQuest

Stand: April 2026 | Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase

---

## Aktueller Zustand (Ist-Analyse)

| Bereich | Bewertung | Kritischste Datei |
|---|---|---|
| TypeScript-Strenge | ⚠️ Mittel | `mappers.ts` (intentionales `any`), `BlockRenderer.tsx` (8× `Record<string, unknown>`) |
| Komponentengröße | 🔴 Kritisch | `BlockRenderer.tsx` 1448 Zeilen, `NodeView.tsx` 1045, `Inspector.tsx` 1010 |
| Fehlerbehandlung | ⚠️ Inkonsistent | API-Routes ohne try-catch, kein Zod |
| Test-Abdeckung | ⚠️ Dünn | Nur `lib/` getestet, kein API/Component Test |
| Sicherheit | ⚠️ Mittel | Public routes ohne Rate-Limiting |
| Duplikation | ✅ Gering | Factory-Pattern in submit-handler vorhanden |

---

## Verbindliche Kriterien

### 1 · Datei­größen

| Typ | Maximum | Warum |
|---|---|---|
| React-Komponente (UI) | **300 Zeilen** | Über 300 → aufteilen oder Hook extrahieren |
| React-Komponente (Container/Seite) | **500 Zeilen** | |
| API-Route | **150 Zeilen** | Logik in `lib/api/` Handler auslagern |
| Utility/lib Datei | **250 Zeilen** | |
| Typ-Definitionen | kein Limit | Types dürfen wachsen |

**Aktuell verletzt:**
- `BlockRenderer.tsx` — Ziel: in `components/funnel-editor/blocks/` aufteilen (DialogBlock, QuizBlock, DecisionBlock, …)
- `NodeView.tsx` — Ziel: Block-Preview-Komponenten in separate Dateien
- `Inspector.tsx` — Ziel: Inspector-Routing bleibt, Editor-Panels schon in `inspectors/` ✅

---

### 2 · TypeScript

```ts
// ❌ Verboten
function foo(x: any) {}
const y = data as any;

// ✅ Erlaubt (dokumentiert)
// fromDb intentionally any — Supabase response is untyped
export function questFromDb(row: any): JobQuest { ... }

// ✅ Bevorzugt
function foo(x: unknown) {
  if (typeof x === 'string') { ... }
}
```

- **Kein `any`** außer in `lib/supabase/mappers.ts` (Supabase-Grenze) — muss kommentiert sein
- **`Record<string, unknown>`** nur als temporärer Durchgangspunkt, nicht als dauerhafter Prop-Typ
- **Kein Type-Casting ohne Guard** (`x as SomeType` → immer mit `if (isSomeType(x))` absichern)
- Alle neuen Interfaces und Types in `lib/funnel-types.ts` oder `lib/types.ts`, nicht inline

---

### 3 · Fehlerbehandlung

**API-Routes:**
```ts
// ❌ Verboten — kein try-catch
export async function POST(req: NextRequest) {
  const data = await req.json();         // kann werfen!
  const { error } = await supabase...;
}

// ✅ Pflicht-Pattern
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  let body: MyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { data, error } = await supabase...;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
```

- **Alle public POST-Routes** müssen `req.json()` in try-catch wrappen
- **Supabase-Fehler** immer prüfen: `if (error) return …`
- **E-Mail-Versand** niemals `await`-blocking auf kritischem Pfad (fire-and-forget mit Timeout ✅ bereits implementiert)
- **Error-Response-Format** einheitlich: `{ error: string }` mit passendem HTTP-Statuscode

---

### 4 · Komponenten-Design

```
components/funnel-editor/
  blocks/          ← Live-Player-Blöcke (je 1 Datei pro Blocktyp)
  node-previews/   ← Canvas-Previews (je 1 Datei pro Blocktyp)
  inspectors/      ← Inspector-Panels ✅ bereits aufgeteilt
```

- **Eine Datei pro Block-Typ** sobald die Datei >100 Zeilen für diesen Block benötigt
- **Keine Logik in JSX** — komplexe Berechnungen in `useMemo`/`useCallback` oder eigene Hooks
- **Props-Interfaces** immer explizit definiert (kein `{ [key: string]: any }`)
- **State-Management** in FunnelEditor bleibt, wird nicht weiter aufgesplittet

---

### 5 · Tests

**Was getestet werden muss:**

| Bereich | Werkzeug | Priorität |
|---|---|---|
| `lib/` Utilities & Helpers | Jest (vorhanden ✅) | Hoch |
| API-Handler (`lib/api/`) | Jest | Hoch |
| Supabase-Mapper (`lib/supabase/mappers.ts`) | Jest | Mittel |
| React-Komponenten | — (kein Testing-Library eingerichtet) | Niedrig |

**Regeln:**
- Jede neue Funktion in `lib/` bekommt mindestens einen Happy-Path-Test
- Jede neue API-Handler-Funktion in `lib/api/` bekommt einen Test mit Mock-Supabase
- Keine Tests für rein visuelle Komponenten (unnötig aufwendig)

---

### 6 · Sicherheit

**Auth-Checks:**
- Alle Routes in `app/api/` (außer `app/api/public/`) → `getSession()` + `unauthorized()`
- Public Routes → kein Auth, aber: Input-Validierung + Rate-Limiting (ausstehend)

**Secrets:**
- `.env.local` ist in `.gitignore` ✅
- Keine Secrets in Code-Kommentaren, Config-Dateien oder Logs
- `NEXT_PUBLIC_*` nur für wirklich öffentliche Werte (Supabase URL/Anon-Key)

**Input:**
- Public POST-Routes sollten erwartete Felder prüfen (Pflicht-Felder vorhanden, Typen stimmen)
- Zod ist optional, manuelle Prüfungen reichen vorerst

---

### 7 · Stil & Konventionen

```
Dateibenennung:   PascalCase für Komponenten, camelCase für lib-Dateien
Imports:          @/lib/... und @/components/... (kein relativer ../../)
Tailwind:         Keine inline style="" außer für dynamische Werte (Farben, Positionen)
Kommentare:       Nur für nicht-offensichtliche Logik. Kein JSDoc für alles.
Deutsche UI:      Alle User-sichtbaren Texte auf Deutsch
```

---

## Sofort-Maßnahmen (Backlog)

| Priorität | Aufgabe | Datei |
|---|---|---|
| 🔴 Hoch | `BlockRenderer.tsx` in Block-Dateien aufteilen | `components/funnel-editor/blocks/` |
| 🔴 Hoch | `NodeView.tsx` Block-Previews auslagern | `components/funnel-editor/node-previews/` |
| 🟡 Mittel | `req.json()` try-catch in allen API-Routes nachrüsten | `app/api/quests/route.ts` u.a. |
| 🟡 Mittel | Tests für `lib/api/submit-lead-handler.ts` | `lib/__tests__/` |
| 🟢 Niedrig | Supabase-Mapper Tests | `lib/__tests__/mappers.test.ts` |
| 🟢 Niedrig | Rate-Limiting auf `/api/public/*` | Middleware oder Upstash |
