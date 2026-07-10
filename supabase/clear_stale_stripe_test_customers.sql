-- Nach Wechsel Stripe Test → Live: veraltete Test-Kunden-IDs entfernen.
-- Einmal im Supabase SQL Editor ausführen, wenn PLUS-Checkout mit Live-Keys scheitert.

UPDATE public.families
SET
  stripe_customer_id = NULL,
  stripe_subscription_id = NULL,
  subscription_status = NULL,
  cancel_at_period_end = FALSE
WHERE stripe_customer_id IS NOT NULL
  AND plan = 'free';
