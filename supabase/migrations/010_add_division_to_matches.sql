-- Add division and category references to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES tournament_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_division_id ON matches(division_id);
CREATE INDEX IF NOT EXISTS idx_matches_category_id ON matches(category_id);
