-- Ergänzt fehlende nutrition_rules: gender × goal_type × type_category (1–5).
-- Werte (kcal, Protein, XP, plus_bew1) vom ersten vorhandenen Eintrag.
-- In Supabase SQL Editor ausführen.

INSERT INTO public.nutrition_rules (
  gender,
  goal_type,
  type_category,
  kcal_low,
  xp_kcal_low,
  kcal_min,
  xp_kcal_min,
  kcal_opt,
  xp_kcal_opt,
  kcal_high,
  xp_kcal_high,
  kcal_ext,
  xp_kcal_ext,
  prot_low,
  xp_prot_low,
  prot_min,
  xp_prot_min,
  prot_opt,
  xp_prot_opt,
  prot_ext,
  xp_prot_ext,
  plus_bew1,
  xp_high_plus,
  xp_prot_plus
)
SELECT
  g.gender,
  gt.goal_type,
  tc.type_category,
  t.kcal_low,
  t.xp_kcal_low,
  t.kcal_min,
  t.xp_kcal_min,
  t.kcal_opt,
  t.xp_kcal_opt,
  t.kcal_high,
  t.xp_kcal_high,
  t.kcal_ext,
  t.xp_kcal_ext,
  t.prot_low,
  t.xp_prot_low,
  t.prot_min,
  t.xp_prot_min,
  t.prot_opt,
  t.xp_prot_opt,
  t.prot_ext,
  t.xp_prot_ext,
  t.plus_bew1,
  t.xp_high_plus,
  t.xp_prot_plus
FROM (
  SELECT *
  FROM public.nutrition_rules
  ORDER BY id
  LIMIT 1
) AS t
CROSS JOIN (
  VALUES ('male'), ('female'), ('divers')
) AS g (gender)
CROSS JOIN (
  VALUES ('fit'), ('pump'), ('structure'), ('goal')
) AS gt (goal_type)
CROSS JOIN (
  VALUES (1), (2), (3), (4), (5)
) AS tc (type_category)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.nutrition_rules nr
  WHERE lower(trim(nr.gender)) = g.gender
    AND lower(trim(nr.goal_type)) = gt.goal_type
    AND nr.type_category = tc.type_category
);
