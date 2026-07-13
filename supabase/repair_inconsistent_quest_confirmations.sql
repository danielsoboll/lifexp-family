-- Repair: inconsistent quest confirmations after RLS failure on child_profiles during XP booking.
--
-- Scenario:
-- - quest_completions was updated (creator_confirmed_at set, xp_awarded set)
-- - inserting into daily_xp_entries failed (trigger tried to update child_profiles.total_xp and hit RLS)
-- => UI shows "confirmed" but XP missing / state feels stuck.
--
-- What this script does (per family):
-- 1) Re-insert missing daily_xp_entries rows for confirmed child quest completions.
-- 2) Resync family XP history for affected days.
-- 3) Recompute child_profiles.total_xp from daily_xp_entries (authoritative), to be safe.
--
-- Run in Supabase SQL editor. Replace :family_id with your family's UUID.

DO $$
DECLARE
  v_family_id uuid := :family_id;
  rec record;
BEGIN
  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'family_id is required';
  END IF;

  -- Ensure we can do the repairs without RLS blocking internal updates.
  PERFORM set_config('row_security', 'off', true);

  -- 1) Insert missing XP entries for confirmed child completions.
  INSERT INTO public.daily_xp_entries (family_id, child_id, entry_date, source, source_id, xp_amount, metadata)
  SELECT
    qc.family_id,
    qc.child_id,
    qc.completed_on,
    'quest',
    qc.quest_id,
    qc.xp_awarded,
    jsonb_build_object(
      'quest_completion_id', qc.id,
      'quest_title', q.title
    )
  FROM public.quest_completions qc
  JOIN public.quests q ON q.id = qc.quest_id
  WHERE qc.family_id = v_family_id
    AND qc.child_id IS NOT NULL
    AND qc.creator_confirmed_at IS NOT NULL
    AND qc.xp_awarded IS NOT NULL
    AND qc.xp_awarded > 0
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_xp_entries de
      WHERE de.family_id = qc.family_id
        AND de.child_id = qc.child_id
        AND de.entry_date = qc.completed_on
        AND de.source = 'quest'
        AND de.source_id = qc.quest_id
    );

  -- 2) Resync family XP history for all dates that have completions/entries.
  FOR rec IN
    SELECT DISTINCT qc.completed_on AS score_date
    FROM public.quest_completions qc
    WHERE qc.family_id = v_family_id
    UNION
    SELECT DISTINCT de.entry_date AS score_date
    FROM public.daily_xp_entries de
    WHERE de.family_id = v_family_id
  LOOP
    PERFORM public.sync_family_xp_history(v_family_id, rec.score_date);
  END LOOP;

  -- 3) Recompute child total_xp from daily_xp_entries.
  UPDATE public.child_profiles cp
  SET total_xp = COALESCE((
    SELECT SUM(de.xp_amount)::integer
    FROM public.daily_xp_entries de
    WHERE de.child_id = cp.id
  ), 0)
  WHERE cp.family_id = v_family_id;
END;
$$;

