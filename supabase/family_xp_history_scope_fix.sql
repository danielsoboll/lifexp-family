-- XP-Verlauf: nur ab Familien-Gründung + Quest-Dedupe + sauberes Löschen
-- Einmal im Supabase SQL Editor ausführen (idempotent).

-- =============================================================================
-- 1) Sync: keine Historie vor Familien-Gründungstag (Europe/Berlin)
-- =============================================================================

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
  v_family_created date;
BEGIN
  IF p_family_id IS NULL OR p_score_date IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.families WHERE id = p_family_id) THEN
    RETURN;
  END IF;

  SELECT (timezone('Europe/Berlin', f.created_at))::date
  INTO v_family_created
  FROM public.families f
  WHERE f.id = p_family_id;

  IF v_family_created IS NOT NULL AND p_score_date < v_family_created THEN
    DELETE FROM public.member_daily_xp_history
    WHERE family_id = p_family_id AND score_date = p_score_date;
    DELETE FROM public.family_daily_xp_history
    WHERE family_id = p_family_id AND score_date = p_score_date;
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

-- =============================================================================
-- 2) Quest-XP: keine doppelten daily_xp_entries (Streak-Ausnahme bleibt)
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_child_quest_uidx
  ON public.daily_xp_entries (
    child_id,
    entry_date,
    source,
    COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE child_id IS NOT NULL AND source <> 'streak';

-- =============================================================================
-- 3) Bestehende Verlaufs-Zeilen vor Familien-Gründung entfernen
-- =============================================================================

DELETE FROM public.member_daily_xp_history h
USING public.families f
WHERE h.family_id = f.id
  AND h.score_date < (timezone('Europe/Berlin', f.created_at))::date;

DELETE FROM public.family_daily_xp_history h
USING public.families f
WHERE h.family_id = f.id
  AND h.score_date < (timezone('Europe/Berlin', f.created_at))::date;

NOTIFY pgrst, 'reload schema';
