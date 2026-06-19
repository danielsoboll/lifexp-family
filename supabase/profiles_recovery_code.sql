-- Recovery-Code für Account-Wiederherstellung nach Gerätewechsel / Neuinstallation.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rec_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rec_code_ok boolean NOT NULL DEFAULT false;
