-- career_check_leads: custom_fields + email_sent nachziehen, damit der gemeinsame
-- Lead-Submit-Handler (der auch "interessierteBerufe" als customFields schreibt
-- und nach erfolgreichem Mail-Versand email_sent = true setzt) ohne Fehler
-- durchläuft. Bisher hatte nur public.leads diese Spalten.

ALTER TABLE public.career_check_leads
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.career_check_leads
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;

-- leads hatte bereits custom_fields, aber email_sent fehlte dort ebenfalls.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;
