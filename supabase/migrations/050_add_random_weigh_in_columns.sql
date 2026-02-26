-- Migration: Add dedicated columns for random (surprise) weigh-in results
-- Separates random check data from official weigh-in data so that
-- clearing/regenerating the random list never overwrites official weigh-in records.

ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS random_weigh_in_weight DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS random_weigh_in_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS random_weigh_in_passed  BOOLEAN,
  ADD COLUMN IF NOT EXISTS random_weigh_in_by      TEXT;

COMMENT ON COLUMN tournament_registrations.random_weigh_in_weight IS 'Weight measured during surprise check (kg)';
COMMENT ON COLUMN tournament_registrations.random_weigh_in_at     IS 'When the surprise check was performed (null = not yet checked)';
COMMENT ON COLUMN tournament_registrations.random_weigh_in_passed  IS 'TRUE = passed, FALSE = failed, NULL = pending check';
COMMENT ON COLUMN tournament_registrations.random_weigh_in_by      IS 'User ID of the staff member who performed the surprise check';
