-- profiles.goal_type: Legacy „abnehmen“ → „fit“
UPDATE profiles
SET goal_type = 'fit'
WHERE lower(trim(goal_type)) = 'abnehmen';
