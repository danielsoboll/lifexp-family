-- DEPRECATED — bitte stattdessen migrate_to_mvp_no_auth.sql ausführen.
-- Enthält nur den parent_profiles-FK-Fix (Teilmenge der Komplett-Migration).

ALTER TABLE public.parent_profiles DROP CONSTRAINT IF EXISTS parent_profiles_id_fkey;
ALTER TABLE public.parent_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
