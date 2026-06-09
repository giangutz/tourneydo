-- Migration 058: Tournament placement / medal records
--
-- Stores gold / silver / bronze placements per division after a bracket
-- completes.  Two bronze medals are awarded in WT Taekwondo (both
-- semi-final losers receive bronze — there is no 3rd-place match).
--
-- Rows are replaced atomically whenever a final-match result is saved or
-- rescored, so the table always reflects the current bracket outcome.

CREATE TABLE IF NOT EXISTS tournament_placements (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID         NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  division_id   UUID         REFERENCES tournament_divisions(id) ON DELETE SET NULL,
  category_id   UUID         REFERENCES tournament_categories(id) ON DELETE SET NULL,
  player_id     UUID         NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  placement     INTEGER      NOT NULL CHECK (placement IN (1, 2, 3)),
  medal         TEXT         NOT NULL CHECK (medal IN ('gold', 'silver', 'bronze')),
  computed_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Allow fast lookups by tournament (for results page) and by player (for stats)
CREATE INDEX IF NOT EXISTS idx_tournament_placements_tournament
  ON tournament_placements (tournament_id, division_id, category_id, placement);

CREATE INDEX IF NOT EXISTS idx_tournament_placements_player
  ON tournament_placements (player_id);

-- Row-level security
ALTER TABLE tournament_placements ENABLE ROW LEVEL SECURITY;

-- Anyone can read placement results (public results page)
CREATE POLICY "public_read_placements"
  ON tournament_placements FOR SELECT
  USING (true);

-- Only the tournament organizer may write
CREATE POLICY "organizer_manage_placements"
  ON tournament_placements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_placements.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_placements.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  );
