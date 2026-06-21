-- Einmal-Hinweise: Setup-Assistent (Familie) + Streak-Einführung (Mitglied)
-- Im Supabase SQL Editor ausführen (auch in pending_migrations.sql enthalten).

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS guide_welcome_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_quest_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_invite_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_profile_seen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_finished boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_solo_quest_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS streak_intro_seen boolean NOT NULL DEFAULT false;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS streak_intro_seen boolean NOT NULL DEFAULT false;
