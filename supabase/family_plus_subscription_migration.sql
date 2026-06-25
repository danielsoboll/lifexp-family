-- LifeXP Family PLUS — Stripe-Abo pro Familie
-- Einmal im Supabase SQL Editor ausführen (auch in pending_migrations.sql).

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plus_until timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.families DROP CONSTRAINT IF EXISTS families_plan_check;
ALTER TABLE public.families
  ADD CONSTRAINT families_plan_check CHECK (plan IN ('free', 'plus'));

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_customer_id_uidx
  ON public.families (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_subscription_id_uidx
  ON public.families (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Supabase Auth ↔ Elternprofil (Billing-Admin)
ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parent_profiles_auth_user_id_uidx
  ON public.parent_profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Billing-Felder nur serverseitig (Service Role / Webhook)
CREATE OR REPLACE FUNCTION public.protect_family_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
      OR NEW.plus_until IS DISTINCT FROM OLD.plus_until
      OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    ) AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Family billing fields are managed server-side only';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS families_protect_billing ON public.families;
CREATE TRIGGER families_protect_billing
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_family_billing_fields();

-- auth_user_id nur vom eigenen Auth-User setzbar (einmalig)
CREATE OR REPLACE FUNCTION public.protect_parent_auth_user_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NULL OR NEW.auth_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'auth_user_id can only be set to the current user';
    END IF;
    IF OLD.auth_user_id IS NOT NULL AND OLD.auth_user_id IS DISTINCT FROM NEW.auth_user_id THEN
      RAISE EXCEPTION 'auth_user_id is already linked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_profiles_protect_auth_user_id ON public.parent_profiles;
CREATE TRIGGER parent_profiles_protect_auth_user_id
  BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_parent_auth_user_id();

NOTIFY pgrst, 'reload schema';
