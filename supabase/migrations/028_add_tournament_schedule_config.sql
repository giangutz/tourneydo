-- Tournament-level schedule configuration
CREATE TABLE IF NOT EXISTS tournament_schedule_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  daily_start_time TIME NOT NULL DEFAULT '09:00',
  daily_end_time TIME NOT NULL DEFAULT '20:00',
  courts INTEGER NOT NULL DEFAULT 1,
  
  -- Detailed time configuration per division (in seconds)
  gradeschool_round_time INTEGER DEFAULT 90, -- 1.5 minutes per round
  gradeschool_kyeshi_time INTEGER DEFAULT 60, -- 1 minute medical timeout
  gradeschool_rest_between_rounds INTEGER DEFAULT 30, -- 30 seconds between rounds
  
  cadet_round_time INTEGER DEFAULT 90,
  cadet_kyeshi_time INTEGER DEFAULT 60,
  cadet_rest_between_rounds INTEGER DEFAULT 30,
  
  junior_round_time INTEGER DEFAULT 120, -- 2 minutes per round
  junior_kyeshi_time INTEGER DEFAULT 60,
  junior_rest_between_rounds INTEGER DEFAULT 30,
  
  senior_round_time INTEGER DEFAULT 120,
  senior_kyeshi_time INTEGER DEFAULT 60,
  senior_rest_between_rounds INTEGER DEFAULT 30,
  
  -- Match duration defaults (minutes) - for backward compatibility
  default_sparring_duration INTEGER DEFAULT 10,
  default_poomsae_duration INTEGER DEFAULT 8,
  default_breaking_duration INTEGER DEFAULT 5,
  
  -- Scheduling constraints
  max_divisions_per_day INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id)
);

-- Division-level priority and scheduling
CREATE TABLE IF NOT EXISTS division_schedule_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES tournament_divisions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL,
  participant_count INTEGER DEFAULT 0, -- Auto-calculated from registrations
  competition_type VARCHAR(20) DEFAULT 'sparring',
  avg_match_duration INTEGER,
  estimated_match_count INTEGER,
  estimated_total_minutes INTEGER,
  
  -- Scheduled day (optional assignment)
  scheduled_day INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, division_id, category_id)
);

-- Add match numbering columns to matches table
ALTER TABLE matches 
  ADD COLUMN IF NOT EXISTS match_number_formatted VARCHAR(10), -- MXYZ format (e.g., M205)
  ADD COLUMN IF NOT EXISTS match_number_legacy VARCHAR(20), -- Preserve old match numbers
  ADD COLUMN IF NOT EXISTS day_number INTEGER,
  ADD COLUMN IF NOT EXISTS match_sequence INTEGER;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_matches_schedule 
  ON matches(tournament_id, day_number, court_number, match_sequence);

CREATE INDEX IF NOT EXISTS idx_matches_formatted_number 
  ON matches(tournament_id, match_number_formatted);

-- Function to archive match numbers
CREATE OR REPLACE FUNCTION archive_match_numbers(p_tournament_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE matches
  SET match_number_legacy = match_number_formatted
  WHERE tournament_id = p_tournament_id
    AND match_number_formatted IS NOT NULL
    AND match_number_legacy IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for new tables (copying pattern from other tables)
ALTER TABLE tournament_schedule_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_schedule_config ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (public schedule)
CREATE POLICY "Public read tournament schedule" ON tournament_schedule_config
  FOR SELECT USING (true);

CREATE POLICY "Public read division schedule" ON division_schedule_config
  FOR SELECT USING (true);

-- Allow organizers to manage their tournament schedule
CREATE POLICY "Organizers manage tournament schedule" ON tournament_schedule_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_schedule_config.tournament_id
      AND t.organizer_id = auth.uid()::text
    )
  );

CREATE POLICY "Organizers manage division schedule" ON division_schedule_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = division_schedule_config.tournament_id
      AND t.organizer_id = auth.uid()::text
    )
  );
