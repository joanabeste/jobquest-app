-- Teilbare Review-Links: Externe (ohne Login) können via Token-URL einen Funnel
-- ansehen und optional kommentieren. Token ist 32 hex chars (crypto.randomBytes(16)).

CREATE TABLE IF NOT EXISTS public.review_links (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_doc_id  uuid NOT NULL REFERENCES public.funnel_docs(id) ON DELETE CASCADE,
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token          text NOT NULL UNIQUE,
  label          text,
  can_comment    boolean NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_by     uuid REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz
);

CREATE INDEX IF NOT EXISTS review_links_token_idx   ON public.review_links (token);
CREATE INDEX IF NOT EXISTS review_links_doc_idx     ON public.review_links (funnel_doc_id);
CREATE INDEX IF NOT EXISTS review_links_company_idx ON public.review_links (company_id);

ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.review_links;
CREATE POLICY "Service role full access" ON public.review_links
  FOR ALL USING (true) WITH CHECK (true);
