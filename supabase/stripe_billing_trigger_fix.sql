-- Fix: Billing-Sync via Service Role (Edge Functions / Webhook)
-- Trigger erkannte service_role nicht zuverlässig → Updates schlugen fehl, plan blieb "free".
-- Einmal im Supabase SQL Editor ausführen.

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
    ) AND jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Family billing fields are managed server-side only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
