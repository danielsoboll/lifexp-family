-- LifeXP Family — Familienziel (Text + Symbol, XP durch Admin, gemeinsamer Fortschritt)
-- Einmal im Supabase SQL Editor ausführen (nach member_personal_goals_migration.sql).

CREATE TABLE IF NOT EXISTS public.family_personal_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0 AND char_length(trim(title)) <= 120),
  symbol_id text NOT NULL,
  sort_order integer NOT NULL CHECK (sort_order >= 1),
  target_xp integer CHECK (target_xp IS NULL OR (target_xp >= 1 AND target_xp <= 999)),
  xp_locked_at timestamptz,
  progress_xp integer NOT NULL DEFAULT 0 CHECK (progress_xp >= 0),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS family_personal_goals_sort_uidx
  ON public.family_personal_goals (family_id, sort_order);

CREATE INDEX IF NOT EXISTS family_personal_goals_family_idx
  ON public.family_personal_goals (family_id, sort_order ASC);

COMMENT ON TABLE public.family_personal_goals IS
  'Familien-Ziele (Priorität sort_order). XP erst nach Admin-Vergabe. Fortschritt aus gesamter Familien-XP.';

CREATE TABLE IF NOT EXISTS public.family_personal_goal_tracking (
  family_id uuid PRIMARY KEY REFERENCES public.families (id) ON DELETE CASCADE,
  tracking_started_at date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_personal_goal_tracking IS
  'Ab wann Tages-XP der ganzen Familie auf die Familienziel-Warteschlange angerechnet wird.';

-- =============================================================================
-- Sync: Familien-Tages-XP auf Ziel-Warteschlange verteilen
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_family_personal_goals_progress(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_tracking date;
  v_total integer := 0;
  v_remaining integer := 0;
  g record;
BEGIN
  IF p_family_id IS NULL THEN
    RETURN;
  END IF;

  SELECT tracking_started_at INTO v_tracking
  FROM public.family_personal_goal_tracking
  WHERE family_id = p_family_id;

  IF v_tracking IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(daily_xp), 0)::integer
  INTO v_total
  FROM public.member_daily_xp_history
  WHERE family_id = p_family_id
    AND score_date >= v_tracking
    AND score_date <= v_today;

  v_remaining := v_total;

  FOR g IN
    SELECT id, target_xp, completed_at
    FROM public.family_personal_goals
    WHERE family_id = p_family_id
      AND target_xp IS NOT NULL
    ORDER BY sort_order ASC
  LOOP
    IF v_remaining >= g.target_xp THEN
      UPDATE public.family_personal_goals
      SET
        progress_xp = g.target_xp,
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
      WHERE id = g.id;
      v_remaining := v_remaining - g.target_xp;
    ELSE
      UPDATE public.family_personal_goals
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
    UPDATE public.family_personal_goals fpg
    SET progress_xp = 0, completed_at = NULL, updated_at = now()
    WHERE fpg.family_id = p_family_id
      AND fpg.target_xp IS NOT NULL
      AND fpg.sort_order > (
        SELECT COALESCE(MAX(sub.sort_order), 0)
        FROM public.family_personal_goals sub
        WHERE sub.family_id = p_family_id
          AND sub.target_xp IS NOT NULL
          AND (sub.completed_at IS NOT NULL OR sub.progress_xp > 0)
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_all_personal_goals_for_family(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_family_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.sync_family_personal_goals_progress(p_family_id);

  FOR r IN
    SELECT member_kind, member_id
    FROM public.member_personal_goal_tracking
    WHERE family_id = p_family_id
  LOOP
    PERFORM public.sync_member_personal_goals_progress(p_family_id, r.member_kind, r.member_id);
  END LOOP;
END;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.family_personal_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_personal_goal_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_personal_goals_anon_all ON public.family_personal_goals;
CREATE POLICY family_personal_goals_anon_all
  ON public.family_personal_goals FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS family_personal_goal_tracking_anon_all ON public.family_personal_goal_tracking;
CREATE POLICY family_personal_goal_tracking_anon_all
  ON public.family_personal_goal_tracking FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
