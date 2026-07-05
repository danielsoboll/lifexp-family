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
-- 3) Eltern-Rollen: Papa/Mama/Opa/Oma
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

-- =============================================================================
-- 6) Einmal-Hinweise (Setup-Assistent + Streak)
-- =============================================================================

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS guide_welcome_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_quest_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_invite_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_profile_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_finished boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_solo_quest_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS streak_intro_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS streak_intro_seen boolean NOT NULL DEFAULT false;

-- =============================================================================
-- 7) Quest-Kalender: task_date (heute/morgen)
-- =============================================================================

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS task_date date;

UPDATE public.quests
SET task_date = (timezone('Europe/Berlin', now()))::date
WHERE task_date IS NULL;

UPDATE public.quests
SET xp_reward = LEAST(10, GREATEST(1, xp_reward))
WHERE xp_reward NOT BETWEEN 1 AND 10;

ALTER TABLE public.quests
  ALTER COLUMN task_date SET NOT NULL;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS created_by_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_xp_reward_check;
ALTER TABLE public.quests
  ADD CONSTRAINT quests_xp_reward_check CHECK (xp_reward BETWEEN 1 AND 10);

CREATE INDEX IF NOT EXISTS quests_family_task_date_idx
  ON public.quests (family_id, task_date, is_active);

-- =============================================================================
-- 8) Quest-Abschluss: Zwei-Stufen-Bestätigung (XP-Budget / Tages-XP)
-- =============================================================================

ALTER TABLE public.quest_completions
  ADD COLUMN IF NOT EXISTS assignee_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_confirmed_by_parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_confirmed_by_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL;

UPDATE public.quest_completions
SET
  assignee_confirmed_at = COALESCE(assignee_confirmed_at, completed_at),
  creator_confirmed_at = COALESCE(creator_confirmed_at, completed_at)
WHERE assignee_confirmed_at IS NULL OR creator_confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS quest_completions_pending_creator_idx
  ON public.quest_completions (family_id, creator_confirmed_at)
  WHERE assignee_confirmed_at IS NOT NULL AND creator_confirmed_at IS NULL;

-- =============================================================================
-- 9) LifeXP Family PLUS (Stripe-Abo pro Familie)
-- =============================================================================

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plus_until timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_plan_check;
ALTER TABLE public.families
  ADD CONSTRAINT families_plan_check CHECK (plan IN ('free', 'plus'));

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_customer_id_uidx
  ON public.families (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_subscription_id_uidx
  ON public.families (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parent_profiles_auth_user_id_uidx
  ON public.parent_profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_family_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
      OR NEW.plus_until IS DISTINCT FROM OLD.plus_until
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    ) AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Family billing fields are managed server-side only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS families_protect_billing ON public.families;
CREATE TRIGGER families_protect_billing
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_family_billing_fields();

CREATE OR REPLACE FUNCTION public.protect_parent_auth_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NULL OR NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'auth_user_id can only be set to the current user';
    END IF;
    IF OLD.auth_user_id IS NOT NULL AND OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id THEN
      RAISE EXCEPTION 'auth_user_id is already linked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_profiles_protect_auth_user_id ON public.parent_profiles;
CREATE TRIGGER parent_profiles_protect_auth_user_id
  BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_parent_auth_user_id();

-- =============================================================================
-- 10) Wiederkehrende Quest-Vorlagen (PLUS)
-- =============================================================================
-- Vollständig: supabase/recurring_quest_templates_migration.sql

NOTIFY pgrst, 'reload schema';
