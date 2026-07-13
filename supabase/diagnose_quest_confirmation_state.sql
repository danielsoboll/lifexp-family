-- Diagnose: inkonsistente Quest-Bestätigungen (Read-only).
-- Im Supabase SQL Editor ausführen.

-- A) Bestätigt, aber kein XP-Eintrag (Hauptproblem nach RLS-Fehler)
SELECT
  qc.id AS completion_id,
  qc.family_id,
  q.title AS quest_title,
  cp.display_name AS child_name,
  qc.completed_on,
  qc.xp_awarded,
  qc.creator_confirmed_at
FROM public.quest_completions qc
JOIN public.quests q ON q.id = qc.quest_id
LEFT JOIN public.child_profiles cp ON cp.id = qc.child_id
WHERE qc.creator_confirmed_at IS NOT NULL
  AND qc.child_id IS NOT NULL
  AND COALESCE(qc.xp_awarded, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.daily_xp_entries de
    WHERE de.family_id = qc.family_id
      AND de.child_id = qc.child_id
      AND de.entry_date = qc.completed_on
      AND de.source = 'quest'
      AND de.source_id = qc.quest_id
  )
ORDER BY qc.creator_confirmed_at DESC;

-- B) Wartet auf Ersteller-Bestätigung (blockiert ggf. das Quest-Modal)
SELECT
  qc.id AS completion_id,
  qc.family_id,
  q.title AS quest_title,
  qc.assignee_confirmed_at,
  qc.completed_on
FROM public.quest_completions qc
JOIN public.quests q ON q.id = qc.quest_id
WHERE qc.assignee_confirmed_at IS NOT NULL
  AND qc.creator_confirmed_at IS NULL
ORDER BY qc.assignee_confirmed_at ASC;
