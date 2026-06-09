-- Extend save_match_scores_atomic for WT result recording.
--
-- Adds (all backward-compatible — new params default to empty):
--   * Round UPSERT so a 4th (golden-point) round can be inserted on save.
--   * p_gam_jeoms  — typed penalty events, replace-then-insert for the match.
--   * p_techniques — per-player-per-round technique counts, replace-then-insert.
--
-- Round scores are entered as final (already include gam-jeom points); the
-- gam-jeom rows are for the round-loss rule + stats only. Denormalized
-- score_round1..3 sync to `matches` is unchanged (round 4 lives only in
-- match_rounds — a golden-point match correctly shows the 1–1 regulation tally).
--
-- SECURITY DEFINER: staff authorization is enforced in the server action
-- (checkTournamentAccess) before this is called.

CREATE OR REPLACE FUNCTION save_match_scores_atomic(
  p_match_id   UUID,
  p_rounds     JSONB,
  p_gam_jeoms  JSONB DEFAULT '[]'::jsonb,
  p_techniques JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_round  JSONB;
  v_gj     JSONB;
  v_tech   JSONB;
  v_r1_p1  INTEGER := 0;
  v_r1_p2  INTEGER := 0;
  v_r2_p1  INTEGER := 0;
  v_r2_p2  INTEGER := 0;
  v_r3_p1  INTEGER := 0;
  v_r3_p2  INTEGER := 0;
  v_w1     UUID;
  v_w2     UUID;
  v_w3     UUID;
  v_rn     INTEGER;
  v_winner UUID;
BEGIN
  -- 1. Upsert each round row (supports round 4 = golden point)
  FOR v_round IN SELECT * FROM jsonb_array_elements(p_rounds)
  LOOP
    v_rn := (v_round->>'round_number')::integer;
    v_winner := CASE
                  WHEN v_round->>'winner_id' IS NOT NULL AND v_round->>'winner_id' != 'null'
                  THEN (v_round->>'winner_id')::uuid ELSE NULL END;

    INSERT INTO match_rounds (match_id, round_number, score_player1, score_player2, winner_id, status)
    VALUES (
      p_match_id,
      v_rn,
      (v_round->>'score_player1')::integer,
      (v_round->>'score_player2')::integer,
      v_winner,
      CASE WHEN (v_round->>'score_player1')::integer = 0
            AND (v_round->>'score_player2')::integer = 0
           THEN 'pending' ELSE 'completed' END
    )
    ON CONFLICT (match_id, round_number) DO UPDATE
    SET score_player1 = EXCLUDED.score_player1,
        score_player2 = EXCLUDED.score_player2,
        winner_id     = EXCLUDED.winner_id,
        status        = EXCLUDED.status,
        updated_at    = now();

    IF v_rn = 1 THEN
      v_r1_p1 := (v_round->>'score_player1')::integer;
      v_r1_p2 := (v_round->>'score_player2')::integer; v_w1 := v_winner;
    ELSIF v_rn = 2 THEN
      v_r2_p1 := (v_round->>'score_player1')::integer;
      v_r2_p2 := (v_round->>'score_player2')::integer; v_w2 := v_winner;
    ELSIF v_rn = 3 THEN
      v_r3_p1 := (v_round->>'score_player1')::integer;
      v_r3_p2 := (v_round->>'score_player2')::integer; v_w3 := v_winner;
    END IF;
  END LOOP;

  -- 2. Sync denormalized per-round scores (rounds 1–3) to matches table
  UPDATE matches
  SET score_round1_player1 = v_r1_p1, score_round1_player2 = v_r1_p2,
      score_round2_player1 = v_r2_p1, score_round2_player2 = v_r2_p2,
      score_round3_player1 = v_r3_p1, score_round3_player2 = v_r3_p2,
      winner_round1 = v_w1, winner_round2 = v_w2, winner_round3 = v_w3,
      updated_at = now()
  WHERE id = p_match_id;

  -- 3. Replace gam-jeom events for this match
  DELETE FROM match_gam_jeoms WHERE match_id = p_match_id;
  FOR v_gj IN SELECT * FROM jsonb_array_elements(p_gam_jeoms)
  LOOP
    INSERT INTO match_gam_jeoms (match_id, round_number, player_id, gam_jeom_type)
    VALUES (
      p_match_id,
      (v_gj->>'round_number')::integer,
      (v_gj->>'player_id')::uuid,
      v_gj->>'gam_jeom_type'
    );
  END LOOP;

  -- 4. Replace technique stats for this match
  DELETE FROM match_player_round_stats WHERE match_id = p_match_id;
  FOR v_tech IN SELECT * FROM jsonb_array_elements(p_techniques)
  LOOP
    INSERT INTO match_player_round_stats
      (match_id, round_number, player_id, punch, body_kick, head_kick, spin_body_kick, spin_head_kick)
    VALUES (
      p_match_id,
      (v_tech->>'round_number')::integer,
      (v_tech->>'player_id')::uuid,
      COALESCE((v_tech->>'punch')::integer, 0),
      COALESCE((v_tech->>'body_kick')::integer, 0),
      COALESCE((v_tech->>'head_kick')::integer, 0),
      COALESCE((v_tech->>'spin_body_kick')::integer, 0),
      COALESCE((v_tech->>'spin_head_kick')::integer, 0)
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
