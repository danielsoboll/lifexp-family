-- =============================================================================
-- LifeXP Family — Portrait-Avatare (Mann_1_1, Junge_2_1, …)
-- =============================================================================
-- Einmal im Supabase SQL Editor ausführen (nach member_gender_age_migration.sql
-- und member_can_admin_migration.sql).
--
-- Keine neuen Tabellen/Spalten nötig:
--   • parent_profiles.avatar_url  → z. B. /avatars/Mann_1_1.webp
--   • child_profiles.avatar_key   → Portrait-Stamm, z. B. Junge_1_1
--
-- Idempotent: mehrfaches Ausführen unkritisch.
-- =============================================================================

BEGIN;

COMMENT ON COLUMN public.parent_profiles.avatar_url IS
  'Portrait-Pfad unter /avatars/, z. B. /avatars/Mann_1_1.webp';

COMMENT ON COLUMN public.child_profiles.avatar_key IS
  'Portrait-Stammdatei ohne Endung, z. B. Junge_1_1 (nicht mehr boy/girl)';

-- Eltern: Standard-Portrait setzen, wenn noch leer oder Legacy
UPDATE public.parent_profiles
SET avatar_url = '/avatars/Mann_1_1.webp'
WHERE gender = 'male'
  AND (
    avatar_url IS NULL
    OR btrim(avatar_url) = ''
    OR avatar_url NOT LIKE '/avatars/Mann_%'
       AND avatar_url NOT LIKE '/avatars/Frau_%'
  );

UPDATE public.parent_profiles
SET avatar_url = '/avatars/Frau_1_1.webp'
WHERE gender = 'female'
  AND (
    avatar_url IS NULL
    OR btrim(avatar_url) = ''
    OR avatar_url NOT LIKE '/avatars/Mann_%'
       AND avatar_url NOT LIKE '/avatars/Frau_%'
  );

-- Kinder: Legacy avatar_key (boy/girl/default) → passendes Portrait nach Alter
UPDATE public.child_profiles
SET avatar_key = CASE
  WHEN gender = 'boy' AND age IS NOT NULL AND age >= 9 THEN 'Junge_1_1'
  WHEN gender = 'boy' AND age IS NOT NULL AND age >= 2 THEN 'Junge_2_1'
  WHEN gender = 'girl' AND age IS NOT NULL AND age >= 9 THEN 'Mädchen_1_1'
  WHEN gender = 'girl' AND age IS NOT NULL AND age >= 2 THEN 'Mädchen_2_1'
  ELSE avatar_key
END
WHERE avatar_key IN ('default', 'boy', 'girl', 'male', 'female')
   OR avatar_key IS NULL
   OR btrim(avatar_key) = '';

-- Bereits migrierte Mädchen 2–8 (noch boy/girl) → Mädchen_2_1
UPDATE public.child_profiles
SET avatar_key = 'Mädchen_2_1'
WHERE gender = 'girl'
  AND age IS NOT NULL
  AND age BETWEEN 2 AND 8
  AND avatar_key IN ('girl', 'default', 'boy', 'male', 'female');

-- Kinder ohne Alter: sinnvoller Default nach Geschlecht (App zeigt ggf. „Alter angeben“)
UPDATE public.child_profiles
SET avatar_key = CASE
  WHEN gender = 'boy' THEN 'Junge_1_1'
  WHEN gender = 'girl' THEN 'Mädchen_1_1'
  ELSE avatar_key
END
WHERE age IS NULL
  AND avatar_key IN ('default', 'boy', 'girl', 'male', 'female');

COMMIT;

NOTIFY pgrst, 'reload schema';
