-- LifeXP Family — Tages-Streak (Schritt 5b)
-- Voraussetzung: Schritt 5a wurde bereits ausgeführt:
--   ALTER TYPE public.xp_entry_source ADD VALUE IF NOT EXISTS 'streak';
--
-- Einmal im Supabase SQL Editor ausführen (eigener Run, nach 5a).

ALTER TABLE public.daily_xp_entries ALTER COLUMN child_id DROP NOT NULL;

ALTER TABLE public.daily_xp_entries
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parent_profiles (id) ON DELETE CASCADE;

ALTER TABLE public.daily_xp_entries DROP CONSTRAINT IF EXISTS daily_xp_entries_member_chk;

ALTER TABLE public.daily_xp_entries
  ADD CONSTRAINT daily_xp_entries_member_chk
  CHECK (
    (child_id IS NOT NULL AND parent_id IS NULL)
    OR (child_id IS NULL AND parent_id IS NOT NULL)
  );

DROP INDEX IF EXISTS daily_xp_entries_dedupe_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_child_streak_uidx
  ON public.daily_xp_entries (child_id, entry_date)
  WHERE child_id IS NOT NULL AND source = 'streak';

CREATE UNIQUE INDEX IF NOT EXISTS daily_xp_entries_parent_streak_uidx
  ON public.daily_xp_entries (parent_id, entry_date)
  WHERE parent_id IS NOT NULL AND source = 'streak';

NOTIFY pgrst, 'reload schema';
