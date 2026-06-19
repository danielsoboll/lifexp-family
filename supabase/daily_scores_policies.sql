-- daily_scores: Tages-Snapshots (user_id = profiles.username).
-- In Supabase: SQL Editor → New query → ausführen.

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_scores_select_public" ON public.daily_scores;
DROP POLICY IF EXISTS "daily_scores_insert_public" ON public.daily_scores;
DROP POLICY IF EXISTS "daily_scores_update_public" ON public.daily_scores;

CREATE POLICY "daily_scores_select_public"
  ON public.daily_scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "daily_scores_insert_public"
  ON public.daily_scores
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "daily_scores_update_public"
  ON public.daily_scores
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
