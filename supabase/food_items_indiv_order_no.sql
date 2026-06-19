-- Reihenfolge für persönliche Standard-Gerichte (food_items_indiv).
-- In Supabase SQL Editor ausführen, falls order_no noch fehlt.

ALTER TABLE public.food_items_indiv
  ADD COLUMN IF NOT EXISTS order_no integer NOT NULL DEFAULT 1;

-- Bestehende Zeilen ohne sinnvolle Reihenfolge: pro user_id + meal_type fortlaufend nummerieren.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, meal_type
      ORDER BY COALESCE(order_no, 0), id
    ) AS rn
  FROM public.food_items_indiv
)
UPDATE public.food_items_indiv AS f
SET order_no = ranked.rn
FROM ranked
WHERE f.id = ranked.id;
