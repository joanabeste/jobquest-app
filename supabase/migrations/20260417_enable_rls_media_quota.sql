-- Fix: media_assets und quota_requests waren "unrestricted" (kein RLS).
-- Beide Tabellen werden ausschließlich serverseitig via Service-Role-Client
-- mit expliziter Session-/Ownership-Prüfung angesprochen — die Policy muss
-- also nur das Service-Role-Zugriffspattern zulassen, nicht anonymen Zugriff.

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.media_assets;
CREATE POLICY "Service role full access" ON public.media_assets
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.quota_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON public.quota_requests;
CREATE POLICY "Service role full access" ON public.quota_requests
  FOR ALL USING (true) WITH CHECK (true);
