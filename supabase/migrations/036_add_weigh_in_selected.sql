-- Add weigh_in_selected column to tournament_registrations table
-- This column is used to track which participants are randomly selected for surprise weigh-ins

ALTER TABLE tournament_registrations
  ADD COLUMN weigh_in_selected BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient querying of selected participants
CREATE INDEX IF NOT EXISTS idx_registrations_weigh_in_selected 
  ON tournament_registrations(tournament_id, weigh_in_selected) 
  WHERE weigh_in_selected = true;

-- Add comment for documentation
COMMENT ON COLUMN tournament_registrations.weigh_in_selected IS 'Whether participant has been randomly selected for surprise weigh-in (20% per division/category)';
