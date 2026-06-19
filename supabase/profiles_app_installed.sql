-- PWA: Nutzer hat LifeXP zum Home-Bildschirm hinzugefügt oder startet im Standalone-Modus.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_installed boolean NOT NULL DEFAULT false;
