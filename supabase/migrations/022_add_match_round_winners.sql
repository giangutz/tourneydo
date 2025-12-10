-- Add round winner columns to matches table for efficient querying
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS winner_round1 UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner_round2 UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS winner_round3 UUID REFERENCES players(id) ON DELETE SET NULL;
