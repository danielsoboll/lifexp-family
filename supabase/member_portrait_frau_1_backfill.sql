-- Falsche oder abgewählte Mama-Portraits → Frau_1_1
-- Einmal ausführen, falls Frau_2_* oder Frau_1_2 gesetzt wurde.

UPDATE public.parent_profiles
SET avatar_url = '/avatars/Frau_1_1.webp'
WHERE gender = 'female'
  AND (
    avatar_url LIKE '%/Frau_2_%'
    OR avatar_url LIKE 'Frau_2_%'
    OR avatar_url LIKE '%/Frau_1_2%'
    OR avatar_url LIKE 'Frau_1_2%'
  );

NOTIFY pgrst, 'reload schema';
