-- Review-Kommentare an Funnel-Docs (Block- oder Page-Level, mit Thread-Replies).
-- Externe Reviewer werden via author_type='external' unterschieden (Phase 2).

CREATE TABLE IF NOT EXISTS public.funnel_comments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_doc_id     uuid NOT NULL REFERENCES public.funnel_docs(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  page_id           text NOT NULL,
  block_id          text,
  parent_id         uuid REFERENCES public.funnel_comments(id) ON DELETE CASCADE,
  author_type       text NOT NULL CHECK (author_type IN ('member', 'external')),
  author_member_id  uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  author_name       text NOT NULL,
  author_email      text,
  content           text NOT NULL,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by       uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_comments_doc_idx    ON public.funnel_comments (funnel_doc_id);
CREATE INDEX IF NOT EXISTS funnel_comments_parent_idx ON public.funnel_comments (parent_id);
CREATE INDEX IF NOT EXISTS funnel_comments_company_idx ON public.funnel_comments (company_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.funnel_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.funnel_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.funnel_comments;
CREATE POLICY "Service role full access" ON public.funnel_comments
  FOR ALL USING (true) WITH CHECK (true);
