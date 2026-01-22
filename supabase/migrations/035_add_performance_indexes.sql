-- Performance optimization indexes
-- These composite indexes improve query performance for common access patterns
-- Note: CONCURRENTLY removed to allow execution in Supabase SQL editor (transaction context)

-- Index for filtering registrations by tournament and status (used in participants list)
CREATE INDEX IF NOT EXISTS idx_registrations_tournament_status 
  ON tournament_registrations(tournament_id, status);

-- Index for filtering matches by tournament and status (used in bracket/schedule views)
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status 
  ON matches(tournament_id, status);

-- Index for weigh-in filtering (tournament + selected + status)
CREATE INDEX IF NOT EXISTS idx_registrations_weigh_in_composite 
  ON tournament_registrations(tournament_id, weigh_in_selected, status);

-- Index for filtering registrations by coach (improves getActiveRegistrationCount)
CREATE INDEX IF NOT EXISTS idx_registrations_team_tournament
  ON tournament_registrations(team_id, tournament_id);
