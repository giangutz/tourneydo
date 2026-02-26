-- Migration 049: RPC for reversing bracket advancement (rescore / dispute)
--
-- reverse_match_advancement atomically:
--   1. Reads the match's winner and next_match_id
--   2. Clears the winner from the next match's player slot (if the next match
--      has NOT started or completed — if it has, raises an exception)
--   3. Reverts the next match lifecycle back to WAITING (only one player now known)
--   4. Resets the current match to its pre-completion state (in_progress, no winner,
--      no win_method, no winning_round) so scores can be re-entered
--
-- Called by the rescore-match server action BEFORE saving new scores.

CREATE OR REPLACE FUNCTION reverse_match_advancement(
  p_match_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_winner_id       UUID;
  v_next_match_id   UUID;
  v_next_lifecycle  TEXT;
BEGIN
  -- 1. Load current match state
  SELECT winner_id, next_match_id
  INTO v_winner_id, v_next_match_id
  FROM matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;

  IF v_winner_id IS NULL THEN
    -- Nothing to reverse: match was not yet completed
    RETURN jsonb_build_object('success', TRUE, 'message', 'Match had no winner to reverse');
  END IF;

  -- 2. Check the downstream match (if any) is still reversible
  IF v_next_match_id IS NOT NULL THEN
    SELECT lifecycle_state INTO v_next_lifecycle
    FROM matches
    WHERE id = v_next_match_id;

    IF v_next_lifecycle IN ('IN_PROGRESS', 'COMPLETED') THEN
      RAISE EXCEPTION
        'Cannot rescore: the downstream match is already % and cannot be reversed automatically',
        v_next_lifecycle;
    END IF;

    -- 3. Clear the winner from the next match's player slot
    UPDATE matches
    SET
      player1_id      = CASE WHEN player1_id = v_winner_id THEN NULL ELSE player1_id END,
      player2_id      = CASE WHEN player2_id = v_winner_id THEN NULL ELSE player2_id END,
      lifecycle_state = 'WAITING',   -- revert: only one player remains
      updated_at      = now()
    WHERE id = v_next_match_id;
  END IF;

  -- 4. Reset the current match to in_progress (scores preserved in match_rounds;
  --    cleared from denormalized columns in the subsequent save_match_scores_atomic call)
  UPDATE matches
  SET
    winner_id       = NULL,
    score_player1   = NULL,
    score_player2   = NULL,
    status          = 'in_progress',
    lifecycle_state = 'IN_PROGRESS',
    win_method      = 'SCORE',
    winning_round   = NULL,
    actual_end_time = NULL,
    updated_at      = now()
  WHERE id = p_match_id;

  RETURN jsonb_build_object(
    'success',       TRUE,
    'nextMatchId',   v_next_match_id,
    'reversedFrom',  p_match_id
  );
END;
$$;
