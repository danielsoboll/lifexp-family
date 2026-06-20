-- Admin-Rechte pro Familienmitglied (can_admin)
-- Einmal im Supabase SQL Editor ausführen (nach member_gender_age_migration.sql).

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS can_admin boolean NOT NULL DEFAULT true;

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS can_admin boolean NOT NULL DEFAULT false;

-- Eltern (Mann/Frau): Admin standardmäßig an
UPDATE public.parent_profiles
SET can_admin = true
WHERE can_admin IS DISTINCT FROM true;

-- Kinder: Admin an ab 18, sonst aus
UPDATE public.child_profiles
SET can_admin = (age IS NOT NULL AND age >= 18);

NOTIFY pgrst, 'reload schema';
