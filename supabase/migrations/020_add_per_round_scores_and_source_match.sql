-- Migration: Add per-round scoring and source match tracking to matches table
-- This enables best-of-3 match tracking and backward bracket tree traversal

-- Add per-round score columns
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS score_round1_player1 INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS score_round1_player2 INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS score_round2_player1 INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS score_round2_player2 INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS score_round3_player1 INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS score_round3_player2 INTEGER DEFAULT 0 NOT NULL;

-- Add source match tracking for backward tree traversal
-- This allows us to identify which previous match a player came from
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS source_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

-- Add index for performance when traversing bracket tree
CREATE INDEX IF NOT EXISTS idx_matches_source_match_id ON matches(source_match_id);

-- Add comment to document the schema
COMMENT ON COLUMN matches.score_round1_player1 IS 'Score for player 1 in round 1 (best of 3)';
COMMENT ON COLUMN matches.score_round1_player2 IS 'Score for player 2 in round 1 (best of 3)';
COMMENT ON COLUMN matches.score_round2_player1 IS 'Score for player 1 in round 2 (best of 3)';
COMMENT ON COLUMN matches.score_round2_player2 IS 'Score for player 2 in round 2 (best of 3)';
COMMENT ON COLUMN matches.score_round3_player1 IS 'Score for player 1 in round 3 (best of 3)';
COMMENT ON COLUMN matches.score_round3_player2 IS 'Score for player 2 in round 3 (best of 3)';
COMMENT ON COLUMN matches.source_match_id IS 'Reference to the previous match this match feeds from (for bracket tree traversal)';
