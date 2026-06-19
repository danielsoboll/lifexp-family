-- Aufgaben-Farben: 5 → 6 Typen (neues Gelb als 3, Umnummerierung 3–5 → 4–6)
-- In Supabase SQL Editor ausführen.
--
-- Mapping color_key in tasks / week_plan:
--   1, 2 unverändert
--   alt 3 (organisatorisch) → 4
--   alt 4 (privater Termin) → 5
--   alt 5 (Erinnerung) → 6
--   neu 3 = Gelb (Platzhalter: beruflich)
--
-- Mapping task_colors_indiv:
--   col1, col2 unverändert
--   col3 neu (leer → Standard)
--   alt col3 → col4, alt col4 → col5, alt col5 → col6

ALTER TABLE public.task_colors_indiv
  ADD COLUMN IF NOT EXISTS col6_txt text;

-- color_key in Aufgaben (rückwärts, damit keine Kollisionen)
UPDATE public.tasks SET color_key = 6 WHERE color_key = 5;
UPDATE public.tasks SET color_key = 5 WHERE color_key = 4;
UPDATE public.tasks SET color_key = 4 WHERE color_key = 3;

UPDATE public.week_plan SET color_key = 6 WHERE color_key = 5;
UPDATE public.week_plan SET color_key = 5 WHERE color_key = 4;
UPDATE public.week_plan SET color_key = 4 WHERE color_key = 3;

-- Eigene Bezeichnungen mitwandern (alle RHS-Werte aus der alten Zeile)
UPDATE public.task_colors_indiv
SET
  col6_txt = col5_txt,
  col5_txt = col4_txt,
  col4_txt = col3_txt,
  col3_txt = NULL;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_color_key_range;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_color_key_range CHECK (color_key BETWEEN 1 AND 6);

ALTER TABLE public.week_plan DROP CONSTRAINT IF EXISTS week_plan_color_key_range;
ALTER TABLE public.week_plan
  ADD CONSTRAINT week_plan_color_key_range CHECK (color_key BETWEEN 1 AND 6);

NOTIFY pgrst, 'reload schema';
