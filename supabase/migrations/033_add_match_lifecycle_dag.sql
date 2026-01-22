-- WT-Compliant Match Lifecycle and DAG Dependencies
-- This migration adds proper match lifecycle states and dependency tracking

-- Add lifecycle state enum for WT match states
DO $$ BEGIN
  CREATE TYPE match_lifecycle_state AS ENUM (
    'AUTO_ADVANCE',   -- BYE resolution: invisible, not scheduled, no court time
    'WAITING',        -- Visible, numbered, but not callable (deps unresolved)
    'CONTEST',        -- Both athletes known, all deps resolved, callable
    'IN_PROGRESS',    -- Currently being played
    'COMPLETED'       -- Finished, winner propagated
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns for lifecycle tracking and DAG dependencies
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS lifecycle_state match_lifecycle_state DEFAULT 'WAITING',
  ADD COLUMN IF NOT EXISTS source_match_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS athlete1_available_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS athlete2_available_at TIMESTAMPTZ;

-- Migrate existing data to appropriate lifecycle states
UPDATE matches SET lifecycle_state = 
  CASE 
    -- BYE matches: completed with winner but missing a player
    WHEN status = 'completed' AND winner_id IS NOT NULL 
         AND (player1_id IS NULL OR player2_id IS NULL) 
    THEN 'AUTO_ADVANCE'::match_lifecycle_state
    
    -- Regular completed matches
    WHEN status = 'completed' 
    THEN 'COMPLETED'::match_lifecycle_state
    
    -- In progress matches
    WHEN status = 'in_progress' 
    THEN 'IN_PROGRESS'::match_lifecycle_state
    
    -- Scheduled with both players known = ready for contest
    WHEN status = 'scheduled' AND player1_id IS NOT NULL AND player2_id IS NOT NULL 
    THEN 'CONTEST'::match_lifecycle_state
    
    -- Scheduled but waiting for players
    ELSE 'WAITING'::match_lifecycle_state
  END
WHERE lifecycle_state IS NULL OR lifecycle_state = 'WAITING'::match_lifecycle_state;

-- Populate source_match_ids from existing bracket structure
-- For each match, find the two matches that feed into it via next_match_id
UPDATE matches m
SET source_match_ids = COALESCE(
  (SELECT array_agg(source.id) 
   FROM matches source 
   WHERE source.next_match_id = m.id),
  '{}'
)
WHERE source_match_ids = '{}' OR source_match_ids IS NULL;

-- Index for efficient lifecycle queries
CREATE INDEX IF NOT EXISTS idx_matches_lifecycle 
  ON matches(tournament_id, lifecycle_state);

-- Index for DAG dependency lookups
CREATE INDEX IF NOT EXISTS idx_matches_source_deps 
  ON matches USING GIN(source_match_ids);

-- Index for court execution queries
CREATE INDEX IF NOT EXISTS idx_matches_court_execution
  ON matches(tournament_id, court_number, lifecycle_state, match_sequence);
