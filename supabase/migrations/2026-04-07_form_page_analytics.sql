-- Allow analytics_events to also reference form_pages.
-- Each event must reference exactly one of (job_quest_id, career_check_id, form_page_id).

alter table public.analytics_events
  add column if not exists form_page_id uuid references public.form_pages(id) on delete cascade;

alter table public.analytics_events
  drop constraint if exists analytics_events_target_check;

alter table public.analytics_events
  add constraint analytics_events_target_check
  check (
    (job_quest_id is not null and career_check_id is null and form_page_id is null)
    or (job_quest_id is null and career_check_id is not null and form_page_id is null)
    or (job_quest_id is null and career_check_id is null and form_page_id is not null)
  );

create index if not exists analytics_events_form_page_id_idx
  on public.analytics_events (form_page_id);

-- Extend the members-read RLS policy so form-page analytics are visible to
-- the owning company.
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
    or (form_page_id is not null and exists (
      select 1 from public.form_pages
      where form_pages.id = analytics_events.form_page_id
        and form_pages.company_id = public.get_my_company_id()))
  );
