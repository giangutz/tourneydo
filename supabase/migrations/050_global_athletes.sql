-- Migration 050: Global Athlete Registry
--
-- Implements the athlete deduplication strategy described in the implementation
-- plan. The same physical athlete can exist as multiple `players` rows under
-- different coaches. This table provides a canonical identity record that
-- player rows can optionally link to, enabling accurate cross-tournament
-- analytics and club rankings.
--
-- IMPORTANT: Do NOT add a unique constraint on (first_name, last_name, dob)
-- directly on the `players` table — that breaks the coach-scoped workflow and
-- does not handle edge cases (same-name siblings, name changes, common names).
--
-- ─── How it works ─────────────────────────────────────────────────────────────
-- 1. `global_athletes` stores one canonical record per real-world athlete.
-- 2. `players.global_athlete_id` is a nullable FK pointing to the canonical row.
--    It starts NULL for all existing rows and is populated only after a manual
--    merge confirmation by an organizer.
-- 3. A dedup job (future cron or one-off script) surfaces candidate matches:
--    player rows across coaches with the same (first_name, last_name, dob, gender).
-- 4. An organizer reviews candidates in the Merge UI and confirms links.
-- 5. Analytics queries JOIN through `global_athlete_id` to aggregate medals /
--    rankings across tournaments while preserving coach-scoped player records.
--
-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS global_athletes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Canonical identity fields (set when first confirmed, may be corrected later)
  canonical_first_name  TEXT NOT NULL,
  canonical_last_name   TEXT NOT NULL,
  dob         DATE,
  gender                TEXT,   -- 'male' | 'female' | 'non-binary' | null

  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- organizer who confirmed the merge

  -- Derived stats (denormalised for performance — refreshed by analytics job)
  total_tournaments  INTEGER NOT NULL DEFAULT 0,
  total_gold         INTEGER NOT NULL DEFAULT 0,
  total_silver       INTEGER NOT NULL DEFAULT 0,
  total_bronze       INTEGER NOT NULL DEFAULT 0
);

-- ─── Link players to global records ───────────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS global_athlete_id UUID
    REFERENCES global_athletes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_global_athlete_id
  ON players (global_athlete_id)
  WHERE global_athlete_id IS NOT NULL;

-- ─── Merge log ────────────────────────────────────────────────────────────────
-- Tracks every merge decision for auditability. An organizer can undo a
-- mistaken merge by clearing players.global_athlete_id and inserting a new
-- global_athletes row.

CREATE TABLE IF NOT EXISTS athlete_merge_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_athlete_id   UUID NOT NULL REFERENCES global_athletes(id) ON DELETE CASCADE,
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  merged_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  merged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_athlete_merge_log_global
  ON athlete_merge_log (global_athlete_id);

-- ─── Deduplication candidate view ─────────────────────────────────────────────
-- Returns groups of player rows that share the same (normalised first name,
-- last name, DOB) and are not yet linked to any global record. Used by the
-- merge UI to surface candidates without running an expensive full-table scan
-- every time.

CREATE OR REPLACE VIEW dedup_candidates AS
SELECT
  lower(trim(first_name))   AS norm_first,
  lower(trim(last_name))    AS norm_last,
  dob,
  COUNT(*)                  AS player_count,
  array_agg(id ORDER BY created_at) AS player_ids
FROM players
WHERE global_athlete_id IS NULL
  AND first_name IS NOT NULL
  AND last_name  IS NOT NULL
  AND dob IS NOT NULL
GROUP BY
  lower(trim(first_name)),
  lower(trim(last_name)),
  dob
HAVING COUNT(*) > 1;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE global_athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_merge_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read global athlete records
CREATE POLICY "authenticated_read_global_athletes"
  ON global_athletes FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users (organizers) can insert / update
CREATE POLICY "authenticated_manage_global_athletes"
  ON global_athletes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_merge_log"
  ON athlete_merge_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_merge_log"
  ON athlete_merge_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── Trigger: updated_at ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_global_athletes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_global_athletes_updated_at
  BEFORE UPDATE ON global_athletes
  FOR EACH ROW EXECUTE FUNCTION touch_global_athletes_updated_at();
