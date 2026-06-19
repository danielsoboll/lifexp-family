-- nutrition_rules: xp_kcal_* nach goal_type (alle gender, alle type_category)
-- In Supabase SQL Editor ausführen.

-- xp_kcal_low
UPDATE public.nutrition_rules SET xp_kcal_low = 5 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_kcal_low = -5 WHERE lower(trim(goal_type)) = 'pump';
UPDATE public.nutrition_rules SET xp_kcal_low = 0 WHERE lower(trim(goal_type)) = 'structure';
UPDATE public.nutrition_rules SET xp_kcal_low = 0 WHERE lower(trim(goal_type)) = 'goal';

-- xp_kcal_min
UPDATE public.nutrition_rules SET xp_kcal_min = 10 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_kcal_min = 0 WHERE lower(trim(goal_type)) = 'pump';
UPDATE public.nutrition_rules SET xp_kcal_min = 5 WHERE lower(trim(goal_type)) IN ('structure', 'goal');

-- xp_kcal_opt
UPDATE public.nutrition_rules SET xp_kcal_opt = 5 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_kcal_opt = 10 WHERE lower(trim(goal_type)) = 'pump';
UPDATE public.nutrition_rules SET xp_kcal_opt = 10 WHERE lower(trim(goal_type)) IN ('structure', 'goal');

-- xp_kcal_high
UPDATE public.nutrition_rules SET xp_kcal_high = 0 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_kcal_high = 10 WHERE lower(trim(goal_type)) IN ('pump', 'structure', 'goal');

-- xp_kcal_ext
UPDATE public.nutrition_rules SET xp_kcal_ext = -5 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_kcal_ext = 5 WHERE lower(trim(goal_type)) = 'pump';
UPDATE public.nutrition_rules SET xp_kcal_ext = 0 WHERE lower(trim(goal_type)) IN ('structure', 'goal');

-- xp_high_plus
UPDATE public.nutrition_rules SET xp_high_plus = -10 WHERE lower(trim(goal_type)) = 'fit';
UPDATE public.nutrition_rules SET xp_high_plus = 0 WHERE lower(trim(goal_type)) = 'pump';
UPDATE public.nutrition_rules SET xp_high_plus = -5 WHERE lower(trim(goal_type)) IN ('structure', 'goal');

-- xp_prot_min (Spalte xp_prot_min)
UPDATE public.nutrition_rules SET xp_prot_min = -5 WHERE lower(trim(goal_type)) IN ('fit', 'structure', 'goal');
UPDATE public.nutrition_rules SET xp_prot_min = -15 WHERE lower(trim(goal_type)) = 'pump';

-- xp_prot_plus
UPDATE public.nutrition_rules SET xp_prot_plus = 5 WHERE lower(trim(goal_type)) IN ('fit', 'structure', 'goal');
UPDATE public.nutrition_rules SET xp_prot_plus = 15 WHERE lower(trim(goal_type)) = 'pump';

-- prot_ext (alle Kombinationen)
UPDATE public.nutrition_rules SET prot_ext = 150;

-- xp_prot_opt / xp_prot_ext (alle Kombinationen)
UPDATE public.nutrition_rules SET xp_prot_opt = 5;
UPDATE public.nutrition_rules SET xp_prot_ext = 15;
