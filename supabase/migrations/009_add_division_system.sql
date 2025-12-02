-- Add gender column to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

-- Create tournament_divisions table
CREATE TABLE IF NOT EXISTS tournament_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Gradeschool', 'Cadet', 'Junior', 'Senior'
  min_age INTEGER, -- NULL means no minimum
  max_age INTEGER, -- NULL means no maximum
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tournament_categories table (weight/height classes within divisions)
CREATE TABLE IF NOT EXISTS tournament_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES tournament_divisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'FIN', 'FLY', 'Group 1'
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'both')),
  min_weight DECIMAL(5,2), -- in kg
  max_weight DECIMAL(5,2), -- in kg
  min_height DECIMAL(5,2), -- in cm
  max_height DECIMAL(5,2), -- in cm
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add division and category references to tournament_registrations
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES tournament_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_divisions_tournament_id ON tournament_divisions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_categories_division_id ON tournament_categories(division_id);
CREATE INDEX IF NOT EXISTS idx_registrations_division_id ON tournament_registrations(division_id);
CREATE INDEX IF NOT EXISTS idx_registrations_category_id ON tournament_registrations(category_id);

-- Enable RLS
ALTER TABLE tournament_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for divisions
CREATE POLICY "Everyone can read divisions"
  ON tournament_divisions
  FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage divisions for their tournaments"
  ON tournament_divisions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_divisions.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );

-- RLS Policies for categories
CREATE POLICY "Everyone can read categories"
  ON tournament_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage categories for their divisions"
  ON tournament_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournament_divisions td
      JOIN tournaments t ON t.id = td.tournament_id
      WHERE td.id = tournament_categories.division_id
      AND t.organizer_id = (select auth.jwt()->>'sub')
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_tournament_divisions_updated_at
  BEFORE UPDATE ON tournament_divisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_categories_updated_at
  BEFORE UPDATE ON tournament_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
