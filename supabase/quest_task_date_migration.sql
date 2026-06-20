-- Quest-Kalender: task_date (heute/morgen), Ersteller auch als Kind, XP 1–10.
-- Im Supabase SQL Editor ausführen.

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS task_date date;

UPDATE public.quests
SET task_date = (timezone('Europe/Berlin', now()))::date
WHERE task_date IS NULL;

UPDATE public.quests
SET xp_reward = LEAST(10, GREATEST(1, xp_reward))
WHERE xp_reward NOT BETWEEN 1 AND 10;

ALTER TABLE public.quests
  ALTER COLUMN task_date SET NOT NULL;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS created_by_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL;

ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_xp_reward_check;
ALTER TABLE public.quests
  ADD CONSTRAINT quests_xp_reward_check CHECK (xp_reward BETWEEN 1 AND 10);

ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_task_date_horizon;

CREATE INDEX IF NOT EXISTS quests_family_task_date_idx
  ON public.quests (family_id, task_date, is_active);

COMMENT ON COLUMN public.quests.task_date IS 'Kalendertag Europe/Berlin — Quest gilt nur an diesem Tag (heute oder morgen beim Anlegen).';
COMMENT ON COLUMN public.quests.created_by_child_id IS 'Kind als Ersteller; created_by bleibt für Elternteile.';
