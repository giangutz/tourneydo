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
