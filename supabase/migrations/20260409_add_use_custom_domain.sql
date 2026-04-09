-- Add per-content domain preference
ALTER TABLE public.job_quests ADD COLUMN use_custom_domain boolean NOT NULL DEFAULT false;
ALTER TABLE public.career_checks ADD COLUMN use_custom_domain boolean NOT NULL DEFAULT false;
ALTER TABLE public.form_pages ADD COLUMN use_custom_domain boolean NOT NULL DEFAULT false;
