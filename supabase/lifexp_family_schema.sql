-- LifeXP Family — MVP-Schema für Supabase (PostgreSQL)
-- Projekt: lifexp-family

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_member_role') THEN
    CREATE TYPE public.family_member_role AS ENUM ('owner', 'parent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_recurrence') THEN
    CREATE TYPE public.quest_recurrence AS ENUM ('once', 'daily', 'weekly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_entry_source') THEN
    CREATE TYPE public.xp_entry_source AS ENUM (
      'quest',
      'bonus',
      'challenge',
      'manual',
      'redemption_adjustment'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_redemption_status') THEN
    CREATE TYPE public.reward_redemption_status AS ENUM (
      'pending',
      'approved',
      'fulfilled',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_challenge_type') THEN
    CREATE TYPE public.family_challenge_type AS ENUM (
      'total_xp',
      'quest_count',
      'streak_days'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'family_challenge_status') THEN
    CREATE TYPE public.family_challenge_status AS ENUM (
      'draft',
      'active',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  invite_code text UNIQUE,
  timezone text NOT NULL DEFAULT 'Europe/Berlin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS families_invite_code_idx
  ON public.families (invite_code)
  WHERE invite_code IS NOT NULL;

DROP TRIGGER IF EXISTS families_set_updated_at ON public.families;
CREATE TRIGGER families_set_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.parent_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS parent_profiles_set_updated_at ON public.parent_profiles;
CREATE TRIGGER parent_profiles_set_updated_at
  BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_parent_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.parent_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), split_part(NEW.email, '@', 1), 'Elternteil')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_parent_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_parent_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_parent_user();

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.family_member_role NOT NULL DEFAULT 'parent',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS family_members_user_id_idx
  ON public.family_members (user_id);

CREATE INDEX IF NOT EXISTS family_members_family_id_idx
  ON public.family_members (family_id);

CREATE TABLE IF NOT EXISTS public.child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 80),
  birth_year smallint CHECK (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100),
  avatar_key text NOT NULL DEFAULT 'default',
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level smallint NOT NULL DEFAULT 1 CHECK (level >= 1),
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS child_profiles_family_id_idx
  ON public.child_profiles (family_id);

CREATE INDEX IF NOT EXISTS child_profiles_family_active_idx
  ON public.child_profiles (family_id, is_active, sort_order);

DROP TRIGGER IF EXISTS child_profiles_set_updated_at ON public.child_profiles;
CREATE TRIGGER child_profiles_set_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  xp_reward integer NOT NULL DEFAULT 5 CHECK (xp_reward >= 0),
  category text NOT NULL DEFAULT 'allgemein',
  recurrence public.quest_recurrence NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quests_family_id_idx
  ON public.quests (family_id);

CREATE INDEX IF NOT EXISTS quests_family_child_active_idx
  ON public.quests (family_id, child_id, is_active, sort_order);

DROP TRIGGER IF EXISTS quests_set_updated_at ON public.quests;
CREATE TRIGGER quests_set_updated_at
  BEFORE UPDATE ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests (id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  note text,
  UNIQUE (quest_id, child_id, completed_on)
);

CREATE INDEX IF NOT EXISTS quest_completions_child_date_idx
  ON public.quest_completions (child_id, completed_on DESC);

CREATE INDEX IF NOT EXISTS quest_completions_family_date_idx
  ON public.quest_completions (family_id, completed_on DESC);

