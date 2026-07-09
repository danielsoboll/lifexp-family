-- Ersteller von wiederkehrenden Tages-Quests aus Vorlage übernehmen (Zwei-Stufen-Bestätigung)
-- Einmal im Supabase SQL Editor ausführen, falls Instanzen ohne created_by existieren.

UPDATE public.quests q
SET
  created_by = t.created_by,
  created_by_child_id = t.created_by_child_id,
  updated_at = now()
FROM public.recurring_quest_templates t
WHERE q.recurring_template_id = t.id
  AND q.created_by IS NULL
  AND q.created_by_child_id IS NULL;

NOTIFY pgrst, 'reload schema';
