-- Persönliche Farb-Nuance pro Familienmitglied (Quest-Übersicht u. a.)
-- Im Supabase SQL Editor ausführen.

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS accent_key text;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS accent_key text;

ALTER TABLE public.parent_profiles DROP CONSTRAINT IF EXISTS parent_profiles_accent_key_check;
ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_accent_key_check
  CHECK (
    accent_key IS NULL OR accent_key IN (
      'amber', 'rose', 'sky', 'mint', 'lavender', 'peach', 'sand', 'blush'
    )
  );

ALTER TABLE public.child_profiles DROP CONSTRAINT IF EXISTS child_profiles_accent_key_check;
ALTER TABLE public.child_profiles
  ADD CONSTRAINT child_profiles_accent_key_check
  CHECK (
    accent_key IS NULL OR accent_key IN (
      'amber', 'rose', 'sky', 'mint', 'lavender', 'peach', 'sand', 'blush'
    )
  );

-- Erwachsene: pro Familie rotierend zuweisen
WITH ranked_parents AS (
  SELECT
    pp.id,
    (ROW_NUMBER() OVER (PARTITION BY fm.family_id ORDER BY pp.created_at) - 1) % 8 AS palette_idx
  FROM public.parent_profiles pp
  INNER JOIN public.family_members fm ON fm.parent_id = pp.id
)
UPDATE public.parent_profiles pp
SET accent_key = (ARRAY['amber', 'rose', 'sky', 'mint', 'lavender', 'peach', 'sand', 'blush'])[rp.palette_idx + 1]
FROM ranked_parents rp
WHERE pp.id = rp.id AND pp.accent_key IS NULL;

-- Kinder: pro Familie rotierend (nach sort_order)
WITH ranked_children AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY family_id ORDER BY sort_order, created_at) - 1) % 8 AS palette_idx
  FROM public.child_profiles
  WHERE is_active = true
)
UPDATE public.child_profiles cp
SET accent_key = (ARRAY['amber', 'rose', 'sky', 'mint', 'lavender', 'peach', 'sand', 'blush'])[rc.palette_idx + 1]
FROM ranked_children rc
WHERE cp.id = rc.id AND cp.accent_key IS NULL;

ALTER TABLE public.parent_profiles
  ALTER COLUMN accent_key SET DEFAULT 'amber';

ALTER TABLE public.child_profiles
  ALTER COLUMN accent_key SET DEFAULT 'amber';

UPDATE public.parent_profiles SET accent_key = 'amber' WHERE accent_key IS NULL;
UPDATE public.child_profiles SET accent_key = 'amber' WHERE accent_key IS NULL;

ALTER TABLE public.parent_profiles
  ALTER COLUMN accent_key SET NOT NULL;

ALTER TABLE public.child_profiles
  ALTER COLUMN accent_key SET NOT NULL;

COMMENT ON COLUMN public.parent_profiles.accent_key IS 'Farb-Nuance für UI (Quest-Karten): amber, rose, sky, mint, lavender, peach, sand, blush.';
COMMENT ON COLUMN public.child_profiles.accent_key IS 'Farb-Nuance für UI (Quest-Karten): amber, rose, sky, mint, lavender, peach, sand, blush.';

NOTIFY pgrst, 'reload schema';
