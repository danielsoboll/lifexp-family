-- =============================================================================
-- LifeXP Family — Komplett-Migration: Supabase Auth → MVP ohne Auth
-- =============================================================================
-- Einmal im Supabase SQL Editor ausführen:
-- https://supabase.com/dashboard/project/rethdsbfcwwvyynkmbjb/sql/new
--
-- Behebt u.a.:
--   • parent_profiles.id → nicht mehr an auth.users gebunden
--   • family_members.user_id → parent_id
--   • created_by / completed_by / … → parent_profiles statt auth.users
--   • anon-RLS für alle Family-Tabellen
--
-- Idempotent: mehrfaches Ausführen ist unkritisch (leere DB empfohlen).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Auth-Trigger & alte Hilfsfunktionen entfernen
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_parent_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_parent_user();
DROP FUNCTION IF EXISTS public.create_family_with_owner(text, text);
DROP FUNCTION IF EXISTS public.auth_user_family_ids();
DROP FUNCTION IF EXISTS public.is_family_member(uuid);
DROP FUNCTION IF EXISTS public.is_family_owner(uuid);

-- ---------------------------------------------------------------------------
-- 2) parent_profiles: eigenständige UUIDs (nicht auth.users.id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.parent_profiles DROP CONSTRAINT IF EXISTS parent_profiles_id_fkey;
ALTER TABLE public.parent_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ---------------------------------------------------------------------------
-- 3) family_members: user_id → parent_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_members' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_members' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_user_id_fkey;
    ALTER TABLE public.family_members RENAME COLUMN user_id TO parent_id;
  END IF;
END $$;

ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_parent_id_fkey;
ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

DROP INDEX IF EXISTS family_members_user_id_idx;
CREATE INDEX IF NOT EXISTS family_members_parent_id_idx ON public.family_members (parent_id);
CREATE INDEX IF NOT EXISTS family_members_family_id_idx ON public.family_members (family_id);

-- ---------------------------------------------------------------------------
-- 4) Audit-Spalten: auth.users → parent_profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_created_by_fkey;
ALTER TABLE public.quests
  ADD CONSTRAINT quests_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.parent_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.quest_completions DROP CONSTRAINT IF EXISTS quest_completions_completed_by_fkey;
ALTER TABLE public.quest_completions
  ADD CONSTRAINT quest_completions_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES public.parent_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_created_by_fkey;
ALTER TABLE public.rewards
  ADD CONSTRAINT rewards_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.parent_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_approved_by_fkey;
ALTER TABLE public.reward_redemptions
  ADD CONSTRAINT reward_redemptions_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.parent_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.family_challenges DROP CONSTRAINT IF EXISTS family_challenges_created_by_fkey;
ALTER TABLE public.family_challenges
  ADD CONSTRAINT family_challenges_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.parent_profiles (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 5) PK-Defaults (App kann IDs setzen; DB-Fallback falls nicht)
-- ---------------------------------------------------------------------------
ALTER TABLE public.families ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.family_members ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.child_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.quests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.quest_completions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.daily_xp_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ---------------------------------------------------------------------------
-- 6) Alte auth-basierte RLS-Policies entfernen
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'families',
        'parent_profiles',
        'family_members',
        'child_profiles',
        'quests',
        'quest_completions',
        'daily_xp_entries',
        'rewards',
        'reward_redemptions',
        'family_challenges',
        'family_challenge_progress'
      )
      AND policyname NOT LIKE '%_anon_all'
      AND policyname NOT LIKE '%_authenticated_all'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7) MVP anon-RLS (offen für lokale Session ohne Supabase Auth)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

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

DROP POLICY IF EXISTS families_anon_all ON public.families;
CREATE POLICY families_anon_all ON public.families FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS parent_profiles_anon_all ON public.parent_profiles;
CREATE POLICY parent_profiles_anon_all ON public.parent_profiles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_members_anon_all ON public.family_members;
CREATE POLICY family_members_anon_all ON public.family_members FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS child_profiles_anon_all ON public.child_profiles;
CREATE POLICY child_profiles_anon_all ON public.child_profiles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quests_anon_all ON public.quests;
CREATE POLICY quests_anon_all ON public.quests FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_completions_anon_all ON public.quest_completions;
CREATE POLICY quest_completions_anon_all ON public.quest_completions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS daily_xp_entries_anon_all ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_anon_all ON public.daily_xp_entries FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rewards_anon_all ON public.rewards;
CREATE POLICY rewards_anon_all ON public.rewards FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reward_redemptions_anon_all ON public.reward_redemptions;
CREATE POLICY reward_redemptions_anon_all ON public.reward_redemptions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_challenges_anon_all ON public.family_challenges;
CREATE POLICY family_challenges_anon_all ON public.family_challenges FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_challenge_progress_anon_all ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_anon_all ON public.family_challenge_progress FOR ALL TO anon USING (true) WITH CHECK (true);

-- authenticated (falls später Auth kommt)
DROP POLICY IF EXISTS families_authenticated_all ON public.families;
CREATE POLICY families_authenticated_all ON public.families FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS parent_profiles_authenticated_all ON public.parent_profiles;
CREATE POLICY parent_profiles_authenticated_all ON public.parent_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_members_authenticated_all ON public.family_members;
CREATE POLICY family_members_authenticated_all ON public.family_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS child_profiles_authenticated_all ON public.child_profiles;
CREATE POLICY child_profiles_authenticated_all ON public.child_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quests_authenticated_all ON public.quests;
CREATE POLICY quests_authenticated_all ON public.quests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_completions_authenticated_all ON public.quest_completions;
CREATE POLICY quest_completions_authenticated_all ON public.quest_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS daily_xp_entries_authenticated_all ON public.daily_xp_entries;
CREATE POLICY daily_xp_entries_authenticated_all ON public.daily_xp_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS rewards_authenticated_all ON public.rewards;
CREATE POLICY rewards_authenticated_all ON public.rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reward_redemptions_authenticated_all ON public.reward_redemptions;
CREATE POLICY reward_redemptions_authenticated_all ON public.reward_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_challenges_authenticated_all ON public.family_challenges;
CREATE POLICY family_challenges_authenticated_all ON public.family_challenges FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_challenge_progress_authenticated_all ON public.family_challenge_progress;
CREATE POLICY family_challenge_progress_authenticated_all ON public.family_challenge_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;

-- PostgREST Schema-Cache neu laden
NOTIFY pgrst, 'reload schema';
