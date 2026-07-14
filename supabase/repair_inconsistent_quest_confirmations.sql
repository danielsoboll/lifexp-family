-- Repair: inkonsistente Quest-Bestätigungen nach RLS-Fehler bei XP-Buchung.
--
-- Szenario (vor fix_daily_xp_entry_child_total_rls.sql):
-- - quest_completions wurde aktualisiert (creator_confirmed_at gesetzt)
-- - daily_xp_entries INSERT schlug fehl
-- => App wirkt „kaputt“, Bestätigen erneut sagt „schon bestätigt“.
--
-- Dieses Skript repariert ALLE betroffenen Familien.
-- Optional: WHERE qc.family_id = 'DEINE-FAMILIEN-UUID'::uuid in den INSERT/UPDATE-Teilen ergänzen.
-- Familien immer über family_id (UUID) filtern — nie über den Namen.

DO $$
DECLARE
  fam record;
  rec record;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  -- 1) Fehlende XP-Einträge nachbuchen
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
  WHERE qc.child_id IS NOT NULL
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

  -- 2) XP-Historie pro Familie/Tag neu synchronisieren
  FOR fam IN
    SELECT DISTINCT qc.family_id
    FROM public.quest_completions qc
    UNION
    SELECT DISTINCT de.family_id
    FROM public.daily_xp_entries de
  LOOP
    FOR rec IN
      SELECT DISTINCT qc.completed_on AS score_date
      FROM public.quest_completions qc
      WHERE qc.family_id = fam.family_id
      UNION
      SELECT DISTINCT de.entry_date AS score_date
      FROM public.daily_xp_entries de
      WHERE de.family_id = fam.family_id
    LOOP
      PERFORM public.sync_family_xp_history(fam.family_id, rec.score_date);
    END LOOP;
  END LOOP;

  -- 3) total_xp aller Kinder aus daily_xp_entries neu berechnen
  UPDATE public.child_profiles cp
  SET total_xp = COALESCE((
    SELECT SUM(de.xp_amount)::integer
    FROM public.daily_xp_entries de
    WHERE de.child_id = cp.id
  ), 0);
END;
$$;
