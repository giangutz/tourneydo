-- Add scheduled_start_time and scheduled_end_time to matches table
-- These columns are used by the scheduling features to track exact match times

ALTER TABLE matches
  ADD COLUMN scheduled_start_time TIMESTAMPTZ,
  ADD COLUMN scheduled_end_time TIMESTAMPTZ;

-- Add index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_time 
  ON matches(tournament_id, scheduled_start_time);

-- Add comments for documentation
COMMENT ON COLUMN matches.scheduled_start_time IS 'Scheduled start time for the match';
COMMENT ON COLUMN matches.scheduled_end_time IS 'Scheduled end time for the match';