CREATE TABLE IF NOT EXISTS public.daily_xp_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  source public.xp_entry_source NOT NULL,
  source_id uuid,
  xp_amount integer NOT NULL CHECK (xp_amount <> 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_xp_entries_child_date_idx
  ON public.daily_xp_entries (child_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS daily_xp_entries_family_date_idx
  ON public.daily_xp_entries (family_id, entry_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_dedupe_uidx
  ON public.daily_xp_entries (child_id, entry_date, source, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  xp_cost integer NOT NULL CHECK (xp_cost > 0),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rewards_family_active_idx
  ON public.rewards (family_id, is_active, sort_order);

DROP TRIGGER IF EXISTS rewards_set_updated_at ON public.rewards;
CREATE TRIGGER rewards_set_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.rewards (id) ON DELETE RESTRICT,
  child_id uuid NOT NULL REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  xp_spent integer NOT NULL CHECK (xp_spent > 0),
  status public.reward_redemption_status NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  note text
);

CREATE INDEX IF NOT EXISTS reward_redemptions_child_idx
  ON public.reward_redemptions (child_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS reward_redemptions_family_status_idx
  ON public.reward_redemptions (family_id, status, redeemed_at DESC);

CREATE TABLE IF NOT EXISTS public.family_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  challenge_type public.family_challenge_type NOT NULL DEFAULT 'total_xp',
  target_value integer NOT NULL CHECK (target_value > 0),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  xp_bonus integer NOT NULL DEFAULT 0 CHECK (xp_bonus >= 0),
  status public.family_challenge_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS family_challenges_family_status_idx
  ON public.family_challenges (family_id, status, starts_on DESC);

DROP TRIGGER IF EXISTS family_challenges_set_updated_at ON public.family_challenges;
CREATE TRIGGER family_challenges_set_updated_at
  BEFORE UPDATE ON public.family_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.family_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.family_challenges (id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.child_profiles (id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, child_id)
);

CREATE INDEX IF NOT EXISTS family_challenge_progress_challenge_idx
  ON public.family_challenge_progress (challenge_id);

CREATE OR REPLACE FUNCTION public.enforce_child_in_family()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id
      AND cp.family_id = NEW.family_id
  ) THEN
    RAISE EXCEPTION 'child_id gehört nicht zu family_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_xp_entries_child_family ON public.daily_xp_entries;
CREATE TRIGGER daily_xp_entries_child_family
  BEFORE INSERT OR UPDATE ON public.daily_xp_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_child_in_family();

DROP TRIGGER IF EXISTS quests_child_family ON public.quests;
CREATE TRIGGER quests_child_family
  BEFORE INSERT OR UPDATE ON public.quests
  FOR EACH ROW
  WHEN (NEW.child_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_child_in_family();

DROP TRIGGER IF EXISTS quest_completions_child_family ON public.quest_completions;
CREATE TRIGGER quest_completions_child_family
  BEFORE INSERT OR UPDATE ON public.quest_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_child_in_family();

DROP TRIGGER IF EXISTS reward_redemptions_child_family ON public.reward_redemptions;
CREATE TRIGGER reward_redemptions_child_family
  BEFORE INSERT OR UPDATE ON public.reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_child_in_family();

DROP TRIGGER IF EXISTS family_challenge_progress_child_family ON public.family_challenge_progress;
CREATE TRIGGER family_challenge_progress_child_family
  BEFORE INSERT OR UPDATE ON public.family_challenge_progress
  FOR EACH ROW
  WHEN (NEW.child_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_child_in_family();

CREATE OR REPLACE FUNCTION public.apply_daily_xp_entry_to_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp + NEW.xp_amount)
    WHERE id = NEW.child_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp - OLD.xp_amount)
    WHERE id = OLD.child_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp - OLD.xp_amount + NEW.xp_amount)
    WHERE id = NEW.child_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS daily_xp_entries_apply_child_total ON public.daily_xp_entries;
CREATE TRIGGER daily_xp_entries_apply_child_total
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_xp_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_daily_xp_entry_to_child();

CREATE OR REPLACE FUNCTION public.auth_user_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fm.family_id
  FROM public.family_members fm
  WHERE fm.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_family_member(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = p_family_id
      AND fm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = p_family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.create_family_with_owner(p_name text, p_invite_code text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  INSERT INTO public.families (name, invite_code)
  VALUES (trim(p_name), NULLIF(trim(p_invite_code), ''))
  RETURNING id INTO v_family_id;

  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (v_family_id, auth.uid(), 'owner');

  RETURN v_family_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_family_with_owner(text, text) TO authenticated;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_xp_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_profiles_select_own ON public.parent_profiles;
CREATE POLICY parent_profiles_select_own
  ON public.parent_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS parent_profiles_update_own ON public.parent_profiles;
CREATE POLICY parent_profiles_update_own
  ON public.parent_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS families_select_member ON public.families;
CREATE POLICY families_select_member
  ON public.families FOR SELECT TO authenticated
  USING (id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS families_insert_authenticated ON public.families;
CREATE POLICY families_insert_authenticated
  ON public.families FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS families_update_owner ON public.families;
CREATE POLICY families_update_owner
  ON public.families FOR UPDATE TO authenticated
  USING (public.is_family_owner(id))
  WITH CHECK (public.is_family_owner(id));

DROP POLICY IF EXISTS families_delete_owner ON public.families;
CREATE POLICY families_delete_owner
  ON public.families FOR DELETE TO authenticated
  USING (public.is_family_owner(id));

DROP POLICY IF EXISTS family_members_select_member ON public.family_members;
CREATE POLICY family_members_select_member
  ON public.family_members FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS family_members_insert_owner ON public.family_members;
CREATE POLICY family_members_insert_owner
  ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_owner(family_id)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_members.family_id)
    )
  );

DROP POLICY IF EXISTS family_members_update_owner ON public.family_members;
CREATE POLICY family_members_update_owner
  ON public.family_members FOR UPDATE TO authenticated
  USING (public.is_family_owner(family_id))
  WITH CHECK (public.is_family_owner(family_id));

DROP POLICY IF EXISTS family_members_delete_owner_or_self ON public.family_members;
CREATE POLICY family_members_delete_owner_or_self
  ON public.family_members FOR DELETE TO authenticated
  USING (public.is_family_owner(family_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS child_profiles_select_member ON public.child_profiles;
CREATE POLICY child_profiles_select_member
  ON public.child_profiles FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS child_profiles_insert_member ON public.child_profiles;
CREATE POLICY child_profiles_insert_member
  ON public.child_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS child_profiles_update_member ON public.child_profiles;
CREATE POLICY child_profiles_update_member
  ON public.child_profiles FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS child_profiles_delete_member ON public.child_profiles;
CREATE POLICY child_profiles_delete_member
  ON public.child_profiles FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS quests_select_member ON public.quests;
CREATE POLICY quests_select_member
  ON public.quests FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS quests_insert_member ON public.quests;
CREATE POLICY quests_insert_member
  ON public.quests FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS quests_update_member ON public.quests;
CREATE POLICY quests_update_member
  ON public.quests FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS quests_delete_member ON public.quests;
CREATE POLICY quests_delete_member
  ON public.quests FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS quest_completions_select_member ON public.quest_completions;
CREATE POLICY quest_completions_select_member
  ON public.quest_completions FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS quest_completions_insert_member ON public.quest_completions;
CREATE POLICY quest_completions_insert_member
  ON public.quest_completions FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS quest_completions_update_member ON public.quest_completions;
CREATE POLICY quest_completions_update_member
  ON public.quest_completions FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS quest_completions_delete_member ON public.quest_completions;
CREATE POLICY quest_completions_delete_member
  ON public.quest_completions FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS daily_xp_entries_select_member ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_select_member
  ON public.daily_xp_entries FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS daily_xp_entries_insert_member ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_insert_member
  ON public.daily_xp_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS daily_xp_entries_update_member ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_update_member
  ON public.daily_xp_entries FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS daily_xp_entries_delete_member ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_delete_member
  ON public.daily_xp_entries FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS rewards_select_member ON public.rewards;
CREATE POLICY rewards_select_member
  ON public.rewards FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS rewards_insert_member ON public.rewards;
CREATE POLICY rewards_insert_member
  ON public.rewards FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS rewards_update_member ON public.rewards;
CREATE POLICY rewards_update_member
  ON public.rewards FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS rewards_delete_member ON public.rewards;
CREATE POLICY rewards_delete_member
  ON public.rewards FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS reward_redemptions_select_member ON public.reward_redemptions;
CREATE POLICY reward_redemptions_select_member
  ON public.reward_redemptions FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS reward_redemptions_insert_member ON public.reward_redemptions;
CREATE POLICY reward_redemptions_insert_member
  ON public.reward_redemptions FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS reward_redemptions_update_member ON public.reward_redemptions;
CREATE POLICY reward_redemptions_update_member
  ON public.reward_redemptions FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS reward_redemptions_delete_member ON public.reward_redemptions;
CREATE POLICY reward_redemptions_delete_member
  ON public.reward_redemptions FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenges_select_member ON public.family_challenges;
CREATE POLICY family_challenges_select_member
  ON public.family_challenges FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS family_challenges_insert_member ON public.family_challenges;
CREATE POLICY family_challenges_insert_member
  ON public.family_challenges FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenges_update_member ON public.family_challenges;
CREATE POLICY family_challenges_update_member
  ON public.family_challenges FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenges_delete_member ON public.family_challenges;
CREATE POLICY family_challenges_delete_member
  ON public.family_challenges FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenge_progress_select_member ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_select_member
  ON public.family_challenge_progress FOR SELECT TO authenticated
  USING (family_id IN (SELECT public.auth_user_family_ids()));

DROP POLICY IF EXISTS family_challenge_progress_insert_member ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_insert_member
  ON public.family_challenge_progress FOR INSERT TO authenticated
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenge_progress_update_member ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_update_member
  ON public.family_challenge_progress FOR UPDATE TO authenticated
  USING (public.is_family_member(family_id))
  WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS family_challenge_progress_delete_member ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_delete_member
  ON public.family_challenge_progress FOR DELETE TO authenticated
  USING (public.is_family_member(family_id));
