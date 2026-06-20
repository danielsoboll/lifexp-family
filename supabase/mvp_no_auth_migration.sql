-- Migration: Supabase Auth → lokale family_id/parent_id (MVP)
-- Im Supabase SQL Editor ausführen (Backup empfohlen).
-- Voraussetzung: bestehendes lifexp_family_schema mit auth.users-FKs.

-- 1) Auth-Trigger entfernen
DROP TRIGGER IF EXISTS on_auth_user_created_parent_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_parent_user();

-- 2) Alte Auth-RPCs und Hilfsfunktionen
DROP FUNCTION IF EXISTS public.create_family_with_owner(text, text);
DROP FUNCTION IF EXISTS public.auth_user_family_ids();
DROP FUNCTION IF EXISTS public.is_family_member(uuid);
DROP FUNCTION IF EXISTS public.is_family_owner(uuid);

-- 3) Alte RLS-Policies (auth-basiert)
DROP POLICY IF EXISTS parent_profiles_select_own ON public.parent_profiles;
DROP POLICY IF EXISTS parent_profiles_update_own ON public.parent_profiles;
DROP POLICY IF EXISTS families_select_member ON public.families;
DROP POLICY IF EXISTS families_insert_authenticated ON public.families;
DROP POLICY IF EXISTS families_update_owner ON public.families;
DROP POLICY IF EXISTS families_delete_owner ON public.families;
DROP POLICY IF EXISTS family_members_select_member ON public.family_members;
DROP POLICY IF EXISTS family_members_insert_owner ON public.family_members;
DROP POLICY IF EXISTS family_members_update_owner ON public.family_members;
DROP POLICY IF EXISTS family_members_delete_owner_or_self ON public.family_members;
DROP POLICY IF EXISTS child_profiles_select_member ON public.child_profiles;
DROP POLICY IF EXISTS child_profiles_insert_member ON public.child_profiles;
DROP POLICY IF EXISTS child_profiles_update_member ON public.child_profiles;
DROP POLICY IF EXISTS child_profiles_delete_member ON public.child_profiles;
DROP POLICY IF EXISTS quests_select_member ON public.quests;
DROP POLICY IF EXISTS quests_insert_member ON public.quests;
DROP POLICY IF EXISTS quests_update_member ON public.quests;
DROP POLICY IF EXISTS quests_delete_member ON public.quests;
DROP POLICY IF EXISTS quest_completions_select_member ON public.quest_completions;
DROP POLICY IF EXISTS quest_completions_insert_member ON public.quest_completions;
DROP POLICY IF EXISTS quest_completions_update_member ON public.quest_completions;
DROP POLICY IF EXISTS quest_completions_delete_member ON public.quest_completions;
DROP POLICY IF EXISTS daily_xp_entries_select_member ON public.daily_xp_entries;
DROP POLICY IF EXISTS daily_xp_entries_insert_member ON public.daily_xp_entries;
DROP POLICY IF EXISTS daily_xp_entries_update_member ON public.daily_xp_entries;
DROP POLICY IF EXISTS daily_xp_entries_delete_member ON public.daily_xp_entries;
DROP POLICY IF EXISTS rewards_select_member ON public.rewards;
DROP POLICY IF EXISTS rewards_insert_member ON public.rewards;
DROP POLICY IF EXISTS rewards_update_member ON public.rewards;
DROP POLICY IF EXISTS rewards_delete_member ON public.rewards;
DROP POLICY IF EXISTS reward_redemptions_select_member ON public.reward_redemptions;
DROP POLICY IF EXISTS reward_redemptions_insert_member ON public.reward_redemptions;
DROP POLICY IF EXISTS reward_redemptions_update_member ON public.reward_redemptions;
DROP POLICY IF EXISTS reward_redemptions_delete_member ON public.reward_redemptions;
DROP POLICY IF EXISTS family_challenges_select_member ON public.family_challenges;
DROP POLICY IF EXISTS family_challenges_insert_member ON public.family_challenges;
DROP POLICY IF EXISTS family_challenges_update_member ON public.family_challenges;
DROP POLICY IF EXISTS family_challenges_delete_member ON public.family_challenges;
DROP POLICY IF EXISTS family_challenge_progress_select_member ON public.family_challenge_progress;
DROP POLICY IF EXISTS family_challenge_progress_insert_member ON public.family_challenge_progress;
DROP POLICY IF EXISTS family_challenge_progress_update_member ON public.family_challenge_progress;
DROP POLICY IF EXISTS family_challenge_progress_delete_member ON public.family_challenge_progress;

-- 4) Schema: parent_profiles ohne auth.users
ALTER TABLE public.parent_profiles DROP CONSTRAINT IF EXISTS parent_profiles_id_fkey;
ALTER TABLE public.parent_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5) family_members: user_id → parent_id
ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_user_id_fkey;
ALTER TABLE public.family_members RENAME COLUMN user_id TO parent_id;
ALTER TABLE public.family_members
  ADD CONSTRAINT family_members_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

DROP INDEX IF EXISTS family_members_user_id_idx;
CREATE INDEX IF NOT EXISTS family_members_parent_id_idx ON public.family_members (parent_id);

-- 6) Audit-FKs: auth.users → parent_profiles
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

-- 7) Neue RPC
CREATE OR REPLACE FUNCTION public.create_family_with_parent(
  p_family_name text,
  p_parent_name text,
  p_invite_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_family_id uuid;
BEGIN
  IF char_length(trim(p_family_name)) < 1 THEN
    RAISE EXCEPTION 'Familienname fehlt';
  END IF;
  IF char_length(trim(p_parent_name)) < 1 THEN
    RAISE EXCEPTION 'Elternname fehlt';
  END IF;

  INSERT INTO public.parent_profiles (display_name)
  VALUES (trim(p_parent_name))
  RETURNING id INTO v_parent_id;

  INSERT INTO public.families (name, invite_code)
  VALUES (trim(p_family_name), NULLIF(trim(p_invite_code), ''))
  RETURNING id INTO v_family_id;

  INSERT INTO public.family_members (family_id, parent_id, role)
  VALUES (v_family_id, v_parent_id, 'owner');

  RETURN json_build_object('family_id', v_family_id, 'parent_id', v_parent_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_family_with_parent(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.join_family_with_invite_code(
  p_invite_code text,
  p_parent_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_family_id uuid;
BEGIN
  IF char_length(trim(p_invite_code)) < 1 THEN
    RAISE EXCEPTION 'Einladungscode fehlt';
  END IF;
  IF char_length(trim(p_parent_name)) < 1 THEN
    RAISE EXCEPTION 'Elternname fehlt';
  END IF;

  SELECT id INTO v_family_id
  FROM public.families
  WHERE lower(trim(invite_code)) = lower(trim(p_invite_code))
  LIMIT 1;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'Einladungscode ungültig';
  END IF;

  INSERT INTO public.parent_profiles (display_name)
  VALUES (trim(p_parent_name))
  RETURNING id INTO v_parent_id;

  INSERT INTO public.family_members (family_id, parent_id, role)
  VALUES (v_family_id, v_parent_id, 'parent');

  RETURN json_build_object('family_id', v_family_id, 'parent_id', v_parent_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_family_with_invite_code(text, text) TO anon, authenticated;

-- 8) MVP anon-RLS
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
