-- LifeXP Family — Tages-XP-Historie (LifeXP daily_scores-Pattern)
-- Einmal im Supabase SQL Editor ausführen.
--
-- Schreibt Snapshots pro Familie und pro Mitglied in Historien-Tabellen.
-- Trigger halten die Tabellen bei XP-Änderungen aktuell; Backfill am Ende.

-- =============================================================================
-- 1) Tabellen
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.family_daily_xp_history (
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  score_date date NOT NULL,
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  member_count smallint NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  target_xp integer NOT NULL DEFAULT 0 CHECK (target_xp >= 0),
  day_xp_ok text NOT NULL DEFAULT 'no' CHECK (day_xp_ok IN ('yes', 'no')),
  updated_at date NOT NULL DEFAULT ((timezone('Europe/Berlin', now()))::date),
  PRIMARY KEY (family_id, score_date)
);

CREATE INDEX IF NOT EXISTS family_daily_xp_history_family_date_idx
  ON public.family_daily_xp_history (family_id, score_date DESC);

CREATE TABLE IF NOT EXISTS public.member_daily_xp_history (
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  score_date date NOT NULL,
  member_kind text NOT NULL CHECK (member_kind IN ('parent', 'child')),
  member_id uuid NOT NULL,
  daily_xp integer NOT NULL DEFAULT 0 CHECK (daily_xp >= 0),
  day_xp_ok text NOT NULL DEFAULT 'no' CHECK (day_xp_ok IN ('yes', 'no')),
  updated_at date NOT NULL DEFAULT ((timezone('Europe/Berlin', now()))::date),
  PRIMARY KEY (family_id, score_date, member_kind, member_id)
);

CREATE INDEX IF NOT EXISTS member_daily_xp_history_member_date_idx
  ON public.member_daily_xp_history (family_id, member_kind, member_id, score_date DESC);

CREATE INDEX IF NOT EXISTS member_daily_xp_history_family_date_idx
  ON public.member_daily_xp_history (family_id, score_date DESC);

-- =============================================================================
-- 2) Sync-Funktion (aus daily_xp_entries + quest_completions)
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
BEGIN
  IF p_family_id IS NULL OR p_score_date IS NULL THEN
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

  -- Eltern-Zeilen (alle Familienmitglieder, XP aus Quests + Einträgen)
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

  -- Kinder-Zeilen
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
-- 3) Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_sync_family_xp_history_from_xp_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.entry_date);
    RETURN OLD;
  END IF;

  PERFORM public.sync_family_xp_history(NEW.family_id, NEW.entry_date);

  IF TG_OP = 'UPDATE' AND (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.entry_date IS DISTINCT FROM NEW.entry_date) THEN
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.entry_date);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_xp_entries_sync_xp_history ON public.daily_xp_entries;
CREATE TRIGGER daily_xp_entries_sync_xp_history
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_xp_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_family_xp_history_from_xp_entry();

CREATE OR REPLACE FUNCTION public.trg_sync_family_xp_history_from_quest_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.completed_on);
    RETURN OLD;
  END IF;

  PERFORM public.sync_family_xp_history(NEW.family_id, NEW.completed_on);

  IF TG_OP = 'UPDATE' AND (OLD.family_id IS DISTINCT FROM NEW.family_id OR OLD.completed_on IS DISTINCT FROM NEW.completed_on) THEN
    PERFORM public.sync_family_xp_history(OLD.family_id, OLD.completed_on);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quest_completions_sync_xp_history ON public.quest_completions;
CREATE TRIGGER quest_completions_sync_xp_history
  AFTER INSERT OR UPDATE OR DELETE ON public.quest_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_family_xp_history_from_quest_completion();

-- =============================================================================
-- 4) RLS (anon wie übrige Family-Tabellen)
-- =============================================================================

ALTER TABLE public.family_daily_xp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_daily_xp_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_daily_xp_history_anon_all ON public.family_daily_xp_history;
CREATE POLICY family_daily_xp_history_anon_all
  ON public.family_daily_xp_history FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS member_daily_xp_history_anon_all ON public.member_daily_xp_history;
CREATE POLICY member_daily_xp_history_anon_all
  ON public.member_daily_xp_history FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================================================================
-- 5) Backfill bestehender Tage
-- =============================================================================

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT DISTINCT family_id, score_date
    FROM (
      SELECT family_id, entry_date AS score_date FROM public.daily_xp_entries
      UNION
      SELECT family_id, completed_on AS score_date FROM public.quest_completions
    ) days
    WHERE family_id IS NOT NULL AND score_date IS NOT NULL
    ORDER BY family_id, score_date
  LOOP
    PERFORM public.sync_family_xp_history(rec.family_id, rec.score_date);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
