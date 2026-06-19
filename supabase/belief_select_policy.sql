-- Glaubenssätze sind Referenzdaten (wie area_info) und müssen von der App lesbar sein.
-- In Supabase: SQL Editor → New query → ausführen.

ALTER TABLE public.belief ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "belief_select_public" ON public.belief;

CREATE POLICY "belief_select_public"
  ON public.belief
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(active, true) = true);
