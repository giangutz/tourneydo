-- Performance Indexes - Phase 3 Optimization
--
-- These indexes target the most common query patterns:
--   1. Tournament list filtered by status, ordered by date
--   2. Registration lookups per tournament (participant counts, status filters)
--   3. Match queries per division/round (bracket rendering)
--
-- All indexes use CONCURRENTLY to avoid locking tables during migration.
-- Safe to run on production without downtime.
-- Apply via: Supabase dashboard → SQL Editor, or `supabase db push`

-- Speed up tournament list queries (status filter + date sort)
-- Used by: getTournamentsByOrganizerId, tournament list pages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournaments_status_created
  ON tournaments(status, created_at DESC);

-- Speed up registration lookups per tournament
-- Used by: getTournamentParticipants, participant count queries, status filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_registrations_tournament_status
  ON tournament_registrations(tournament_id, status);

-- Speed up match queries per division/round (bracket rendering)
-- Used by: getMatchesWithReadiness, bracket generation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_division_round
  ON matches(division_id, round);
