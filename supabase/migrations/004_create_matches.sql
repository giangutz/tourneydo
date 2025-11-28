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
