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
