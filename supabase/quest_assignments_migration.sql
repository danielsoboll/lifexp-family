-- Quest-Zuweisungen (Mehrfach) + Eltern-Quest-Abschlüsse
-- Einmal im Supabase SQL Editor ausführen.

CREATE TABLE IF NOT EXISTS public.quest_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests (id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('parent', 'child')),
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quest_id, assignee_type, assignee_id)
);

CREATE INDEX IF NOT EXISTS quest_assignments_quest_id_idx ON public.quest_assignments (quest_id);

ALTER TABLE public.quest_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quest_assignments_anon_all ON public.quest_assignments;
CREATE POLICY quest_assignments_anon_all ON public.quest_assignments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Eltern können Quests erledigen (Eigene Quests)
ALTER TABLE public.quest_completions ALTER COLUMN child_id DROP NOT NULL;
ALTER TABLE public.quest_completions ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

ALTER TABLE public.quest_completions DROP CONSTRAINT IF EXISTS quest_completions_child_or_parent_chk;
ALTER TABLE public.quest_completions
  ADD CONSTRAINT quest_completions_child_or_parent_chk
  CHECK (
    (child_id IS NOT NULL AND parent_id IS NULL)
    OR (child_id IS NULL AND parent_id IS NOT NULL)
  );

ALTER TABLE public.quest_completions DROP CONSTRAINT IF EXISTS quest_completions_quest_id_child_id_completed_on_key;
CREATE UNIQUE INDEX IF NOT EXISTS quest_completions_quest_child_date_uidx
  ON public.quest_completions (quest_id, child_id, completed_on)
  WHERE child_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quest_completions_quest_parent_date_uidx
  ON public.quest_completions (quest_id, parent_id, completed_on)
  WHERE parent_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
