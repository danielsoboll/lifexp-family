-- Ernährung: einheitliches meal_type in allen drei Tabellen
--   breakfast | lunch | dinner | snack | alcohol
--
-- food_items        – globale Standard-Gerichte (meal_type, name, kcal, protein, …)
-- food_items_indiv  – persönliche Standard-Gerichte pro user_id + meal_type
-- meal_entries      – Tages-Log: user_id, event_date, meal_type, name, kcal, protein
--                     (kein FK zu food_items; name wird beim Erfassen kopiert)
--
-- In Supabase SQL Editor ausführen, falls noch nicht vorhanden.

ALTER TABLE public.food_items_indiv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_items_indiv_select_public" ON public.food_items_indiv;
DROP POLICY IF EXISTS "food_items_indiv_insert_public" ON public.food_items_indiv;
DROP POLICY IF EXISTS "food_items_indiv_update_public" ON public.food_items_indiv;
DROP POLICY IF EXISTS "food_items_indiv_delete_public" ON public.food_items_indiv;

CREATE POLICY "food_items_indiv_select_public"
  ON public.food_items_indiv
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "food_items_indiv_insert_public"
  ON public.food_items_indiv
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "food_items_indiv_update_public"
  ON public.food_items_indiv
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "food_items_indiv_delete_public"
  ON public.food_items_indiv
  FOR DELETE
  TO anon, authenticated
  USING (true);
