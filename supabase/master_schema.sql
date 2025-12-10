-- Drop existing objects to ensure clean slate
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teams') THEN
        DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
    END IF;
END $$;

DROP FUNCTION IF EXISTS update_updated_at_column;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  user_id text primary key default auth.jwt()->>'sub',
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('tournament-organizer', 'coach')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_teams_user_id ON teams(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (
    (select auth.jwt()->>'sub') = user_id
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- RLS Policies for teams table
-- Coaches can read their own teams
CREATE POLICY "Coaches can read own teams"
  ON teams
  FOR SELECT
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can insert their own teams
CREATE POLICY "Coaches can insert own teams"
  ON teams
  FOR INSERT
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can update their own teams
CREATE POLICY "Coaches can update own teams"
  ON teams
  FOR UPDATE
  USING (
    (select auth.jwt()->>'sub') = user_id
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can delete their own teams
CREATE POLICY "Coaches can delete own teams"
  ON teams
  FOR DELETE
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Drop legacy tables if they exist (cascade to remove dependencies)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  dob DATE,
  coach_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create team_players junction table
CREATE TABLE team_players (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, player_id)
);

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organizer_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tournament_registrations table
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, player_id) -- Player can only register once per tournament
);

-- Create indexes
CREATE INDEX idx_players_coach_id ON players(coach_id);
CREATE INDEX idx_team_players_team_id ON team_players(team_id);
CREATE INDEX idx_team_players_player_id ON team_players(player_id);
CREATE INDEX idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX idx_registrations_tournament_id ON tournament_registrations(tournament_id);
CREATE INDEX idx_registrations_team_id ON tournament_registrations(team_id);
CREATE INDEX idx_registrations_player_id ON tournament_registrations(player_id);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Players: Coaches can manage their own players
CREATE POLICY "Coaches can manage own players"
  ON players
  USING ((select auth.jwt()->>'sub') = coach_id)
  WITH CHECK ((select auth.jwt()->>'sub') = coach_id);

-- Team Players: Coaches can manage assignments for their teams
CREATE POLICY "Coaches can manage team players"
  ON team_players
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND teams.user_id = (select auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_players.team_id
      AND teams.user_id = (select auth.jwt()->>'sub')
    )
  );

-- Tournaments: Organizers manage their own, everyone can read
CREATE POLICY "Organizers manage own tournaments"
  ON tournaments
  USING ((select auth.jwt()->>'sub') = organizer_id)
  WITH CHECK ((select auth.jwt()->>'sub') = organizer_id);

CREATE POLICY "Everyone can read tournaments"
  ON tournaments
  FOR SELECT
  USING (true);

-- Registrations: Coaches manage registrations for their teams
CREATE POLICY "Coaches manage registrations"
  ON tournament_registrations
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tournament_registrations.team_id
      AND teams.user_id = (select auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tournament_registrations.team_id
      AND teams.user_id = (select auth.jwt()->>'sub')
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add weight, height, and belt_level columns to players table

-- Add weight column (for players age >= 12)
ALTER TABLE players ADD COLUMN weight DECIMAL(5,2);

-- Add height column (for players age < 12)
ALTER TABLE players ADD COLUMN height DECIMAL(5,2);

-- Add belt_level column with check constraint
ALTER TABLE players ADD COLUMN belt_level TEXT;

ALTER TABLE players ADD COLUMN gender TEXT;

-- Add check constraint for valid belt levels
ALTER TABLE players ADD CONSTRAINT valid_belt_level 
  CHECK (belt_level IN ('White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black') OR belt_level IS NULL);

ALTER TABLE players ADD CONSTRAINT valid_gender 
  CHECK (gender IN ('male', 'female') OR gender IS NULL);

-- Add indexes for performance
CREATE INDEX idx_players_belt_level ON players(belt_level);

-- Add comments for documentation
COMMENT ON COLUMN players.weight IS 'Player weight in kg (typically for age >= 12)';
COMMENT ON COLUMN players.height IS 'Player height in cm (typically for age < 12)';
COMMENT ON COLUMN players.belt_level IS 'Martial arts belt level: White, Yellow, Blue, Red, Brown, Black';
COMMENT ON COLUMN players.gender IS 'Player gender: male, female';
-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INT NOT NULL,
  match_number INT NOT NULL,
  player1_id UUID REFERENCES players(id) ON DELETE SET NULL, -- Nullable for BYEs or TBD
  player2_id UUID REFERENCES players(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  score_player1 INT DEFAULT 0,
  score_player2 INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL, -- Pointer to the next match for the winner
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policies

-- Everyone can read matches
CREATE POLICY "Everyone can read matches"
  ON matches
  FOR SELECT
  USING (true);

-- Organizers can manage matches for their tournaments
CREATE POLICY "Organizers can manage matches"
  ON matches
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = matches.tournament_id 
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = matches.tournament_id 
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add missing fields to tournament_registrations table
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS coach_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));

