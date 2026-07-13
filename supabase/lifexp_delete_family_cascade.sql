-- Atomisches Familien-Löschen (Service Role / API) — idempotent ausführbar.
-- Im Supabase SQL Editor ausführen.

CREATE OR REPLACE FUNCTION public.lifexp_delete_family_cascade(p_family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  IF p_family_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = p_family_id) THEN
    RETURN false;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _lifexp_delete_parents (parent_id uuid PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _lifexp_delete_parents;

  INSERT INTO _lifexp_delete_parents (parent_id)
  SELECT DISTINCT fm.parent_id
  FROM public.family_members fm
  WHERE fm.family_id = p_family_id
    AND fm.parent_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  DELETE FROM public.quest_completion_creator_reactions WHERE family_id = p_family_id;
  DELETE FROM public.quest_completion_assignee_photos WHERE family_id = p_family_id;
  DELETE FROM public.quest_assignments WHERE family_id = p_family_id;
  DELETE FROM public.reward_redemptions WHERE family_id = p_family_id;
  DELETE FROM public.member_personal_goal_tracking WHERE family_id = p_family_id;
  DELETE FROM public.member_personal_goals WHERE family_id = p_family_id;
  DELETE FROM public.family_personal_goal_tracking WHERE family_id = p_family_id;
  DELETE FROM public.family_personal_goals WHERE family_id = p_family_id;
  DELETE FROM public.member_xp_goal_daily_progress WHERE family_id = p_family_id;
  DELETE FROM public.member_xp_goal_periods WHERE family_id = p_family_id;
  DELETE FROM public.family_xp_goal_periods WHERE family_id = p_family_id;
  DELETE FROM public.member_daily_xp_history WHERE family_id = p_family_id;
  DELETE FROM public.family_daily_xp_history WHERE family_id = p_family_id;
  DELETE FROM public.family_challenge_progress WHERE family_id = p_family_id;
  DELETE FROM public.quest_completions WHERE family_id = p_family_id;
  DELETE FROM public.daily_xp_entries WHERE family_id = p_family_id;
  DELETE FROM public.recurring_quest_template_assignments WHERE family_id = p_family_id;
  DELETE FROM public.recurring_quest_templates WHERE family_id = p_family_id;
  DELETE FROM public.family_challenges WHERE family_id = p_family_id;
  DELETE FROM public.rewards WHERE family_id = p_family_id;
  DELETE FROM public.quests WHERE family_id = p_family_id;
  DELETE FROM public.child_profiles WHERE family_id = p_family_id;
  DELETE FROM public.family_members WHERE family_id = p_family_id;
  DELETE FROM public.families WHERE id = p_family_id;

  FOR v_parent_id IN SELECT parent_id FROM _lifexp_delete_parents LOOP
    DELETE FROM public.parent_profiles WHERE id = v_parent_id;
  END LOOP;

  RETURN NOT EXISTS (SELECT 1 FROM public.families WHERE id = p_family_id);
END;
$$;

REVOKE ALL ON FUNCTION public.lifexp_delete_family_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lifexp_delete_family_cascade(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
