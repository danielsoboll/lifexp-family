-- Farbe für Familien-Quests („Alle“ / Familie X)
-- Im Supabase SQL Editor ausführen.

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS accent_key text;

ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_accent_key_check;
ALTER TABLE public.families
  ADD CONSTRAINT families_accent_key_check
  CHECK (
    accent_key IS NULL OR accent_key IN (
      'amber', 'rose', 'sky', 'mint', 'lavender', 'peach', 'sand', 'blush'
    )
  );

UPDATE public.families
SET accent_key = 'lavender'
WHERE accent_key IS NULL;

ALTER TABLE public.families
  ALTER COLUMN accent_key SET DEFAULT 'lavender';

ALTER TABLE public.families
  ALTER COLUMN accent_key SET NOT NULL;

COMMENT ON COLUMN public.families.accent_key IS 'Farb-Nuance für Familien-Quests (Alle): amber, rose, sky, mint, lavender, peach, sand, blush.';

NOTIFY pgrst, 'reload schema';
