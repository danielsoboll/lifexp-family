-- Wiederkehrende Quest-Vorlagen (LifeXP Family PLUS)
-- Einmal im Supabase SQL Editor ausführen.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_quest_schedule') THEN
    CREATE TYPE public.recurring_quest_schedule AS ENUM (
      'daily',
      'weekdays',
      'every_other_day',
      'weekly'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.recurring_quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  xp_reward integer NOT NULL DEFAULT 3 CHECK (xp_reward >= 1 AND xp_reward <= 10),
  category text NOT NULL DEFAULT 'allgemein',
  schedule public.recurring_quest_schedule NOT NULL,
  weekly_weekday smallint CHECK (weekly_weekday IS NULL OR (weekly_weekday >= 0 AND weekly_weekday <= 6)),
  anchor_date date NOT NULL,
  ends_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.parent_profiles (id) ON DELETE SET NULL,
  created_by_child_id uuid REFERENCES public.child_profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_quest_weekly_weekday_chk CHECK (
    schedule <> 'weekly' OR weekly_weekday IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS recurring_quest_templates_family_active_idx
  ON public.recurring_quest_templates (family_id, is_active);

CREATE TABLE IF NOT EXISTS public.recurring_quest_template_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.recurring_quest_templates (id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('parent', 'child')),
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, assignee_type, assignee_id)
);

CREATE INDEX IF NOT EXISTS recurring_quest_template_assignments_template_idx
  ON public.recurring_quest_template_assignments (template_id);

ALTER TABLE public.recurring_quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_quest_template_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_quest_templates_anon_all ON public.recurring_quest_templates;
CREATE POLICY recurring_quest_templates_anon_all ON public.recurring_quest_templates
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS recurring_quest_template_assignments_anon_all ON public.recurring_quest_template_assignments;
CREATE POLICY recurring_quest_template_assignments_anon_all ON public.recurring_quest_template_assignments
  FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS recurring_template_id uuid REFERENCES public.recurring_quest_templates (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quests_recurring_template_date_uidx
  ON public.quests (recurring_template_id, task_date)
  WHERE recurring_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS quests_recurring_template_id_idx
  ON public.quests (recurring_template_id)
  WHERE recurring_template_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
