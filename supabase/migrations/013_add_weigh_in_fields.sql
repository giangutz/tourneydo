-- Add weigh-in fields to tournament_registrations table
ALTER TABLE tournament_registrations
  ADD COLUMN actual_weight DECIMAL(5,2),
  ADD COLUMN actual_height DECIMAL(5,2),
  ADD COLUMN disqualified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN disqualification_reason TEXT,
  ADD COLUMN weighed_in_at TIMESTAMPTZ;

-- Add index for querying disqualified participants
CREATE INDEX IF NOT EXISTS idx_registrations_disqualified ON tournament_registrations(disqualified);

-- Add index for weigh-in status
CREATE INDEX IF NOT EXISTS idx_registrations_weighed_in ON tournament_registrations(weighed_in_at);

-- Add comment for documentation
COMMENT ON COLUMN tournament_registrations.actual_weight IS 'Actual weight measured during weigh-in (kg)';
COMMENT ON COLUMN tournament_registrations.actual_height IS 'Actual height measured during weigh-in (cm)';
COMMENT ON COLUMN tournament_registrations.disqualified IS 'Whether participant has been disqualified';
COMMENT ON COLUMN tournament_registrations.disqualification_reason IS 'Reason for disqualification';
COMMENT ON COLUMN tournament_registrations.weighed_in_at IS 'Timestamp when weigh-in was completed';
