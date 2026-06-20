-- Quests: Zwei-Stufen-Bestätigung
-- 1) Zugewiesene Person bestätigt Erledigung (assignee_confirmed_at)
-- 2) Ersteller bestätigt → XP werden gutgeschrieben (creator_confirmed_at)
-- Im Supabase SQL Editor ausführen.

ALTER TABLE public.quest_completions
  ADD COLUMN IF NOT EXISTS assignee_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS creator_confirmed_by_parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_confirmed_by_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL;

-- Bestehende Abschlüsse: beide Stufen als erledigt (XP waren schon gutgeschrieben)
UPDATE public.quest_completions
SET
  assignee_confirmed_at = COALESCE(assignee_confirmed_at, completed_at),
  creator_confirmed_at = COALESCE(creator_confirmed_at, completed_at)
WHERE assignee_confirmed_at IS NULL OR creator_confirmed_at IS NULL;

CREATE INDEX IF NOT EXISTS quest_completions_pending_creator_idx
  ON public.quest_completions (family_id, creator_confirmed_at)
  WHERE assignee_confirmed_at IS NOT NULL AND creator_confirmed_at IS NULL;

COMMENT ON COLUMN public.quest_completions.assignee_confirmed_at IS 'Bestätigung 1: zugewiesenes Familienmitglied.';
COMMENT ON COLUMN public.quest_completions.creator_confirmed_at IS 'Bestätigung 2: Quest-Ersteller — danach xp_awarded / Tages-XP.';

NOTIFY pgrst, 'reload schema';
