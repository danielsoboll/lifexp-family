-- Geschlecht + Alter für Familienmitglieder
-- Einmal im Supabase SQL Editor ausführen.

-- Eltern: Mann / Frau
ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'male'
  CHECK (gender IN ('male', 'female'));

-- Kinder: Junge / Mädchen + Alter (statt Geburtsjahr)
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'boy'
  CHECK (gender IN ('boy', 'girl'));

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS age smallint
  CHECK (age IS NULL OR age BETWEEN 0 AND 99);

-- Bestehende avatar_key → gender
UPDATE public.child_profiles
SET gender = CASE
  WHEN avatar_key IN ('girl', 'female') THEN 'girl'
  ELSE 'boy'
END;

-- Bestehendes Geburtsjahr → ungefähres Alter
UPDATE public.child_profiles
SET age = GREATEST(0, EXTRACT(YEAR FROM CURRENT_DATE)::int - birth_year)
WHERE age IS NULL AND birth_year IS NOT NULL;

ALTER TABLE public.child_profiles DROP COLUMN IF EXISTS birth_year;

-- avatar_key weiter für Avatare, aber synchron zu gender
UPDATE public.child_profiles
SET avatar_key = gender
WHERE avatar_key IN ('default', 'boy', 'girl', 'male', 'female');

NOTIFY pgrst, 'reload schema';
