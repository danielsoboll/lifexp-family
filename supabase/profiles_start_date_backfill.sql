-- Einmalig nach Hinzufügen der Spalte start_date:
-- Bestehende Profile: start_date = Datum von created_at in CET (UTC+1, ohne Sommerzeit).

UPDATE public.profiles
SET start_date = ((created_at AT TIME ZONE 'UTC') + interval '1 hour')::date
WHERE start_date IS NULL
  AND created_at IS NOT NULL;
