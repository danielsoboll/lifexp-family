-- LifeXP Family — RLS-Isolation pro Familie (ersetzt alle *_anon_all USING (true))
-- Einmal im Supabase SQL Editor ausführen.

-- =============================================================================
-- 1) Hilfsfunktionen (Request-Header + Session-Prüfung)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lifexp_is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '')
  ) = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.lifexp_header(header_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(trim(current_setting('request.headers', true)::json ->> lower(header_name)), '');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_session_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-family-id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_session_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-member-id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_session_member_kind()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-member-kind'), '');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_onboarding_mode()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-onboarding'), '');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_invite_code_header()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-invite-code'), '');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_recovery_code_header()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lifexp_header('x-lifexp-recovery-code'), '');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_session_is_valid()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fam uuid;
  mem uuid;
  kind text;
BEGIN
  fam := nullif(lifexp_header('x-lifexp-family-id'), '')::uuid;
  mem := nullif(lifexp_header('x-lifexp-member-id'), '')::uuid;
  kind := nullif(lifexp_header('x-lifexp-member-kind'), '');

  IF fam IS NULL OR mem IS NULL OR kind NOT IN ('parent', 'child') THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  IF kind = 'parent' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = fam
        AND fm.parent_id = mem
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.family_id = fam
      AND cp.id = mem
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_same_family(row_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    lifexp_is_service_role()
    OR (
      lifexp_session_is_valid()
      AND row_family_id IS NOT NULL
      AND row_family_id = lifexp_session_family_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.lifexp_invite_family_match(row_family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  code := lifexp_invite_code_header();
  IF code IS NULL OR row_family_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.families f
    WHERE f.id = row_family_id
      AND f.invite_code IS NOT NULL
      AND lower(trim(f.invite_code)) = lower(trim(code))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_parent_already_in_any_family(check_parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_parent_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.parent_id = lifexp_parent_already_in_any_family.check_parent_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_parent_in_family(parent_id uuid, family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF parent_id IS NULL OR family_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.parent_id = lifexp_parent_in_family.parent_id
      AND fm.family_id = lifexp_parent_in_family.family_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_parent_visible(parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  recovery text;
BEGIN
  IF parent_id IS NULL THEN
    RETURN false;
  END IF;

  IF lifexp_is_service_role() THEN
    RETURN true;
  END IF;

  IF lifexp_session_is_valid()
    AND lifexp_parent_in_family(parent_id, lifexp_session_family_id()) THEN
    RETURN true;
  END IF;

  code := lifexp_invite_code_header();
  recovery := lifexp_recovery_code_header();

  PERFORM set_config('row_security', 'off', true);

  IF code IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.family_members fm
      JOIN public.families f ON f.id = fm.family_id
      WHERE fm.parent_id = lifexp_parent_visible.parent_id
        AND f.invite_code IS NOT NULL
        AND lower(trim(f.invite_code)) = lower(trim(code))
    );
  END IF;

  IF recovery IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      WHERE pp.id = lifexp_parent_visible.parent_id
        AND pp.rec_code IS NOT NULL
        AND upper(trim(pp.rec_code)) = upper(trim(recovery))
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_child_visible(row_family_id uuid, child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovery text;
BEGIN
  IF row_family_id IS NULL OR child_id IS NULL THEN
    RETURN false;
  END IF;

  IF lifexp_is_service_role() OR lifexp_same_family(row_family_id) OR lifexp_invite_family_match(row_family_id) THEN
    RETURN true;
  END IF;

  recovery := lifexp_recovery_code_header();
  IF recovery IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = child_id
      AND cp.family_id = row_family_id
      AND cp.rec_code IS NOT NULL
      AND upper(trim(cp.rec_code)) = upper(trim(recovery))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_onboarding_write_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lifexp_is_service_role() OR lifexp_onboarding_mode() IN ('create', 'join');
$$;

CREATE OR REPLACE FUNCTION public.lifexp_session_is_family_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fam uuid;
  mem uuid;
BEGIN
  fam := nullif(lifexp_header('x-lifexp-family-id'), '')::uuid;
  mem := nullif(lifexp_header('x-lifexp-member-id'), '')::uuid;

  IF fam IS NULL OR mem IS NULL THEN
    RETURN false;
  END IF;

  IF nullif(lifexp_header('x-lifexp-member-kind'), '') <> 'parent' THEN
    RETURN false;
  END IF;

  PERFORM set_config('row_security', 'off', true);

  RETURN EXISTS (
    SELECT 1
    FROM public.family_members fm
    JOIN public.parent_profiles pp ON pp.id = fm.parent_id
    WHERE fm.family_id = fam
      AND fm.parent_id = mem
      AND fm.role IN ('owner', 'parent')
      AND pp.can_admin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lifexp_recovery_code_taken(check_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_profiles p
    WHERE p.rec_code IS NOT NULL
      AND upper(trim(p.rec_code)) = upper(trim(check_code))
  )
  OR EXISTS (
    SELECT 1
    FROM public.child_profiles c
    WHERE c.rec_code IS NOT NULL
      AND upper(trim(c.rec_code)) = upper(trim(check_code))
  );
$$;

REVOKE ALL ON FUNCTION public.lifexp_recovery_code_taken(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lifexp_recovery_code_taken(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.lifexp_parent_already_in_any_family(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_session_is_valid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_invite_family_match(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_parent_in_family(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_parent_visible(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lifexp_child_visible(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lifexp_session_is_family_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_already_in_any_family(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_session_is_valid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_invite_family_match(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_in_family(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_parent_visible(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifexp_child_visible(uuid, uuid) TO anon, authenticated;

-- =============================================================================
-- 2) Alte offene Policies entfernen
-- =============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        policyname LIKE '%\_anon\_all' ESCAPE '\'
        OR policyname LIKE '%\_authenticated\_all' ESCAPE '\'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS quest_completion_photos_anon_all ON storage.objects;
DROP POLICY IF EXISTS quest_completion_photos_authenticated_all ON storage.objects;

-- =============================================================================
-- 3) Tabellen-Policies (Familien-Isolation)
-- =============================================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_families ON public.families;
CREATE POLICY family_rls_families ON public.families FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR lifexp_same_family(id)
    OR lifexp_invite_family_match(id)
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_same_family(id)
    OR lifexp_onboarding_write_allowed()
  );

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_parent_profiles ON public.parent_profiles;
CREATE POLICY family_rls_parent_profiles ON public.parent_profiles FOR ALL TO anon, authenticated
  USING (
    lifexp_parent_visible(id)
    OR (
      lifexp_session_is_family_admin()
      AND NOT lifexp_parent_already_in_any_family(id)
    )
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_onboarding_write_allowed()
    OR (
      lifexp_session_is_valid()
      AND lifexp_session_member_kind() = 'parent'
      AND id = lifexp_session_member_id()
    )
    OR (
      lifexp_session_is_valid()
      AND lifexp_parent_in_family(id, lifexp_session_family_id())
    )
    OR lifexp_session_is_family_admin()
  );

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_members ON public.family_members;
CREATE POLICY family_rls_family_members ON public.family_members FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR lifexp_invite_family_match(family_id)
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR lifexp_session_is_family_admin()
    OR (
      lifexp_onboarding_mode() = 'create'
      AND NOT lifexp_parent_already_in_any_family(parent_id)
    )
    OR (
      lifexp_onboarding_mode() = 'join'
      AND lifexp_invite_family_match(family_id)
      AND NOT lifexp_parent_already_in_any_family(parent_id)
    )
  );

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_child_profiles ON public.child_profiles;
CREATE POLICY family_rls_child_profiles ON public.child_profiles FOR ALL TO anon, authenticated
  USING (lifexp_child_visible(family_id, id))
  WITH CHECK (
    lifexp_is_service_role()
    OR lifexp_same_family(family_id)
    OR lifexp_onboarding_write_allowed()
  );

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_quests ON public.quests;
CREATE POLICY family_rls_quests ON public.quests FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id) OR lifexp_onboarding_write_allowed());

ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_quest_completions ON public.quest_completions;
CREATE POLICY family_rls_quest_completions ON public.quest_completions FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.daily_xp_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_daily_xp_entries ON public.daily_xp_entries;
CREATE POLICY family_rls_daily_xp_entries ON public.daily_xp_entries FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_rewards ON public.rewards;
CREATE POLICY family_rls_rewards ON public.rewards FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_reward_redemptions ON public.reward_redemptions;
CREATE POLICY family_rls_reward_redemptions ON public.reward_redemptions FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_challenges ON public.family_challenges;
CREATE POLICY family_rls_family_challenges ON public.family_challenges FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_challenge_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_challenge_progress ON public.family_challenge_progress;
CREATE POLICY family_rls_family_challenge_progress ON public.family_challenge_progress FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.quest_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_quest_assignments ON public.quest_assignments;
CREATE POLICY family_rls_quest_assignments ON public.quest_assignments FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_assignments.quest_id
        AND lifexp_same_family(q.family_id)
    )
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_assignments.quest_id
        AND lifexp_same_family(q.family_id)
    )
  );

ALTER TABLE public.quest_completion_assignee_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_quest_completion_assignee_photos ON public.quest_completion_assignee_photos;
CREATE POLICY family_rls_quest_completion_assignee_photos ON public.quest_completion_assignee_photos FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.quest_completion_creator_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_quest_completion_creator_reactions ON public.quest_completion_creator_reactions;
CREATE POLICY family_rls_quest_completion_creator_reactions ON public.quest_completion_creator_reactions FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.recurring_quest_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_recurring_quest_templates ON public.recurring_quest_templates;
CREATE POLICY family_rls_recurring_quest_templates ON public.recurring_quest_templates FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.recurring_quest_template_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_recurring_quest_template_assignments ON public.recurring_quest_template_assignments;
CREATE POLICY family_rls_recurring_quest_template_assignments ON public.recurring_quest_template_assignments FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.recurring_quest_templates t
      WHERE t.id = recurring_quest_template_assignments.template_id
        AND lifexp_same_family(t.family_id)
    )
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.recurring_quest_templates t
      WHERE t.id = recurring_quest_template_assignments.template_id
        AND lifexp_same_family(t.family_id)
    )
  );

ALTER TABLE public.member_personal_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_member_personal_goals ON public.member_personal_goals;
CREATE POLICY family_rls_member_personal_goals ON public.member_personal_goals FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.member_personal_goal_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_member_personal_goal_tracking ON public.member_personal_goal_tracking;
CREATE POLICY family_rls_member_personal_goal_tracking ON public.member_personal_goal_tracking FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_personal_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_personal_goals ON public.family_personal_goals;
CREATE POLICY family_rls_family_personal_goals ON public.family_personal_goals FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_personal_goal_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_personal_goal_tracking ON public.family_personal_goal_tracking;
CREATE POLICY family_rls_family_personal_goal_tracking ON public.family_personal_goal_tracking FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_daily_xp_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_daily_xp_history ON public.family_daily_xp_history;
CREATE POLICY family_rls_family_daily_xp_history ON public.family_daily_xp_history FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.member_daily_xp_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_member_daily_xp_history ON public.member_daily_xp_history;
CREATE POLICY family_rls_member_daily_xp_history ON public.member_daily_xp_history FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.family_xp_goal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_family_xp_goal_periods ON public.family_xp_goal_periods;
CREATE POLICY family_rls_family_xp_goal_periods ON public.family_xp_goal_periods FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.member_xp_goal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_member_xp_goal_periods ON public.member_xp_goal_periods;
CREATE POLICY family_rls_member_xp_goal_periods ON public.member_xp_goal_periods FOR ALL TO anon, authenticated
  USING (lifexp_same_family(family_id))
  WITH CHECK (lifexp_same_family(family_id));

ALTER TABLE public.member_xp_goal_daily_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS family_rls_member_xp_goal_daily_progress ON public.member_xp_goal_daily_progress;
CREATE POLICY family_rls_member_xp_goal_daily_progress ON public.member_xp_goal_daily_progress FOR ALL TO anon, authenticated
  USING (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1
      FROM public.member_xp_goal_periods p
      WHERE p.id = member_xp_goal_daily_progress.goal_period_id
        AND lifexp_same_family(p.family_id)
    )
  )
  WITH CHECK (
    lifexp_is_service_role()
    OR EXISTS (
      SELECT 1
      FROM public.member_xp_goal_periods p
      WHERE p.id = member_xp_goal_daily_progress.goal_period_id
        AND lifexp_same_family(p.family_id)
    )
  );

-- =============================================================================
-- 4) Storage (quest-completion-photos/{family_id}/…)
-- =============================================================================

DROP POLICY IF EXISTS family_rls_quest_completion_photos ON storage.objects;
CREATE POLICY family_rls_quest_completion_photos ON storage.objects FOR ALL TO anon, authenticated
  USING (
    bucket_id = 'quest-completion-photos'
    AND (
      lifexp_is_service_role()
      OR (
        lifexp_session_is_valid()
        AND (storage.foldername(name))[1] = lifexp_session_family_id()::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'quest-completion-photos'
    AND (
      lifexp_is_service_role()
      OR (
        lifexp_session_is_valid()
        AND (storage.foldername(name))[1] = lifexp_session_family_id()::text
      )
    )
  );

NOTIFY pgrst, 'reload schema';
