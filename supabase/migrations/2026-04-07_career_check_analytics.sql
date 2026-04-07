-- Allow analytics_events to also reference career_checks (not only job_quests).
-- Each event must reference exactly one of (job_quest_id, career_check_id).

alter table public.analytics_events
  alter column job_quest_id drop not null;

alter table public.analytics_events
  add column if not exists career_check_id uuid references public.career_checks(id) on delete cascade;

alter table public.analytics_events
  drop constraint if exists analytics_events_target_check;

alter table public.analytics_events
  add constraint analytics_events_target_check
  check (
    (job_quest_id is not null and career_check_id is null)
    or (job_quest_id is null and career_check_id is not null)
  );

create index if not exists analytics_events_career_check_id_idx
  on public.analytics_events (career_check_id);

-- Extend the members-read RLS policy so career-check analytics are visible to
-- the owning company. The original policy is keyed on job_quest ownership only.
drop policy if exists "Members: read own analytics" on public.analytics_events;

create policy "Members: read own analytics"
  on public.analytics_events for select
  using (
    (job_quest_id is not null and exists (
      select 1 from public.job_quests
      where job_quests.id = analytics_events.job_quest_id
        and job_quests.company_id = public.get_my_company_id()))
    or (career_check_id is not null and exists (
      select 1 from public.career_checks
      where career_checks.id = analytics_events.career_check_id
        and career_checks.company_id = public.get_my_company_id()))
  );
