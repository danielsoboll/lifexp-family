-- Opa/Oma als eigene Eltern-Rollen (neben Papa/Mama).
-- Idempotent.

ALTER TABLE public.parent_profiles
  DROP CONSTRAINT IF EXISTS parent_profiles_gender_check;

ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_gender_check
  CHECK (gender IN ('male', 'female', 'opa', 'oma'));

NOTIFY pgrst, 'reload schema';
