-- RPC Function: save_match_scores_atomic
--
-- Replaces the sequential round-update loop + score-sync block in
-- save-match-scores.ts with a single atomic transaction. Prevents partial
-- state when a network error occurs mid-save (e.g. rounds written but
-- denormalized match scores not yet synced).
--
-- Input: p_match_id UUID
--        p_rounds   JSONB  -- array of 3 objects:
--          [{round_number, score_player1, score_player2, winner_id}]
--
-- Example call:
--   SELECT save_match_scores_atomic(
--     'match-uuid',
--     '[
--       {"round_number":1,"score_player1":3,"score_player2":1,"winner_id":"player-uuid"},
--       {"round_number":2,"score_player1":2,"score_player2":4,"winner_id":"player2-uuid"},
--       {"round_number":3,"score_player1":0,"score_player2":0,"winner_id":null}
--     ]'::jsonb
--   );

CREATE OR REPLACE FUNCTION save_match_scores_atomic(
  p_match_id UUID,
  p_rounds   JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_round      JSONB;
  v_r1_p1      INTEGER := 0;
  v_r1_p2      INTEGER := 0;
  v_r2_p1      INTEGER := 0;
  v_r2_p2      INTEGER := 0;
  v_r3_p1      INTEGER := 0;
  v_r3_p2      INTEGER := 0;
  v_w1         UUID;
  v_w2         UUID;
  v_w3         UUID;
  v_rn         INTEGER;
BEGIN
  -- 1. Update each round row
  FOR v_round IN SELECT * FROM jsonb_array_elements(p_rounds)
  LOOP
    v_rn := (v_round->>'round_number')::integer;

    UPDATE match_rounds
    SET
      score_player1 = (v_round->>'score_player1')::integer,
      score_player2 = (v_round->>'score_player2')::integer,
      winner_id     = CASE
                        WHEN v_round->>'winner_id' IS NOT NULL AND v_round->>'winner_id' != 'null'
                        THEN (v_round->>'winner_id')::uuid
                        ELSE NULL
                      END,
      status        = CASE
                        WHEN (v_round->>'score_player1')::integer = 0
                         AND (v_round->>'score_player2')::integer = 0
                        THEN 'pending'
                        ELSE 'completed'
                      END,
      updated_at    = now()
    WHERE match_id = p_match_id
      AND round_number = v_rn;

    -- Capture per-round values for denormalized sync below
    IF v_rn = 1 THEN
      v_r1_p1 := (v_round->>'score_player1')::integer;
      v_r1_p2 := (v_round->>'score_player2')::integer;
      v_w1    := CASE WHEN v_round->>'winner_id' IS NOT NULL AND v_round->>'winner_id' != 'null'
                      THEN (v_round->>'winner_id')::uuid ELSE NULL END;
    ELSIF v_rn = 2 THEN
      v_r2_p1 := (v_round->>'score_player1')::integer;
      v_r2_p2 := (v_round->>'score_player2')::integer;
      v_w2    := CASE WHEN v_round->>'winner_id' IS NOT NULL AND v_round->>'winner_id' != 'null'
                      THEN (v_round->>'winner_id')::uuid ELSE NULL END;
    ELSIF v_rn = 3 THEN
      v_r3_p1 := (v_round->>'score_player1')::integer;
      v_r3_p2 := (v_round->>'score_player2')::integer;
      v_w3    := CASE WHEN v_round->>'winner_id' IS NOT NULL AND v_round->>'winner_id' != 'null'
                      THEN (v_round->>'winner_id')::uuid ELSE NULL END;
    END IF;
  END LOOP;

  -- 2. Sync denormalized per-round scores to matches table
  UPDATE matches
  SET
    score_round1_player1 = v_r1_p1,
    score_round1_player2 = v_r1_p2,
    score_round2_player1 = v_r2_p1,
    score_round2_player2 = v_r2_p2,
    score_round3_player1 = v_r3_p1,
    score_round3_player2 = v_r3_p2,
    winner_round1        = v_w1,
    winner_round2        = v_w2,
    winner_round3        = v_w3,
    updated_at           = now()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
