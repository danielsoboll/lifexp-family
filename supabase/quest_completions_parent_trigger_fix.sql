-- Eltern-Abschlüsse: quest_completions nutzt parent_id ohne child_id.
-- Der Trigger enforce_child_in_family darf nur laufen, wenn child_id gesetzt ist.
-- Einmal im Supabase SQL Editor ausführen.

CREATE OR REPLACE FUNCTION public.enforce_child_in_family()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.child_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    WHERE cp.id = NEW.child_id
      AND cp.family_id = NEW.family_id
  ) THEN
    RAISE EXCEPTION 'child_id gehört nicht zu family_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quest_completions_child_family ON public.quest_completions;
CREATE TRIGGER quest_completions_child_family
  BEFORE INSERT OR UPDATE ON public.quest_completions
  FOR EACH ROW
  WHEN (NEW.child_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_child_in_family();

NOTIFY pgrst, 'reload schema';
