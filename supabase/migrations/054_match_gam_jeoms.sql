-- Typed gam-jeom (penalty) events for WT result recording + player stats.
--
-- One row per gam-jeom. A gam-jeom awards +1 point to the opponent (already
-- reflected in the round score the staff enters), so these rows do NOT add to
-- the score — they record WHO committed WHICH violation, in WHICH round, for:
--   1. the 5-per-round automatic round-loss rule (count per round/player), and
--   2. player statistics broken down by violation category.
--
-- gam_jeom_type is a TEXT value validated app-side against the configurable
-- taxonomy in lib/constants/wt-rules.ts (not a rigid PG enum, so the rules can
-- change cycle-to-cycle without a migration).

CREATE TABLE IF NOT EXISTS match_gam_jeoms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 4),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  gam_jeom_type TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_gam_jeoms_match_id  ON match_gam_jeoms(match_id);
CREATE INDEX IF NOT EXISTS idx_match_gam_jeoms_player_id ON match_gam_jeoms(player_id);
CREATE INDEX IF NOT EXISTS idx_match_gam_jeoms_type      ON match_gam_jeoms(gam_jeom_type);

ALTER TABLE match_gam_jeoms ENABLE ROW LEVEL SECURITY;

-- Public can read (powers public results + player stats).
CREATE POLICY "match_gam_jeoms_select_policy" ON match_gam_jeoms
  FOR SELECT USING (true);

-- Direct writes restricted to the tournament organizer (defense in depth).
-- The normal write path is the SECURITY DEFINER RPC save_match_scores_atomic,
-- with staff authorization enforced in the server action.
CREATE POLICY "match_gam_jeoms_manage_policy" ON match_gam_jeoms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_gam_jeoms.match_id
        AND t.organizer_id = (auth.jwt()->>'sub')
    )
  );
