-- Optional: Mädchen 2–8 auf neues Portrait Mädchen_2_1 (nach App-Update + WebP)
-- Einmal ausführen, falls Kinder in der DB noch avatar_key = 'girl' haben.

UPDATE public.child_profiles
SET avatar_key = 'Mädchen_2_1'
WHERE gender = 'girl'
  AND age IS NOT NULL
  AND age BETWEEN 2 AND 8
  AND avatar_key IN ('girl', 'default', 'boy', 'male', 'female');

NOTIFY pgrst, 'reload schema';
