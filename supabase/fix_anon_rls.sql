-- Fix: anon darf alle Family-Tabellen lesen/schreiben (MVP)
-- DEPRECATED als Einzel-Fix — bitte migrate_to_mvp_no_auth.sql ausführen (enthält RLS + Schema).
-- Einmal im Supabase Dashboard → SQL Editor → Run

-- Alle bestehenden Policies auf Family-Tabellen entfernen
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
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

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

CREATE POLICY families_anon_all ON public.families FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY parent_profiles_anon_all ON public.parent_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY family_members_anon_all ON public.family_members FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY child_profiles_anon_all ON public.child_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY quests_anon_all ON public.quests FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY quest_completions_anon_all ON public.quest_completions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY daily_xp_entries_anon_all ON public.daily_xp_entries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY rewards_anon_all ON public.rewards FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY reward_redemptions_anon_all ON public.reward_redemptions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY family_challenges_anon_all ON public.family_challenges FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY family_challenge_progress_anon_all ON public.family_challenge_progress FOR ALL TO anon USING (true) WITH CHECK (true);

-- Optional: authenticated ebenfalls (falls später Auth kommt)
CREATE POLICY families_authenticated_all ON public.families FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY parent_profiles_authenticated_all ON public.parent_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY family_members_authenticated_all ON public.family_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY child_profiles_authenticated_all ON public.child_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY quests_authenticated_all ON public.quests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY quest_completions_authenticated_all ON public.quest_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY daily_xp_entries_authenticated_all ON public.daily_xp_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY rewards_authenticated_all ON public.rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY reward_redemptions_authenticated_all ON public.reward_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY family_challenges_authenticated_all ON public.family_challenges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY family_challenge_progress_authenticated_all ON public.family_challenge_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Altes Auth-Schema: parent_profiles.id war auth.users.id ohne Default
ALTER TABLE public.parent_profiles DROP CONSTRAINT IF EXISTS parent_profiles_id_fkey;
ALTER TABLE public.parent_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
