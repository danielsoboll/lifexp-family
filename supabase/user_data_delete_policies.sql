-- DELETE-Policies für vollständiges „Benutzer löschen“ (anon/authenticated).
-- In Supabase: SQL Editor → New query → ausführen.

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_public" ON public.profiles;

CREATE POLICY "profiles_select_public"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "profiles_insert_public"
  ON public.profiles
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update_public"
  ON public.profiles
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "profiles_delete_public"
  ON public.profiles
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- xp_events
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_events_delete_public" ON public.xp_events;

CREATE POLICY "xp_events_delete_public"
  ON public.xp_events
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- meal_entries
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_entries_delete_public" ON public.meal_entries;

CREATE POLICY "meal_entries_delete_public"
  ON public.meal_entries
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- daily_scores
ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_scores_delete_public" ON public.daily_scores;

CREATE POLICY "daily_scores_delete_public"
  ON public.daily_scores
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_delete_public" ON public.tasks;

CREATE POLICY "tasks_delete_public"
  ON public.tasks
  FOR DELETE
  TO anon, authenticated
  USING (true);
