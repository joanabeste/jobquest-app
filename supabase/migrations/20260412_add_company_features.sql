-- Feature flags per company (managed via Hub)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '{}';
