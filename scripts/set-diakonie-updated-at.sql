-- Einmalig im Supabase SQL-Editor ausführen.
-- Setzt das "Zuletzt aktualisiert"-Datum ALLER Diakonie-JobQuests auf den 12.05.2026.
--
-- Hintergrund: Der Trigger `set_updated_at` (BEFORE UPDATE) erzwingt bei jedem
-- Schreibvorgang `updated_at = now()`. Über die REST-API lässt sich daher kein
-- Vergangenheitsdatum setzen. Im SQL-Editor laufen Queries als Tabellen-Owner,
-- deshalb kann der Trigger hier kurz deaktiviert werden.
--
-- 10:00 UTC = 12:00 Europe/Berlin, damit das angezeigte Datum sicher der 12.05.2026
-- bleibt (Dashboard nutzt toLocaleDateString('de-DE')).

begin;

-- Dashboard-Anzeige "Aktualisiert" liest job_quests.updated_at
alter table public.job_quests disable trigger set_updated_at;
update public.job_quests
   set updated_at = timestamptz '2026-05-12 10:00:00+00'
 where company_id in (
   select id from public.companies where name ilike '%diakonie%'
 );
alter table public.job_quests enable trigger set_updated_at;

-- Auch die zugehörigen Funnel-Dokumente konsistent datieren
alter table public.funnel_docs disable trigger set_updated_at;
update public.funnel_docs
   set updated_at = timestamptz '2026-05-12 10:00:00+00'
 where content_id in (
   select id from public.job_quests
    where company_id in (select id from public.companies where name ilike '%diakonie%')
 );
alter table public.funnel_docs enable trigger set_updated_at;

commit;

-- Kontrolle:
-- select title, updated_at from public.job_quests
--  where company_id in (select id from public.companies where name ilike '%diakonie%')
--  order by title;
