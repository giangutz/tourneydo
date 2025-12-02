-- Add tournament_type column to tournaments table
-- This allows organizers to choose between Standard (belt-based) and Open Belt (no belt restrictions) tournaments

ALTER TABLE tournaments
  ADD COLUMN tournament_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (tournament_type IN ('standard', 'open-belt'));

-- Add comment for clarity
COMMENT ON COLUMN tournaments.tournament_type IS 'Tournament bracket generation type: standard (belt-based divisions) or open-belt (no belt restrictions)';
