-- LifeXP Family — Belohnungs-XP ab Eintrag (Baseline) + Einlösen (Redeem)
-- Einmal im Supabase SQL Editor ausführen (nach member_personal_goals_migration.sql).

ALTER TABLE public.member_personal_goal_tracking
  ADD COLUMN IF NOT EXISTS xp_baseline_total integer NOT NULL DEFAULT 0 CHECK (xp_baseline_total >= 0),
  ADD COLUMN IF NOT EXISTS xp_consumed_total integer NOT NULL DEFAULT 0 CHECK (xp_consumed_total >= 0);

COMMENT ON COLUMN public.member_personal_goal_tracking.xp_baseline_total IS
  'Gesamt-XP des Mitglieds beim Start der Belohnungs-Zählung (wird von verfügbarem Pool abgezogen).';
COMMENT ON COLUMN public.member_personal_goal_tracking.xp_consumed_total IS
  'Summe bereits eingelöster Belohnungs-XP (Ziele nach „Erledigt“).';

-- Bestehende Tracking-Zeilen: Baseline = XP vor tracking_started_at
UPDATE public.member_personal_goal_tracking t
SET xp_baseline_total = COALESCE(
  (
    SELECT SUM(d.daily_xp)::integer
    FROM public.member_daily_xp_history d
    WHERE d.family_id = t.family_id
      AND d.member_kind = t.member_kind
      AND d.member_id = t.member_id
      AND d.score_date < t.tracking_started_at
  ),
  0
)
WHERE xp_baseline_total = 0;

-- =============================================================================
-- Sync: verfügbare XP = Gesamt-XP − Baseline − eingelöst; Warteschlange verteilen
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_member_personal_goals_progress(
  p_family_id uuid,
  p_member_kind text,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline integer := 0;
  v_consumed integer := 0;
  v_total integer := 0;
  v_remaining integer := 0;
  g record;
BEGIN
  IF p_family_id IS NULL OR p_member_id IS NULL OR p_member_kind IS NULL THEN
    RETURN;
  END IF;

  SELECT xp_baseline_total, xp_consumed_total
  INTO v_baseline, v_consumed
  FROM public.member_personal_goal_tracking
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(daily_xp), 0)::integer
  INTO v_total
  FROM public.member_daily_xp_history
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id;

  v_remaining := GREATEST(v_total - v_baseline - v_consumed, 0);

  FOR g IN
    SELECT id, target_xp, completed_at
    FROM public.member_personal_goals
    WHERE family_id = p_family_id
      AND member_kind = p_member_kind
      AND member_id = p_member_id
      AND target_xp IS NOT NULL
    ORDER BY sort_order ASC
  LOOP
    IF v_remaining >= g.target_xp THEN
      UPDATE public.member_personal_goals
      SET
        progress_xp = g.target_xp,
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
      WHERE id = g.id;
      v_remaining := v_remaining - g.target_xp;
    ELSE
      UPDATE public.member_personal_goals
      SET
        progress_xp = v_remaining,
        completed_at = NULL,
        updated_at = now()
      WHERE id = g.id;
      v_remaining := 0;
      EXIT;
    END IF;
  END LOOP;

  IF v_remaining = 0 THEN
    UPDATE public.member_personal_goals mpg
    SET progress_xp = 0, completed_at = NULL, updated_at = now()
    WHERE mpg.family_id = p_family_id
      AND mpg.member_kind = p_member_kind
      AND mpg.member_id = p_member_id
      AND mpg.target_xp IS NOT NULL
      AND mpg.sort_order > (
        SELECT COALESCE(MAX(sub.sort_order), 0)
        FROM public.member_personal_goals sub
        WHERE sub.family_id = p_family_id
          AND sub.member_kind = p_member_kind
          AND sub.member_id = p_member_id
          AND sub.target_xp IS NOT NULL
          AND (sub.completed_at IS NOT NULL OR sub.progress_xp > 0)
      );
  END IF;
END;
$$;

-- =============================================================================
-- Belohnung einlösen: nur wenn Ziel erreicht; Überschuss bleibt für nächstes Ziel
-- =============================================================================

CREATE OR REPLACE FUNCTION public.redeem_member_personal_goal(p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  r record;
  v_next_order integer := 1;
BEGIN
  IF p_goal_id IS NULL THEN
    RAISE EXCEPTION 'goal_id fehlt';
  END IF;

  SELECT id, family_id, member_kind, member_id, target_xp, progress_xp, completed_at, sort_order
  INTO g
  FROM public.member_personal_goals
  WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Belohnung nicht gefunden';
  END IF;

  IF g.target_xp IS NULL OR g.target_xp <= 0 THEN
    RAISE EXCEPTION 'Belohnung hat noch kein XP-Ziel';
  END IF;

  IF g.completed_at IS NULL OR g.progress_xp < g.target_xp THEN
    RAISE EXCEPTION 'Belohnung ist noch nicht erreicht';
  END IF;

  UPDATE public.member_personal_goal_tracking
  SET
    xp_consumed_total = xp_consumed_total + g.target_xp,
    updated_at = now()
  WHERE family_id = g.family_id
    AND member_kind = g.member_kind
    AND member_id = g.member_id;

  DELETE FROM public.member_personal_goals WHERE id = g.id;

  FOR r IN
    SELECT id
    FROM public.member_personal_goals
    WHERE family_id = g.family_id
      AND member_kind = g.member_kind
      AND member_id = g.member_id
    ORDER BY sort_order ASC, created_at ASC
  LOOP
    UPDATE public.member_personal_goals
    SET sort_order = v_next_order, updated_at = now()
    WHERE id = r.id;
    v_next_order := v_next_order + 1;
  END LOOP;

  PERFORM public.sync_member_personal_goals_progress(g.family_id, g.member_kind, g.member_id);
END;
$$;

NOTIFY pgrst, 'reload schema';
