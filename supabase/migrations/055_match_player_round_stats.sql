-- Per-technique counts per player per round, for player statistics.
--
-- Optional, stat-grade detail transcribed from the match slip (punch, body
-- kick, head kick, turning/spinning kicks). Player-keyed (one row per player
-- per round) so career aggregation is a simple GROUP BY player_id. These are
-- statistics only — the app does NOT compute the score from them (the final
-- round score is entered directly and is authoritative).

CREATE TABLE IF NOT EXISTS match_player_round_stats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id       UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number   INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 4),
  player_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  punch          INTEGER NOT NULL DEFAULT 0,
  body_kick      INTEGER NOT NULL DEFAULT 0,
  head_kick      INTEGER NOT NULL DEFAULT 0,
  spin_body_kick INTEGER NOT NULL DEFAULT 0,
  spin_head_kick INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, round_number, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_player_round_stats_match_id  ON match_player_round_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_player_round_stats_player_id ON match_player_round_stats(player_id);

ALTER TABLE match_player_round_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_player_round_stats_select_policy" ON match_player_round_stats
  FOR SELECT USING (true);

CREATE POLICY "match_player_round_stats_manage_policy" ON match_player_round_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = match_player_round_stats.match_id
        AND t.organizer_id = (auth.jwt()->>'sub')
    )
  );

CREATE TRIGGER update_match_player_round_stats_updated_at
  BEFORE UPDATE ON match_player_round_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
