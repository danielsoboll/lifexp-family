-- LifeXP Family — persönliche Ziele (Text + Symbol, XP durch Admin)
-- Einmal im Supabase SQL Editor ausführen (nach family_xp_goals_migration.sql).

CREATE TABLE IF NOT EXISTS public.member_personal_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_kind text NOT NULL CHECK (member_kind IN ('parent', 'child')),
  member_id uuid NOT NULL,
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

CREATE UNIQUE INDEX IF NOT EXISTS member_personal_goals_sort_uidx
  ON public.member_personal_goals (family_id, member_kind, member_id, sort_order);

CREATE INDEX IF NOT EXISTS member_personal_goals_member_idx
  ON public.member_personal_goals (family_id, member_kind, member_id, sort_order ASC);

COMMENT ON TABLE public.member_personal_goals IS
  'Vom Mitglied definierte Ziele (Priorität sort_order). XP erst nach Admin-Vergabe.';

CREATE TABLE IF NOT EXISTS public.member_personal_goal_tracking (
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  member_kind text NOT NULL CHECK (member_kind IN ('parent', 'child')),
  member_id uuid NOT NULL,
  tracking_started_at date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, member_kind, member_id)
);

COMMENT ON TABLE public.member_personal_goal_tracking IS
  'Ab wann Tages-XP auf die persönliche Ziel-Warteschlange angerechnet wird.';

-- =============================================================================
-- Sync: Tages-XP auf Ziel-Warteschlange verteilen (Überschuss → nächstes Ziel)
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
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_tracking date;
  v_total integer := 0;
  v_remaining integer := 0;
  g record;
BEGIN
  IF p_family_id IS NULL OR p_member_id IS NULL OR p_member_kind IS NULL THEN
    RETURN;
  END IF;

  SELECT tracking_started_at INTO v_tracking
  FROM public.member_personal_goal_tracking
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id;

  IF v_tracking IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(daily_xp), 0)::integer
  INTO v_total
  FROM public.member_daily_xp_history
  WHERE family_id = p_family_id
    AND member_kind = p_member_kind
    AND member_id = p_member_id
    AND score_date >= v_tracking
    AND score_date <= v_today;

  v_remaining := v_total;

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

  -- Ziele hinter dem aktiven auf 0 setzen (falls XP-Pool aufgebraucht)
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

ALTER TABLE public.member_personal_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_personal_goal_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_personal_goals_anon_all ON public.member_personal_goals;
CREATE POLICY member_personal_goals_anon_all
  ON public.member_personal_goals FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_personal_goal_tracking_anon_all ON public.member_personal_goal_tracking;
CREATE POLICY member_personal_goal_tracking_anon_all
  ON public.member_personal_goal_tracking FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
