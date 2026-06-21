-- Alle ausstehenden Migrationen (einmal im Supabase SQL Editor ausfuehren)
-- Reihenfolge beibehalten.

-- =============================================================================
-- 1) Quest-Abschluesse: Eltern ohne child_id
--    Fix: "child_id gehoert nicht zu family_id"
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_child_in_family()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.child_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id
      AND cp.family_id = NEW.family_id
  ) THEN
    RAISE EXCEPTION 'child_id gehoert nicht zu family_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quest_completions_child_family ON public.quest_completions;
CREATE TRIGGER quest_completions_child_family
  BEFORE INSERT OR UPDATE ON public.quest_completions
  FOR EACH ROW
  WHEN (NEW.child_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_child_in_family();

-- =============================================================================
-- 2) Recovery-Code + PWA-Status (Onboarding / Admin)
-- =============================================================================

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

COMMENT ON COLUMN public.parent_profiles.rec_code IS 'Recovery-Code (LIFE-XXXX-XXXX) fuer Profil-Wiederherstellung.';
COMMENT ON COLUMN public.child_profiles.rec_code IS 'Recovery-Code (LIFE-XXXX-XXXX) fuer Profil-Wiederherstellung.';

-- =============================================================================
-- 3) Opa / Oma als Eltern-Rollen (parent_profiles.gender)
-- =============================================================================

ALTER TABLE public.parent_profiles
  DROP CONSTRAINT IF EXISTS parent_profiles_gender_check;

ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_gender_check
  CHECK (gender IN ('male', 'female', 'opa', 'oma'));

-- =============================================================================
-- 4) Quest-Zuweisungen (Familien-Quests / Mehrfach-Zuweisung)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.quest_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests (id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('parent', 'child')),
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, assignee_type, assignee_id)
);

CREATE INDEX IF NOT EXISTS quest_assignments_quest_id_idx ON public.quest_assignments (quest_id);

ALTER TABLE public.quest_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quest_assignments_anon_all ON public.quest_assignments;
CREATE POLICY quest_assignments_anon_all ON public.quest_assignments FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.quest_completions ALTER COLUMN child_id DROP NOT NULL;
ALTER TABLE public.quest_completions ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

ALTER TABLE public.quest_completions DROP CONSTRAINT IF EXISTS quest_completions_child_or_parent_chk;
ALTER TABLE public.quest_completions
  ADD CONSTRAINT quest_completions_child_or_parent_chk
  CHECK (
    (child_id IS NOT NULL AND parent_id IS NULL)
    OR (child_id IS NULL AND parent_id IS NOT NULL)
  );

ALTER TABLE public.quest_completions DROP CONSTRAINT IF EXISTS quest_completions_quest_id_child_id_completed_on_key;
CREATE UNIQUE INDEX IF NOT EXISTS quest_completions_quest_child_date_uidx
  ON public.quest_completions (quest_id, child_id, completed_on)
  WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quest_completions_quest_parent_date_uidx
  ON public.quest_completions (quest_id, parent_id, completed_on)
  WHERE parent_id IS NOT NULL;

-- =============================================================================
-- 5a) Tages-Streak — Schritt 1 (ZUERST allein ausführen, dann 5b)
--     PostgreSQL: neuer Enum-Wert muss committet sein, bevor er in Indizes genutzt wird.
-- =============================================================================

ALTER TYPE public.xp_entry_source ADD VALUE IF NOT EXISTS 'streak';

-- =============================================================================
-- 5b) Tages-Streak — Schritt 2 (danach ausführen: Heute dabei, 2 XP)
-- =============================================================================

ALTER TABLE public.daily_xp_entries ALTER COLUMN child_id DROP NOT NULL;
ALTER TABLE public.daily_xp_entries ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

ALTER TABLE public.daily_xp_entries DROP CONSTRAINT IF EXISTS daily_xp_entries_member_chk;
ALTER TABLE public.daily_xp_entries
  ADD CONSTRAINT daily_xp_entries_member_chk
  CHECK (
    (child_id IS NOT NULL AND parent_id IS NULL)
    OR (child_id IS NULL AND parent_id IS NOT NULL)
  );

DROP INDEX IF EXISTS daily_xp_entries_dedupe_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_child_streak_uidx
  ON public.daily_xp_entries (child_id, entry_date)
  WHERE child_id IS NOT NULL AND source = 'streak';
CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_parent_streak_uidx
  ON public.daily_xp_entries (parent_id, entry_date)
  WHERE parent_id IS NOT NULL AND source = 'streak';

NOTIFY pgrst, 'reload schema';
