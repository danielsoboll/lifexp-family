-- Patch: Tages-Stand Mitglieder-Ziele + Ziel 50 XP (falls family_xp_goals_migration schon lief)
-- Einmal im Supabase SQL Editor ausführen.

CREATE TABLE IF NOT EXISTS public.member_xp_goal_daily_progress (
  goal_period_id uuid NOT NULL REFERENCES public.member_xp_goal_periods (id) ON DELETE CASCADE,
  score_date date NOT NULL,
  day_xp integer NOT NULL DEFAULT 0 CHECK (day_xp >= 0),
  cumulative_xp integer NOT NULL DEFAULT 0 CHECK (cumulative_xp >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (goal_period_id, score_date)
);

CREATE INDEX IF NOT EXISTS member_xp_goal_daily_progress_date_idx
  ON public.member_xp_goal_daily_progress (goal_period_id, score_date DESC);

ALTER TABLE public.member_xp_goal_daily_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_xp_goal_daily_progress_anon_all ON public.member_xp_goal_daily_progress;
CREATE POLICY member_xp_goal_daily_progress_anon_all
  ON public.member_xp_goal_daily_progress FOR ALL TO anon USING (true) WITH CHECK (true);

-- Aktive Mitglieder-Ziele auf 50 XP (Platzhalter bis individuelle Ziele kommen)
UPDATE public.member_xp_goal_periods
SET target_xp = 50, updated_at = now()
WHERE ended_at IS NULL AND target_xp = 60;

CREATE OR REPLACE FUNCTION public.sync_member_xp_goal_progress(
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
  v_period public.member_xp_goal_periods%ROWTYPE;
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_sum integer := 0;
BEGIN
  IF p_family_id IS NULL OR p_member_id IS NULL OR p_member_kind IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_period
  FROM public.member_xp_goal_periods
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id
    AND ended_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.member_xp_goal_periods (
      family_id, member_kind, member_id, goal_name, target_xp, started_at
    )
    VALUES (p_family_id, p_member_kind, p_member_id, 'Persönliches Ziel', 50, v_today)
    RETURNING * INTO v_period;
  END IF;

  SELECT COALESCE(SUM(daily_xp), 0)::integer
  INTO v_sum
  FROM public.member_daily_xp_history
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id
    AND score_date >= v_period.started_at
    AND score_date <= v_today;

  UPDATE public.member_xp_goal_periods
  SET progress_xp = v_sum, updated_at = now()
  WHERE id = v_period.id;

  INSERT INTO public.member_xp_goal_daily_progress (
    goal_period_id, score_date, day_xp, cumulative_xp, updated_at
  )
  SELECT
    v_period.id,
    ranked.score_date,
    ranked.day_xp,
    ranked.cumulative_xp,
    now()
  FROM (
    SELECT
      h.score_date,
      h.daily_xp AS day_xp,
      SUM(h.daily_xp) OVER (ORDER BY h.score_date)::integer AS cumulative_xp
    FROM public.member_daily_xp_history h
    WHERE h.family_id = p_family_id
      AND h.member_kind = p_member_kind
      AND h.member_id = p_member_id
      AND h.score_date >= v_period.started_at
      AND h.score_date <= v_today
  ) ranked
  ON CONFLICT (goal_period_id, score_date) DO UPDATE SET
    day_xp = EXCLUDED.day_xp,
    cumulative_xp = EXCLUDED.cumulative_xp,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM public.member_xp_goal_daily_progress d
  WHERE d.goal_period_id = v_period.id
    AND d.score_date > v_today;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_member_xp_goal_period(
  p_family_id uuid,
  p_member_kind text,
  p_member_id uuid,
  p_goal_name text DEFAULT 'Persönliches Ziel',
  p_target_xp integer DEFAULT 50
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_new_id uuid;
BEGIN
  UPDATE public.member_xp_goal_periods
  SET ended_at = v_today, updated_at = now()
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id
    AND ended_at IS NULL;

  INSERT INTO public.member_xp_goal_periods (
    family_id, member_kind, member_id, goal_name, target_xp, started_at
  )
  VALUES (
    p_family_id,
    p_member_kind,
    p_member_id,
    COALESCE(NULLIF(trim(p_goal_name), ''), 'Persönliches Ziel'),
    GREATEST(1, COALESCE(p_target_xp, 50)),
    v_today
  )
  RETURNING id INTO v_new_id;

  PERFORM public.sync_member_xp_goal_progress(p_family_id, p_member_kind, p_member_id);
  RETURN v_new_id;
END;
$$;

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN SELECT id FROM public.families ORDER BY created_at LOOP
    PERFORM public.sync_all_xp_goals_for_family(f.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
