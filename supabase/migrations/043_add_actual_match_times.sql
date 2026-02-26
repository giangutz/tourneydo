-- Add actual start/end times to matches
--
-- These are recorded as matches progress through their lifecycle:
--   actual_start_time  → set when lifecycle_state transitions to IN_PROGRESS
--   actual_end_time    → set when lifecycle_state transitions to COMPLETED
--
-- Used by the live schedule recalculation feature to determine real court
-- availability instead of relying on estimated scheduled times.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_end_time   timestamptz;

-- Index for live recalculation query (filters by tournament + queries end times)
CREATE INDEX IF NOT EXISTS idx_matches_actual_end_time
  ON matches (tournament_id, court_number, actual_end_time)
  WHERE actual_end_time IS NOT NULL;

COMMENT ON COLUMN matches.actual_start_time IS 'Wall-clock time when the match was called to court (lifecycle: IN_PROGRESS)';
COMMENT ON COLUMN matches.actual_end_time   IS 'Wall-clock time when the match winner was determined (lifecycle: COMPLETED)';
