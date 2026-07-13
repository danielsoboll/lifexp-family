-- Fix: RLS error when inserting daily_xp_entries triggers child_profiles update
-- Error observed: "query would be affected by row-level security policy for table \"child_profiles\""
--
-- Cause: trigger function updates child_profiles during daily_xp_entries insert/update/delete.
-- In some environments this UPDATE is still subject to RLS and can fail even for valid sessions.
--
-- Run once in Supabase SQL Editor (safe to re-run).

CREATE OR REPLACE FUNCTION public.apply_daily_xp_entry_to_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Make sure this trigger never gets blocked by RLS.
  PERFORM set_config('row_security', 'off', true);

  IF TG_OP = 'INSERT' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp + NEW.xp_amount)
    WHERE id = NEW.child_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp - OLD.xp_amount)
    WHERE id = OLD.child_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.child_profiles
    SET total_xp = GREATEST(0, total_xp - OLD.xp_amount + NEW.xp_amount)
    WHERE id = NEW.child_id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS daily_xp_entries_apply_child_total ON public.daily_xp_entries;
CREATE TRIGGER daily_xp_entries_apply_child_total
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_xp_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_daily_xp_entry_to_child();

NOTIFY pgrst, 'reload schema';

