-- Athlete Readiness Tracking
-- Implements WT-style operational gate for match start confirmation
-- Does NOT affect scheduling, numbering, or dependencies

-- Create match_athlete_readiness table
CREATE TABLE IF NOT EXISTS match_athlete_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  called BOOLEAN NOT NULL DEFAULT false,
  called_at TIMESTAMPTZ,
  called_by TEXT, -- Clerk user ID (text-based)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one record per athlete per match
  UNIQUE(match_id, athlete_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_match_athlete_readiness_match 
  ON match_athlete_readiness(match_id);

CREATE INDEX IF NOT EXISTS idx_match_athlete_readiness_called 
  ON match_athlete_readiness(match_id, called);

CREATE INDEX IF NOT EXISTS idx_match_athlete_readiness_athlete 
  ON match_athlete_readiness(athlete_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_match_athlete_readiness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER match_athlete_readiness_updated_at
  BEFORE UPDATE ON match_athlete_readiness
  FOR EACH ROW
  EXECUTE FUNCTION update_match_athlete_readiness_updated_at();

-- RLS Policies
ALTER TABLE match_athlete_readiness ENABLE ROW LEVEL SECURITY;

-- Allow tournament organizers to manage readiness
CREATE POLICY "Tournament organizers can manage athlete readiness"
  ON match_athlete_readiness
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_athlete_readiness.match_id
        AND t.organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- Allow anyone to view readiness (for public displays)
CREATE POLICY "Anyone can view athlete readiness"
  ON match_athlete_readiness
  FOR SELECT
  USING (true);

-- Helper function to initialize readiness for a match
CREATE OR REPLACE FUNCTION initialize_match_readiness(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_player1_id UUID;
  v_player2_id UUID;
BEGIN
  -- Get player IDs from match
  SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
  FROM matches
  WHERE id = p_match_id;
  
  -- Create readiness records if players exist
  IF v_player1_id IS NOT NULL THEN
    INSERT INTO match_athlete_readiness (match_id, athlete_id, called)
    VALUES (p_match_id, v_player1_id, false)
    ON CONFLICT (match_id, athlete_id) DO NOTHING;
  END IF;
  
  IF v_player2_id IS NOT NULL THEN
    INSERT INTO match_athlete_readiness (match_id, athlete_id, called)
    VALUES (p_match_id, v_player2_id, false)
    ON CONFLICT (match_id, athlete_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get readiness status for a match
CREATE OR REPLACE FUNCTION get_match_readiness_status(p_match_id UUID)
RETURNS TABLE(
  athlete1_called BOOLEAN,
  athlete2_called BOOLEAN
) AS $$
DECLARE
  v_player1_id UUID;
  v_player2_id UUID;
  v_athlete1_called BOOLEAN := false;
  v_athlete2_called BOOLEAN := false;
BEGIN
  -- Get player IDs
  SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
  FROM matches
  WHERE id = p_match_id;
  
  -- Get athlete 1 readiness
  IF v_player1_id IS NOT NULL THEN
    SELECT COALESCE(called, false) INTO v_athlete1_called
    FROM match_athlete_readiness
    WHERE match_id = p_match_id AND athlete_id = v_player1_id;
  END IF;
  
  -- Get athlete 2 readiness
  IF v_player2_id IS NOT NULL THEN
    SELECT COALESCE(called, false) INTO v_athlete2_called
    FROM match_athlete_readiness
    WHERE match_id = p_match_id AND athlete_id = v_player2_id;
  END IF;
  
  RETURN QUERY SELECT v_athlete1_called, v_athlete2_called;
END;
$$ LANGUAGE plpgsql;

-- Initialize readiness for all existing CONTEST matches
DO $$
DECLARE
  match_record RECORD;
BEGIN
  FOR match_record IN 
    SELECT id FROM matches 
    WHERE lifecycle_state = 'CONTEST' 
      AND (player1_id IS NOT NULL OR player2_id IS NOT NULL)
  LOOP
    PERFORM initialize_match_readiness(match_record.id);
  END LOOP;
END $$;
