-- Opa / Oma als Geschlechts-Rolle für parent_profiles
-- Einmal im Supabase SQL Editor ausführen (nach member_gender_age_migration.sql).

ALTER TABLE public.parent_profiles
  DROP CONSTRAINT IF EXISTS parent_profiles_gender_check;

ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_gender_check
  CHECK (gender IN ('male', 'female', 'opa', 'oma'));

NOTIFY pgrst, 'reload schema';
