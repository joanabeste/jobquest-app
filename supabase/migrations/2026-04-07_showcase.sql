-- Showcase: per-company public landing page
-- Run this once against the existing database (not needed for fresh installs that
-- use schema.sql, which has been updated to include these columns).

alter table public.companies
  add column if not exists slug text,
  add column if not exists showcase_config jsonb default '{}'::jsonb;

create unique index if not exists companies_slug_idx on public.companies (slug);

alter table public.job_quests
  add column if not exists card_image text;

alter table public.career_checks
  add column if not exists card_image text;
