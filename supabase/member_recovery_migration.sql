-- Recovery-Code + PWA-Status pro Familienmitglied (wie LifeXP profiles)
-- Einmal im Supabase SQL Editor ausführen.

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS rec_code text,
  ADD COLUMN IF NOT EXISTS rec_code_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_installed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_later boolean NOT NULL DEFAULT false;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS rec_code text,
  ADD COLUMN IF NOT EXISTS rec_code_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_installed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS app_later boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS parent_profiles_rec_code_uidx
  ON public.parent_profiles (rec_code)
  WHERE rec_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS child_profiles_rec_code_uidx
  ON public.child_profiles (rec_code)
  WHERE rec_code IS NOT NULL;

-- Format wie App: LIFE-XXXX-XXXX (ohne 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_life_recovery_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  chars constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  seg1 text := '';
  seg2 text := '';
  i int;
  candidate text;
  char_idx int;
BEGIN
  FOR attempt IN 1..32 LOOP
    seg1 := '';
    seg2 := '';
    FOR i IN 1..4 LOOP
      char_idx := 1 + floor(random() * length(chars))::int;
      seg1 := seg1 || substr(chars, char_idx, 1);
      char_idx := 1 + floor(random() * length(chars))::int;
      seg2 := seg2 || substr(chars, char_idx, 1);
    END LOOP;
    candidate := 'LIFE-' || seg1 || '-' || seg2;
    IF NOT EXISTS (
      SELECT 1 FROM public.parent_profiles WHERE rec_code = candidate
      UNION ALL
      SELECT 1 FROM public.child_profiles WHERE rec_code = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Recovery-Code konnte nicht erzeugt werden';
END;
$$;

-- Bestehende Mitglieder ohne Code backfillen (Admin kann Codes dann anzeigen)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.parent_profiles WHERE rec_code IS NULL ORDER BY created_at LOOP
    UPDATE public.parent_profiles
    SET rec_code = public.generate_life_recovery_code()
    WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id FROM public.child_profiles WHERE rec_code IS NULL ORDER BY created_at LOOP
    UPDATE public.child_profiles
    SET rec_code = public.generate_life_recovery_code()
    WHERE id = r.id;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.parent_profiles.rec_code IS 'Recovery-Code (LIFE-XXXX-XXXX) für Profil-Wiederherstellung.';
COMMENT ON COLUMN public.child_profiles.rec_code IS 'Recovery-Code (LIFE-XXXX-XXXX) für Profil-Wiederherstellung.';

NOTIFY pgrst, 'reload schema';
