-- Migration 051: Enforce globally unique team names (case-insensitive)
--
-- Club/gym names must be unique across all coaches to ensure accurate
-- club performance rankings and leaderboards. "Lions FC" and "lions fc"
-- are treated as the same club.
--
-- Why a partial unique index and not a column UNIQUE constraint?
-- A functional index on lower(trim(name)) handles case and whitespace
-- normalization without changing the stored value.

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name_lower_unique
  ON teams (lower(trim(name)));
