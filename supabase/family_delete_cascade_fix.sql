-- Familie löschen: FK-, RLS- und XP-Historie-Fixes
-- Im Supabase SQL Editor ausführen (idempotent — auch nach älterer Version erneut OK).

-- 1) reward_redemptions blockierte rewards beim CASCADE-Löschen (RESTRICT)
ALTER TABLE public.reward_redemptions DROP CONSTRAINT IF EXISTS reward_redemptions_reward_id_fkey;
ALTER TABLE public.reward_redemptions
  ADD CONSTRAINT reward_redemptions_reward_id_fkey
  FOREIGN KEY (reward_id) REFERENCES public.rewards (id) ON DELETE CASCADE;

-- 2) RLS authenticated (falls Client nicht nur anon nutzt)
ALTER TABLE public.member_personal_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_personal_goal_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_personal_goals_authenticated_all ON public.member_personal_goals;
CREATE POLICY member_personal_goals_authenticated_all
  ON public.member_personal_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_personal_goal_tracking_authenticated_all ON public.member_personal_goal_tracking;
CREATE POLICY member_personal_goal_tracking_authenticated_all
  ON public.member_personal_goal_tracking FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) XP-Historie: beim Familien-Löschen keine Sync-Inserts mehr (FK-Fehler)
CREATE OR REPLACE FUNCTION public.sync_family_xp_history(
  p_family_id uuid,
  p_score_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count integer := 0;
  v_target_xp integer := 0;
  v_total_xp integer := 0;
  v_today date := (timezone('Europe/Berlin', now()))::date;
BEGIN
  IF p_family_id IS NULL OR p_score_date IS NULL THEN
    RETURN;
  END IF;

  -- Familie existiert nicht mehr (z. B. CASCADE-Löschung) — nichts schreiben
  IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = p_family_id) THEN
    RETURN;
  END IF;

  SELECT
    COALESCE((
      SELECT count(*)::integer FROM public.family_members fm WHERE fm.family_id = p_family_id
    ), 0)
    + COALESCE((
      SELECT count(*)::integer
      FROM public.child_profiles cp
      WHERE cp.family_id = p_family_id AND cp.is_active = true
    ), 0)
  INTO v_member_count;

  v_target_xp := v_member_count * 20;

  INSERT INTO public.member_daily_xp_history (
    family_id, score_date, member_kind, member_id, daily_xp, day_xp_ok, updated_at
  )
  SELECT
    p_family_id,
    p_score_date,
    'parent',
    fm.parent_id,
    LEAST(
      30,
      GREATEST(
        0,
        COALESCE(qc.quest_xp, 0) + COALESCE(de.entry_xp, 0)
      )
    ),
    CASE
      WHEN COALESCE(qc.quest_xp, 0) + COALESCE(de.entry_xp, 0) >= 20 THEN 'yes'
      ELSE 'no'
    END,
    v_today
  FROM public.family_members fm
  LEFT JOIN (
    SELECT parent_id, sum(xp_awarded)::integer AS quest_xp
    FROM public.quest_completions
    WHERE family_id = p_family_id
      AND completed_on = p_score_date
      AND parent_id IS NOT NULL
      AND creator_confirmed_at IS NOT NULL
    GROUP BY parent_id
  ) qc ON qc.parent_id = fm.parent_id
  LEFT JOIN (
    SELECT parent_id, sum(xp_amount)::integer AS entry_xp
    FROM public.daily_xp_entries
    WHERE family_id = p_family_id
      AND entry_date = p_score_date
      AND parent_id IS NOT NULL
    GROUP BY parent_id
  ) de ON de.parent_id = fm.parent_id
  WHERE fm.family_id = p_family_id
  ON CONFLICT (family_id, score_date, member_kind, member_id) DO UPDATE SET
    daily_xp = EXCLUDED.daily_xp,
    day_xp_ok = EXCLUDED.day_xp_ok,
    updated_at = EXCLUDED.updated_at;

  INSERT INTO public.member_daily_xp_history (
    family_id, score_date, member_kind, member_id, daily_xp, day_xp_ok, updated_at
  )
  SELECT
    p_family_id,
    p_score_date,
    'child',
    cp.id,
    LEAST(30, GREATEST(0, COALESCE(de.entry_xp, 0))),
    CASE WHEN COALESCE(de.entry_xp, 0) >= 20 THEN 'yes' ELSE 'no' END,
    v_today
  FROM public.child_profiles cp
  LEFT JOIN (
    SELECT child_id, sum(xp_amount)::integer AS entry_xp
    FROM public.daily_xp_entries
    WHERE family_id = p_family_id
      AND entry_date = p_score_date
      AND child_id IS NOT NULL
    GROUP BY child_id
  ) de ON de.child_id = cp.id
  WHERE cp.family_id = p_family_id AND cp.is_active = true
  ON CONFLICT (family_id, score_date, member_kind, member_id) DO UPDATE SET
    daily_xp = EXCLUDED.daily_xp,
    day_xp_ok = EXCLUDED.day_xp_ok,
    updated_at = EXCLUDED.updated_at;

  SELECT COALESCE(sum(daily_xp), 0)::integer
  INTO v_total_xp
  FROM public.member_daily_xp_history
  WHERE family_id = p_family_id AND score_date = p_score_date;

  INSERT INTO public.family_daily_xp_history (
    family_id, score_date, total_xp, member_count, target_xp, day_xp_ok, updated_at
  )
  VALUES (
    p_family_id,
    p_score_date,
    v_total_xp,
    v_member_count,
    v_target_xp,
    CASE WHEN v_total_xp >= v_target_xp AND v_target_xp > 0 THEN 'yes' ELSE 'no' END,
    v_today
  )
  ON CONFLICT (family_id, score_date) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    member_count = EXCLUDED.member_count,
    target_xp = EXCLUDED.target_xp,
    day_xp_ok = EXCLUDED.day_xp_ok,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_family_xp_history_from_xp_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = OLD.family_id) THEN
      RETURN OLD;
    END IF;
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.entry_date);
    RETURN OLD;
  END IF;

  PERFORM public.sync_family_xp_history(NEW.family_id, NEW.entry_date);

  IF TG_OP = 'UPDATE' AND (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.entry_date IS DISTINCT FROM NEW.entry_date) THEN
    IF EXISTS (SELECT 1 FROM public.families WHERE id = OLD.family_id) THEN
      PERFORM public.sync_family_xp_history(OLD.family_id, OLD.entry_date);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_family_xp_history_from_quest_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = OLD.family_id) THEN
      RETURN OLD;
    END IF;
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.completed_on);
    RETURN OLD;
  END IF;

  PERFORM public.sync_family_xp_history(NEW.family_id, NEW.completed_on);

  IF TG_OP = 'UPDATE' AND (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.completed_on IS DISTINCT FROM NEW.completed_on) THEN
    IF EXISTS (SELECT 1 FROM public.families WHERE id = OLD.family_id) THEN
      PERFORM public.sync_family_xp_history(OLD.family_id, OLD.completed_on);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
