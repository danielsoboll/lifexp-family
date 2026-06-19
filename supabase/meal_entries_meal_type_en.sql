-- meal_entries.meal_type: alle Legacy-Werte auf Englisch (breakfast | lunch | dinner | snack | alcohol).
-- Einmal im Supabase SQL Editor ausführen.

UPDATE public.meal_entries
SET meal_type = 'breakfast'
WHERE lower(trim(meal_type)) IN (
  'frühstück',
  'fruhstuck',
  'fruestueck',
  'breakfast'
);

UPDATE public.meal_entries
SET meal_type = 'lunch'
WHERE lower(trim(meal_type)) IN (
  'mittagessen',
  'mittag',
  'lunch'
);

UPDATE public.meal_entries
SET meal_type = 'dinner'
WHERE lower(trim(meal_type)) IN (
  'abendessen',
  'abend',
  'dinner'
);

UPDATE public.meal_entries
SET meal_type = 'snack'
WHERE lower(trim(meal_type)) IN ('snack');

UPDATE public.meal_entries
SET meal_type = 'alcohol'
WHERE lower(trim(meal_type)) IN ('alcohol', 'alkohol');
