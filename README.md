# JobQuest

Interaktive Job-Quests, Berufschecks und Formulare als modulare Funnels zur Bewerbergewinnung.

## Tech-Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Styling:** Tailwind CSS
- **Datenbank:** Supabase (PostgreSQL) — vorbereitet, aktuell localStorage
- **Pakete:** @dnd-kit (Drag & Drop), lucide-react (Icons), qrcode.react, uuid

## Voraussetzungen

- Node.js >= 18
- npm >= 9
- Ein [Supabase](https://supabase.com)-Projekt (für die spätere DB-Anbindung)

## Installation

```bash
# Repository klonen
git clone https://github.com/joanabeste/jobquest-app.git
cd jobquest-app

# Abhängigkeiten installieren
npm install
```

## Konfiguration

Erstelle eine Datei `.env.local` im Projektroot:

```env
NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...dein-anon-key
```

Die Werte findest du in deinem Supabase-Dashboard unter **Settings > API**.

> Solange keine `.env.local` existiert, läuft die App komplett mit localStorage — es ist kein Supabase-Projekt nötig, um die App lokal zu starten.

## Entwicklungsserver starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Weitere Befehle

| Befehl | Beschreibung |
|---|---|
| `npm run build` | Produktions-Build erstellen |
| `npm run start` | Produktions-Server starten |
| `npm run lint` | ESLint ausführen |

## Projektstruktur

```
app/
  (protected)/           # Geschützte Routen (Dashboard, Editor, etc.)
    dashboard/           # Übersicht aller Quests, Checks, Formulare
    company-profile/     # Firmenprofil bearbeiten
    editor/[id]/         # Quest-Editor
    editor/new/          # Neuen Quest erstellen
  api/                   # API-Routen
  berufscheck/           # Öffentlicher Berufscheck-Player
  formular/              # Öffentlicher Formular-Player
  jobquest/[slug]/       # Öffentlicher Quest-Player
  login/                 # Login-Seite
  register/              # Registrierung
  dev/                   # Entwickler-Hilfsmittel

components/
  editor/                # Editor-Komponenten (ModuleForm, EditorPreview, etc.)
  funnel-editor/         # Visueller Funnel-Editor (Drag & Drop)
  quest/                 # Quest-Player-Komponenten
  ui/                    # Wiederverwendbare UI-Komponenten

contexts/
  AuthContext.tsx         # Authentifizierung und Session-State

lib/
  types.ts               # Alle TypeScript-Interfaces
  storage.ts             # localStorage CRUD-Operationen
  utils.ts               # Hilfsfunktionen (slugify, formatDate, CSV-Export)
  database.types.ts      # Supabase Database-Types
  supabase/
    client.ts            # Browser-Client
    server.ts            # Server-Client (Route Handler, Server Components)
    middleware.ts         # Middleware-Helper für Session-Refresh

supabase/
  schema.sql             # Komplettes DB-Schema (10 Tabellen + RLS)
```

## Rollen und Berechtigungen

| Rolle | Beschreibung |
|---|---|
| `platform_admin` | Plattform-Administrator |
| `superadmin` | Firmen-Superadmin |
| `admin` | Firmen-Admin |
| `editor` | Kann Inhalte bearbeiten |
| `viewer` | Nur Lesezugriff |

## Content-Typen

### Job Quests
Interaktive, mehrstufige Funnels mit Modulen (Dialog, Slider, Swipe Cards, etc.) und einem Lead-Formular am Ende.

### Berufschecks (Career Checks)
Fragenbasierte Checks mit Dimensionen und Scoring zur Berufseignung.

### Formulare (Form Pages)
Mehrstufige Formulare mit Content-Blöcken und konfigurierbaren Formularschritten.

## Supabase einrichten

1. Erstelle ein neues Projekt auf [supabase.com](https://supabase.com)
2. Gehe zu **SQL Editor** im Dashboard
3. Füge den Inhalt von `supabase/schema.sql` ein und führe ihn aus
4. Kopiere URL und Anon Key aus **Settings > API** in deine `.env.local`

Das Schema enthält:
- 10 Tabellen mit Foreign Keys und Indexes
- `updated_at`-Trigger
- Row-Level Security (RLS) mit Policies für öffentlichen und authentifizierten Zugriff

## Entwickler-Zugang

Für lokale Entwicklung kannst du unter `/dev` Test-Accounts erstellen und dich ohne echte Registrierung anmelden.
