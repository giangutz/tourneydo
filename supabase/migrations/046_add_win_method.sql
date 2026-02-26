-- Add win_method and winning_round to matches
--
-- win_method:    How the match was decided (SCORE by default; KO/TKO/DQ for
--                early termination; WITHDRAWAL/FORFEIT for non-play outcomes)
-- winning_round: The round number in which the match ended (NULL means it
--                ran all required rounds and was decided by score total)
--
-- The advance_match_winner RPC is updated below to accept and store the new
-- parameter so bracket advancement correctly records the method.

-- 1. Create enum
CREATE TYPE win_method AS ENUM (
  'SCORE',       -- Normal best-of-3 rounds by point total
  'KO',          -- Knock-out: opponent cannot continue
  'TKO',         -- Technical knock-out: referee stops contest
  'DQ',          -- Disqualification
  'WITHDRAWAL',  -- Athlete withdraws before/during match
  'FORFEIT'      -- Team/coach forfeits on behalf of athlete
);

-- 2. Add columns to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS win_method    win_method DEFAULT 'SCORE',
  ADD COLUMN IF NOT EXISTS winning_round INTEGER     DEFAULT NULL;

-- 3. Update advance_match_winner to accept and store win_method
CREATE OR REPLACE FUNCTION advance_match_winner(
  p_match_id     UUID,
  p_winner_id    UUID,
  p_player1_wins INTEGER,
  p_player2_wins INTEGER,
  p_win_method   win_method DEFAULT 'SCORE',
  p_winning_round INTEGER   DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_match_id  UUID;
  v_source_ids     UUID[];
  v_source_index   INTEGER;
  v_next_p1        UUID;
  v_next_p2        UUID;
  v_next_ready     BOOLEAN := FALSE;
BEGIN
  -- 1. Mark current match completed, clear court, store win method
  UPDATE matches
  SET
    winner_id       = p_winner_id,
    score_player1   = p_player1_wins,
    score_player2   = p_player2_wins,
    status          = 'completed',
    lifecycle_state = 'COMPLETED',
    win_method      = p_win_method,
    winning_round   = p_winning_round,
    court_number    = NULL,
    updated_at      = now()
  WHERE id = p_match_id
  RETURNING next_match_id INTO v_next_match_id;

  -- 2. Advance winner to next match using source_match_ids ordering
  IF v_next_match_id IS NOT NULL THEN
    SELECT player1_id, player2_id, source_match_ids
    INTO v_next_p1, v_next_p2, v_source_ids
    FROM matches
    WHERE id = v_next_match_id;

    -- Determine slot: index 1 → player1, index 2 → player2
    v_source_index := array_position(v_source_ids, p_match_id);

    IF v_source_index = 2 THEN
      UPDATE matches SET player2_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p2 := p_winner_id;
    ELSE
      UPDATE matches SET player1_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p1 := p_winner_id;
    END IF;

    -- 3. Transition next match to CONTEST if both players now known
    IF v_next_p1 IS NOT NULL AND v_next_p2 IS NOT NULL THEN
      UPDATE matches
      SET lifecycle_state = 'CONTEST', updated_at = now()
      WHERE id = v_next_match_id;
      v_next_ready := TRUE;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',        TRUE,
    'nextMatchId',    v_next_match_id,
    'nextMatchReady', v_next_ready
  );
END;
$$;
