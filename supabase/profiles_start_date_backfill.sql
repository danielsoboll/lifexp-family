-- Bestehende Profile: start_date = Datum von created_at in CET/CEST (Europe/Berlin).
UPDATE public.parent_profiles
SET start_date = (timezone('Europe/Berlin', created_at))::date
WHERE start_date IS NULL AND created_at IS NOT NULL;
