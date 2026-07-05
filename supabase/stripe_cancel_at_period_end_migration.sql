-- Kündigung zum Periodenende: cancel_at_period_end + Trigger-Update
-- Einmal im Supabase SQL Editor ausführen.

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_family_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    jwt_role := coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', ''),
      ''
    );

    IF (
      NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
      OR NEW.plus_until IS DISTINCT FROM OLD.plus_until
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
      OR NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end
    ) AND jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Family billing fields are managed server-side only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
