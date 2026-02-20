-- Add structural metadata columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS round_name text,
ADD COLUMN IF NOT EXISTS round_order integer,
ADD COLUMN IF NOT EXISTS bracket_position text,
ADD COLUMN IF NOT EXISTS structural_match_number integer;

-- Optional: Add index for sorting if needed
-- CREATE INDEX IF NOT EXISTS idx_matches_structural_number ON matches(structural_match_number);
-- CREATE INDEX IF NOT EXISTS idx_matches_round_order ON matches(round_order);
