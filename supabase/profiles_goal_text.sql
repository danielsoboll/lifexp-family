-- Persönlicher Zieltext bei goal_type = 'goal' (Ein Ziel erreichen)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_text text NOT NULL DEFAULT '';
