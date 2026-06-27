-- LifeXP Family — XP-Ziel-Perioden (Familie + Mitglieder)
-- Einmal im Supabase SQL Editor ausführen (nach family_xp_history_migration.sql).
--
-- Jede Periode zählt progress_xp ab started_at bis reset (ended_at gesetzt).
-- goal_name wird gespeichert, aber in der UI vorerst nicht angezeigt.
-- Später: neues Ziel setzen / reset_family_xp_goal_period aufrufen.

-- =============================================================================
-- 1) Tabellen
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.family_xp_goal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  goal_name text NOT NULL DEFAULT '',
  target_xp integer NOT NULL CHECK (target_xp > 0),
  progress_xp integer NOT NULL DEFAULT 0 CHECK (progress_xp >= 0),
  started_at date NOT NULL DEFAULT ((timezone('Europe/Berlin', now()))::date),
  ended_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS family_xp_goal_periods_one_active_uidx
  ON public.family_xp_goal_periods (family_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS family_xp_goal_periods_family_started_idx
  ON public.family_xp_goal_periods (family_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.member_xp_goal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_kind text NOT NULL CHECK (member_kind IN ('parent', 'child')),
  member_id uuid NOT NULL,
  goal_name text NOT NULL DEFAULT '',
  target_xp integer NOT NULL CHECK (target_xp > 0),
  progress_xp integer NOT NULL DEFAULT 0 CHECK (progress_xp >= 0),
  started_at date NOT NULL DEFAULT ((timezone('Europe/Berlin', now()))::date),
  ended_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS member_xp_goal_periods_one_active_uidx
  ON public.member_xp_goal_periods (family_id, member_kind, member_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS member_xp_goal_periods_member_started_idx
  ON public.member_xp_goal_periods (family_id, member_kind, member_id, started_at DESC);

COMMENT ON TABLE public.family_xp_goal_periods IS
  'Familien-XP-Ziele in Perioden — nach Reset neue Zeile, progress_xp ab started_at.';
COMMENT ON COLUMN public.family_xp_goal_periods.goal_name IS
  'Interner Zielname (UI zeigt ihn vorerst nicht).';
COMMENT ON TABLE public.member_xp_goal_periods IS
  'Persönliche XP-Ziel-Perioden pro Familienmitglied.';

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

COMMENT ON TABLE public.member_xp_goal_daily_progress IS
  'Tages-Stand pro Mitglieder-Zielperiode: day_xp + kumulierte cumulative_xp ab Periodenstart.';

-- =============================================================================
-- 2) Sync progress aus Tages-Historie
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_family_xp_goal_progress(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.family_xp_goal_periods%ROWTYPE;
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_sum integer := 0;
BEGIN
  IF p_family_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_period
  FROM public.family_xp_goal_periods
  WHERE family_id = p_family_id AND ended_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.family_xp_goal_periods (
      family_id, goal_name, target_xp, started_at
    )
    VALUES (p_family_id, 'Familienziel', 120, v_today)
    RETURNING * INTO v_period;
  END IF;

  SELECT COALESCE(SUM(total_xp), 0)::integer
  INTO v_sum
  FROM public.family_daily_xp_history
  WHERE family_id = p_family_id
    AND score_date >= v_period.started_at
    AND score_date <= v_today;

  UPDATE public.family_xp_goal_periods
  SET progress_xp = v_sum, updated_at = now()
  WHERE id = v_period.id;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.sync_all_xp_goals_for_family(p_family_id uuid)
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

  PERFORM public.sync_family_xp_goal_progress(p_family_id);

  FOR r IN
    SELECT fm.parent_id AS member_id, 'parent'::text AS member_kind
    FROM public.family_members fm
    WHERE fm.family_id = p_family_id AND fm.parent_id IS NOT NULL
    UNION ALL
    SELECT cp.id AS member_id, 'child'::text AS member_kind
    FROM public.child_profiles cp
    WHERE cp.family_id = p_family_id AND cp.is_active = true
  LOOP
    PERFORM public.sync_member_xp_goal_progress(p_family_id, r.member_kind, r.member_id);
  END LOOP;
END;
$$;

-- Familie: aktive Periode beenden, neue starten (für spätere UI)
CREATE OR REPLACE FUNCTION public.reset_family_xp_goal_period(
  p_family_id uuid,
  p_goal_name text DEFAULT 'Familienziel',
  p_target_xp integer DEFAULT 120
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
  UPDATE public.family_xp_goal_periods
  SET ended_at = v_today, updated_at = now()
  WHERE family_id = p_family_id AND ended_at IS NULL;

  INSERT INTO public.family_xp_goal_periods (
    family_id, goal_name, target_xp, started_at
  )
  VALUES (
    p_family_id,
    COALESCE(NULLIF(trim(p_goal_name), ''), 'Familienziel'),
    GREATEST(1, COALESCE(p_target_xp, 120)),
    v_today
  )
  RETURNING id INTO v_new_id;

  PERFORM public.sync_family_xp_goal_progress(p_family_id);
  RETURN v_new_id;
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

-- =============================================================================
-- 3) RLS
-- =============================================================================

ALTER TABLE public.family_xp_goal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_xp_goal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_xp_goal_daily_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_xp_goal_periods_anon_all ON public.family_xp_goal_periods;
CREATE POLICY family_xp_goal_periods_anon_all
  ON public.family_xp_goal_periods FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_xp_goal_periods_anon_all ON public.member_xp_goal_periods;
CREATE POLICY member_xp_goal_periods_anon_all
  ON public.member_xp_goal_periods FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_xp_goal_daily_progress_anon_all ON public.member_xp_goal_daily_progress;
CREATE POLICY member_xp_goal_daily_progress_anon_all
  ON public.member_xp_goal_daily_progress FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================================================================
-- 4) Backfill aktive Perioden + Progress
-- =============================================================================

DO $$
DECLARE
  f record;
  m record;
  v_start date;
BEGIN
  FOR f IN SELECT id, created_at FROM public.families ORDER BY created_at LOOP
    v_start := COALESCE(
      (timezone('Europe/Berlin', f.created_at))::date,
      (timezone('Europe/Berlin', now()))::date
    );

    IF NOT EXISTS (
      SELECT 1 FROM public.family_xp_goal_periods
      WHERE family_id = f.id AND ended_at IS NULL
    ) THEN
      INSERT INTO public.family_xp_goal_periods (
        family_id, goal_name, target_xp, started_at
      )
      VALUES (f.id, 'Familienziel', 120, v_start);
    END IF;

    FOR m IN
      SELECT fm.parent_id AS member_id, 'parent'::text AS member_kind
      FROM public.family_members fm
      WHERE fm.family_id = f.id AND fm.parent_id IS NOT NULL
      UNION ALL
      SELECT cp.id AS member_id, 'child'::text AS member_kind
      FROM public.child_profiles cp
      WHERE cp.family_id = f.id AND cp.is_active = true
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.member_xp_goal_periods
        WHERE family_id = f.id
          AND member_kind = m.member_kind
          AND member_id = m.member_id
          AND ended_at IS NULL
      ) THEN
        INSERT INTO public.member_xp_goal_periods (
          family_id, member_kind, member_id, goal_name, target_xp, started_at
        )
        VALUES (f.id, m.member_kind, m.member_id, 'Persönliches Ziel', 50, v_start);
      END IF;
    END LOOP;

    PERFORM public.sync_all_xp_goals_for_family(f.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
