-- ============================================================
-- Add `speakers` JSONB column to funnel_docs
-- ============================================================
-- Purpose: Globale Sprecher-Override-Map pro JobQuest. Key = speaker-String
-- wie er in den DialogLines steht; value = { displayName?, avatarUrl? }.
-- Ermöglicht der Nutzerin, pro Sprecher genau einmal Anzeigename und
-- Profilbild zu pflegen statt in jeder einzelnen Page.

alter table public.funnel_docs
  add column if not exists speakers jsonb;
