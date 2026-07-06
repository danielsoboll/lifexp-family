-- Quest-Grace: offene Quests von gestern noch heute abschließbar, danach aus der App.
-- Im Supabase SQL Editor ausführen.

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS completion_deadline date;

UPDATE public.quests
SET completion_deadline = task_date + 1
WHERE completion_deadline IS NULL
  AND task_date IS NOT NULL;

UPDATE public.quests
SET completion_deadline = (timezone('Europe/Berlin', now()))::date
WHERE completion_deadline IS NULL;

ALTER TABLE public.quests
  ALTER COLUMN completion_deadline SET NOT NULL;

CREATE OR REPLACE FUNCTION public.quests_set_completion_deadline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.task_date IS NOT NULL THEN
    NEW.completion_deadline := NEW.task_date + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quests_set_completion_deadline ON public.quests;
CREATE TRIGGER quests_set_completion_deadline
  BEFORE INSERT OR UPDATE OF task_date ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.quests_set_completion_deadline();

CREATE OR REPLACE FUNCTION public.deactivate_expired_quests(p_family_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := (timezone('Europe/Berlin', now()))::date;
  v_count integer;
BEGIN
  UPDATE public.quests
  SET
    is_active = false,
    updated_at = now()
  WHERE is_active = true
    AND completion_deadline < v_today
    AND (p_family_id IS NULL OR family_id = p_family_id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Bestehende abgelaufene Quests sofort ausblenden
SELECT public.deactivate_expired_quests();

CREATE INDEX IF NOT EXISTS quests_family_completion_deadline_idx
  ON public.quests (family_id, completion_deadline, is_active)
  WHERE is_active = true;

COMMENT ON COLUMN public.quests.completion_deadline IS
  'Letzter Tag (Europe/Berlin), an dem die Quest noch erledigt werden kann (task_date + 1).';
