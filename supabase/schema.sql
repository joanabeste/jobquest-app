-- ============================================================
-- JobQuest – Supabase Schema
-- In Supabase Dashboard → SQL Editor einfügen und ausführen
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. COMPANIES
-- ============================================================
create table public.companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  industry        text not null default '',
  location        text not null default '',
  logo            text,
  privacy_url     text,
  imprint_url     text,
  contact_name    text not null,
  contact_email   text not null,
  corporate_design jsonb default '{}'::jsonb,
  slug             text unique,
  showcase_config  jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create unique index companies_contact_email_idx on public.companies (contact_email);
create unique index if not exists companies_slug_idx on public.companies (slug);

-- ============================================================
-- 2. WORKSPACE MEMBERS
-- ============================================================
create table public.workspace_members (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'viewer'
              check (role in ('platform_admin', 'superadmin', 'admin', 'editor', 'viewer')),
  invited_by  uuid references public.workspace_members(id) on delete set null,
  status      text not null default 'pending'
              check (status in ('active', 'pending')),
  created_at  timestamptz not null default now()
);

create index workspace_members_company_id_idx on public.workspace_members (company_id);
create unique index workspace_members_email_active_idx
  on public.workspace_members (email)
  where status = 'active';

-- ============================================================
-- 3. JOB QUESTS
-- ============================================================
create table public.job_quests (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  slug          text not null,
  status        text not null default 'draft'
                check (status in ('draft', 'published')),
  modules       jsonb not null default '[]'::jsonb,
  lead_config   jsonb,
  card_image    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create unique index job_quests_slug_idx on public.job_quests (slug);
create index job_quests_company_id_idx on public.job_quests (company_id);

-- ============================================================
-- 4. LEADS
-- ============================================================
create table public.leads (
  id            uuid primary key default uuid_generate_v4(),
  job_quest_id  uuid not null references public.job_quests(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text,
  gdpr_consent  boolean not null default false,
  custom_fields jsonb default '{}'::jsonb,
  submitted_at  timestamptz not null default now()
);

create index leads_job_quest_id_idx on public.leads (job_quest_id);
create index leads_company_id_idx on public.leads (company_id);

-- ============================================================
-- 5. ANALYTICS EVENTS
-- ============================================================
create table public.analytics_events (
  id            uuid primary key default uuid_generate_v4(),
  job_quest_id  uuid not null references public.job_quests(id) on delete cascade,
  type          text not null check (type in ('view', 'start', 'complete', 'page_view')),
  session_id    text not null,
  module_id     text,
  duration      integer,
  timestamp     timestamptz not null default now()
);

create index analytics_events_job_quest_id_idx on public.analytics_events (job_quest_id);
create index analytics_events_session_id_idx on public.analytics_events (session_id);
create index analytics_events_module_id_idx on public.analytics_events (job_quest_id, module_id);

-- ============================================================
-- 6. CAREER CHECKS
-- ============================================================
create table public.career_checks (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  slug          text not null,
  status        text not null default 'draft'
                check (status in ('draft', 'published')),
  blocks        jsonb not null default '[]'::jsonb,
  dimensions    jsonb not null default '[]'::jsonb,
  card_image    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create unique index career_checks_slug_idx on public.career_checks (slug);
create index career_checks_company_id_idx on public.career_checks (company_id);

-- ============================================================
-- 7. CAREER CHECK LEADS
-- ============================================================
create table public.career_check_leads (
  id               uuid primary key default uuid_generate_v4(),
  career_check_id  uuid not null references public.career_checks(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  first_name       text not null,
  last_name        text not null,
  email            text not null,
  phone            text,
  gdpr_consent     boolean not null default false,
  scores           jsonb not null default '{}'::jsonb,
  submitted_at     timestamptz not null default now()
);

create index career_check_leads_check_id_idx on public.career_check_leads (career_check_id);
create index career_check_leads_company_id_idx on public.career_check_leads (company_id);

-- ============================================================
-- 8. FORM PAGES
-- ============================================================
create table public.form_pages (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  title           text not null,
  slug            text not null,
  status          text not null default 'draft'
                  check (status in ('draft', 'published')),
  content_blocks  jsonb not null default '[]'::jsonb,
  form_steps      jsonb not null default '[]'::jsonb,
  form_config     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

create unique index form_pages_slug_idx on public.form_pages (slug);
create index form_pages_company_id_idx on public.form_pages (company_id);

-- ============================================================
-- 9. FORM SUBMISSIONS
-- ============================================================
create table public.form_submissions (
  id            uuid primary key default uuid_generate_v4(),
  form_page_id  uuid not null references public.form_pages(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  gdpr_consent  boolean not null default false,
  submitted_at  timestamptz not null default now()
);

create index form_submissions_form_page_id_idx on public.form_submissions (form_page_id);
create index form_submissions_company_id_idx on public.form_submissions (company_id);

-- ============================================================
-- 10. FUNNEL DOCS
-- ============================================================
create table public.funnel_docs (
  id            uuid primary key default uuid_generate_v4(),
  content_id    uuid not null,
  content_type  text not null check (content_type in ('quest', 'check', 'form')),
  pages         jsonb not null default '[]'::jsonb,
  email_config  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index funnel_docs_content_id_idx on public.funnel_docs (content_id);
create index funnel_docs_content_type_idx on public.funnel_docs (content_type);

-- ============================================================
-- 11. AUTO-UPDATE updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.job_quests
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.career_checks
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.form_pages
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.funnel_docs
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 12. ROW-LEVEL SECURITY (RLS)
-- ============================================================
alter table public.companies enable row level security;
alter table public.workspace_members enable row level security;
alter table public.job_quests enable row level security;
alter table public.leads enable row level security;
alter table public.analytics_events enable row level security;
alter table public.career_checks enable row level security;
alter table public.career_check_leads enable row level security;
alter table public.form_pages enable row level security;
alter table public.form_submissions enable row level security;
alter table public.funnel_docs enable row level security;

-- ── Public read (published content, anonymous) ──────────────

create policy "Public: read published quests"
  on public.job_quests for select
  using (status = 'published');

create policy "Public: read published career checks"
  on public.career_checks for select
  using (status = 'published');

create policy "Public: read published form pages"
  on public.form_pages for select
  using (status = 'published');

create policy "Public: read company for published content"
  on public.companies for select
  using (
    exists (
      select 1 from public.job_quests where company_id = companies.id and status = 'published'
      union all
      select 1 from public.career_checks where company_id = companies.id and status = 'published'
      union all
      select 1 from public.form_pages where company_id = companies.id and status = 'published'
    )
  );

create policy "Public: read funnel docs for published content"
  on public.funnel_docs for select
  using (
    (content_type = 'quest' and exists (
      select 1 from public.job_quests where id = funnel_docs.content_id and status = 'published'))
    or (content_type = 'check' and exists (
      select 1 from public.career_checks where id = funnel_docs.content_id and status = 'published'))
    or (content_type = 'form' and exists (
      select 1 from public.form_pages where id = funnel_docs.content_id and status = 'published'))
  );

-- ── Public write (leads + analytics, anonymous) ─────────────

create policy "Public: insert leads"
  on public.leads for insert with check (true);

create policy "Public: insert career check leads"
  on public.career_check_leads for insert with check (true);

create policy "Public: insert form submissions"
  on public.form_submissions for insert with check (true);

create policy "Public: insert analytics events"
  on public.analytics_events for insert with check (true);

-- ── Authenticated member access (for future Supabase Auth) ──

create or replace function public.get_my_company_id()
returns uuid as $$
  select company_id from public.workspace_members
  where id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- Companies
create policy "Members: read own company"
  on public.companies for select using (id = public.get_my_company_id());
create policy "Members: update own company"
  on public.companies for update using (id = public.get_my_company_id());

-- Workspace Members
create policy "Members: read company members"
  on public.workspace_members for select using (company_id = public.get_my_company_id());
create policy "Members: insert company members"
  on public.workspace_members for insert with check (company_id = public.get_my_company_id());
create policy "Members: update company members"
  on public.workspace_members for update using (company_id = public.get_my_company_id());
create policy "Members: delete company members"
  on public.workspace_members for delete using (company_id = public.get_my_company_id());

-- Job Quests
create policy "Members: all on own quests"
  on public.job_quests for all using (company_id = public.get_my_company_id());

-- Leads
create policy "Members: read own leads"
  on public.leads for select using (company_id = public.get_my_company_id());
create policy "Members: delete own leads"
  on public.leads for delete using (company_id = public.get_my_company_id());

-- Analytics
create policy "Members: read own analytics"
  on public.analytics_events for select using (
    exists (
      select 1 from public.job_quests
      where id = analytics_events.job_quest_id
      and company_id = public.get_my_company_id()
    )
  );

-- Career Checks
create policy "Members: all on own career checks"
  on public.career_checks for all using (company_id = public.get_my_company_id());

-- Career Check Leads
create policy "Members: read own career check leads"
  on public.career_check_leads for select using (company_id = public.get_my_company_id());
create policy "Members: delete own career check leads"
  on public.career_check_leads for delete using (company_id = public.get_my_company_id());

-- Form Pages
create policy "Members: all on own form pages"
  on public.form_pages for all using (company_id = public.get_my_company_id());

-- Form Submissions
create policy "Members: read own form submissions"
  on public.form_submissions for select using (company_id = public.get_my_company_id());
create policy "Members: delete own form submissions"
  on public.form_submissions for delete using (company_id = public.get_my_company_id());

-- Funnel Docs
create policy "Members: all on own funnel docs"
  on public.funnel_docs for all using (
    (content_type = 'quest' and exists (
      select 1 from public.job_quests where id = funnel_docs.content_id and company_id = public.get_my_company_id()))
    or (content_type = 'check' and exists (
      select 1 from public.career_checks where id = funnel_docs.content_id and company_id = public.get_my_company_id()))
    or (content_type = 'form' and exists (
      select 1 from public.form_pages where id = funnel_docs.content_id and company_id = public.get_my_company_id()))
  );