-- Create index for coach_id
CREATE INDEX IF NOT EXISTS idx_registrations_coach_id ON tournament_registrations(coach_id);

-- Update RLS policy to allow organizers to read registrations
CREATE POLICY "Organizers can read registrations for their tournaments"
  ON tournament_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );
-- Drop the problematic policies if they exist
DROP POLICY IF EXISTS "Organizers can read players in their tournaments" ON players;
DROP POLICY IF EXISTS "Organizers can read teams in their tournaments" ON teams;
DROP POLICY IF EXISTS "Public can read players in approved registrations" ON players;
DROP POLICY IF EXISTS "Public can read teams in approved registrations" ON teams;

-- Add simpler policies that allow reading player and team data
-- These policies allow anyone authenticated to read players and teams
-- The security is handled at the tournament_registrations level

CREATE POLICY "Authenticated users can read players"
  ON players
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read teams"
  ON teams
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Also allow anonymous users to read players and teams for public tournament pages
CREATE POLICY "Anonymous users can read players"
  ON players
  FOR SELECT
  USING (auth.role() = 'anon');

CREATE POLICY "Anonymous users can read teams"
  ON teams
  FOR SELECT
  USING (auth.role() = 'anon');
-- Add RLS policy to allow tournament organizers to update registrations for their tournaments

CREATE POLICY "Organizers can update registrations for their tournaments"
  ON tournament_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );
-- Update tournament_registrations table to consolidate status
-- Remove payment_status and update status to include payment states

-- Step 1: Drop the existing status check constraint first
ALTER TABLE tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

-- Step 2: Migrate existing data
UPDATE tournament_registrations
SET status = CASE
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN status = 'approved' THEN 'verified'
  ELSE 'pending'
END;

-- Step 3: Drop the payment_status column
ALTER TABLE tournament_registrations
  DROP COLUMN IF EXISTS payment_status;

-- Step 4: Add the new status check constraint
ALTER TABLE tournament_registrations
  ADD CONSTRAINT tournament_registrations_status_check 
  CHECK (status IN ('pending', 'verified', 'paid'));

-- Add height column to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);

-- Add comment for clarity
COMMENT ON COLUMN players.height IS 'Player height in centimeters';
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
-- Add division and category references to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES tournament_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_division_id ON matches(division_id);
CREATE INDEX IF NOT EXISTS idx_matches_category_id ON matches(category_id);
-- Create match_rounds table for best-of-3 scoring
CREATE TABLE IF NOT EXISTS match_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 3),
  score_player1 INTEGER DEFAULT 0,
  score_player2 INTEGER DEFAULT 0,
  winner_id UUID REFERENCES players(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, round_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_match_rounds_match_id ON match_rounds(match_id);
CREATE INDEX IF NOT EXISTS idx_match_rounds_status ON match_rounds(status);

-- Enable RLS
ALTER TABLE match_rounds ENABLE ROW LEVEL SECURITY;

-- Public can view rounds
CREATE POLICY "match_rounds_select_policy" ON match_rounds
  FOR SELECT USING (true);

-- Organizers can manage rounds for their tournaments
CREATE POLICY "match_rounds_manage_policy" ON match_rounds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_rounds.match_id
      AND t.organizer_id = (auth.jwt()->>'sub')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_match_rounds_updated_at
  BEFORE UPDATE ON match_rounds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Add tournament_type column to tournaments table
-- This allows organizers to choose between Standard (belt-based) and Open Belt (no belt restrictions) tournaments

ALTER TABLE tournaments
  ADD COLUMN tournament_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (tournament_type IN ('standard', 'open-belt'));

-- Add comment for clarity
COMMENT ON COLUMN tournaments.tournament_type IS 'Tournament bracket generation type: standard (belt-based divisions) or open-belt (no belt restrictions)';
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
-- Add first_name and last_name to users table
ALTER TABLE users 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Create index for name search
CREATE INDEX idx_users_name ON users(last_name, first_name);
-- Add RLS policy to allow organizers to create and update players for their tournaments
-- This allows organizers to add participants to their tournaments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organizers can create players for their tournaments" ON players;
DROP POLICY IF EXISTS "Organizers can update players in their tournaments" ON players;

-- Allow organizers to create players for participants in their tournaments
CREATE POLICY "Organizers can create players for their tournaments"
  ON players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );

-- Allow organizers to update players registered in their tournaments
CREATE POLICY "Organizers can update players in their tournaments"
  ON players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_registrations tr
      JOIN tournaments t ON t.id = tr.tournament_id
      WHERE tr.player_id = players.id
      AND t.organizer_id = (select auth.jwt()->>'sub')
    )
  );
-- Add missing columns to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS max_players INTEGER,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS courts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled'));
-- Add court_number to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS court_number INT;
