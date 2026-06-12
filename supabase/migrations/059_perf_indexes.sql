-- ============================================================================
-- 059_perf_indexes.sql
-- Performance indexes for scale (10k athletes / 7.5k+ matches per tournament).
--
-- Audit finding (D2): getTournamentMatches() runs on every bracket / court /
-- matches page load and always filters by tournament_id then ORDER BY round,
-- match_number. The only matching index was idx_matches_tournament_id, which
-- forces Postgres to sort all of a tournament's matches in memory every load.
-- A composite (tournament_id, round, match_number) lets the planner satisfy the
-- filter AND the ordering from the index, eliminating the sort.
--
-- NOTE on next_match_id: deliberately NOT indexed. Every runtime use is
-- `WHERE id = <next_match_id value>` (a primary-key lookup); the only filter on
-- next_match_id itself is the one-time DAG backfill in migration 033, so an
-- index would add write cost for no runtime benefit.
--
-- NOTE on locking: this repo's convention is plain CREATE INDEX IF NOT EXISTS
-- (migrations run transactionally). On a very large live matches table, prefer
-- building this CONCURRENTLY out-of-band to avoid blocking writes during build.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matches_tournament_round_number
  ON matches (tournament_id, round, match_number);
