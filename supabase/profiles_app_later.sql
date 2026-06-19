-- PWA: Nutzer hat „Später“ gewählt (nicht Onboarding) — kein penetrantes Install-Overlay mehr.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_later boolean NOT NULL DEFAULT false;
