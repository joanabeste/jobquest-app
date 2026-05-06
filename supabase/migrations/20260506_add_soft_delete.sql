-- Soft-delete (Papierkorb) für JobQuests, Berufschecks und Formulare.
-- Einträge mit `deleted_at IS NOT NULL` gelten als gelöscht und werden nach
-- 30 Tagen vom Cleanup-Cron hart entfernt. Slugs müssen nur unter aktiven
-- Einträgen unique sein, damit Restore nicht an einem Slug-Konflikt mit
-- inzwischen neu erstellten Inhalten scheitert.

-- ─── job_quests ────────────────────────────────────────────────────────────
ALTER TABLE public.job_quests ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP INDEX IF EXISTS public.job_quests_slug_idx;
CREATE UNIQUE INDEX job_quests_slug_idx
  ON public.job_quests (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS job_quests_deleted_at_idx
  ON public.job_quests (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ─── career_checks ─────────────────────────────────────────────────────────
ALTER TABLE public.career_checks ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP INDEX IF EXISTS public.career_checks_slug_idx;
CREATE UNIQUE INDEX career_checks_slug_idx
  ON public.career_checks (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS career_checks_deleted_at_idx
  ON public.career_checks (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ─── form_pages ────────────────────────────────────────────────────────────
ALTER TABLE public.form_pages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

DROP INDEX IF EXISTS public.form_pages_slug_idx;
CREATE UNIQUE INDEX form_pages_slug_idx
  ON public.form_pages (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS form_pages_deleted_at_idx
  ON public.form_pages (deleted_at)
  WHERE deleted_at IS NOT NULL;
