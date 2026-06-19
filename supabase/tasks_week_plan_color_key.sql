-- Aufgaben-Farbtyp (1–6) für Tages-Aufgaben und Wochenplan
-- In Supabase SQL Editor ausführen, falls noch nicht vorhanden.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS color_key smallint NOT NULL DEFAULT 1;

ALTER TABLE public.week_plan
  ADD COLUMN IF NOT EXISTS color_key smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_color_key_range'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_color_key_range CHECK (color_key BETWEEN 1 AND 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'week_plan_color_key_range'
  ) THEN
    ALTER TABLE public.week_plan
      ADD CONSTRAINT week_plan_color_key_range CHECK (color_key BETWEEN 1 AND 6);
  END IF;
END $$;

-- PostgREST-Schema-Cache aktualisieren (Supabase API)
NOTIFY pgrst, 'reload schema';
