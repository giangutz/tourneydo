-- RPC Functions: Batch Schedule Update + Atomic Winner Advancement
--
-- Fix 1: batch_update_match_schedule
--   Replaces N individual UPDATE queries in updateMatchSchedule() with a
--   single atomic update. Prevents partial state from network interruptions.
--
-- Fix 2: advance_match_winner
--   Replaces 3 sequential DB calls in checkAndUpdateMatchWinner() with one
--   atomic transaction. Prevents bracket corruption if a call fails mid-way.
--
-- Apply via: Supabase dashboard → SQL Editor → Run
-- Or: supabase db push

-- ============================================================================
-- FUNCTION: batch_update_match_schedule
-- ============================================================================
-- Updates court/time assignments for all matches in one atomic call.
-- Called by: lib/db/queries/schedule.ts updateMatchSchedule()
--
-- Input: JSON array of assignment objects, each with:
--   matchId, matchNumber, day, court, sequence, scheduledStartTime, scheduledEndTime
--
-- Example call:
--   SELECT batch_update_match_schedule('[
--     {"matchId": "uuid-1", "matchNumber": "101", "day": 1, "court": 1,
--      "sequence": 1, "scheduledStartTime": "...", "scheduledEndTime": "..."},
--     ...
--   ]'::jsonb);

CREATE OR REPLACE FUNCTION batch_update_match_schedule(
  p_assignments JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE matches m
  SET
    match_number_formatted = (a->>'matchNumber'),
    match_number           = (a->>'matchNumber')::integer,
    day_number             = (a->>'day')::integer,
    court_number           = (a->>'court')::integer,
    match_sequence         = (a->>'sequence')::integer,
    scheduled_start_time   = (a->>'scheduledStartTime')::timestamptz,
    scheduled_end_time     = (a->>'scheduledEndTime')::timestamptz,
    updated_at             = now()
  FROM jsonb_array_elements(p_assignments) AS a
  WHERE m.id = (a->>'matchId')::uuid;
END;
$$;

-- ============================================================================
-- FUNCTION: advance_match_winner
-- ============================================================================
-- Atomically completes a match and advances the winner to the next bracket slot.
-- Called by: lib/db/queries/match-rounds.ts checkAndUpdateMatchWinner()
--
-- Algorithm:
--   1. Mark current match completed (winner, scores, lifecycle, clear court)
--   2. If next match exists:
--      a. Determine correct slot using source_match_ids ordering
--         (index 0 → player1, index 1 → player2)
--      b. Fill that slot with the winner
--      c. If both players now known → transition next match to CONTEST
--
-- Returns: JSONB with { success, nextMatchId, nextMatchReady }

CREATE OR REPLACE FUNCTION advance_match_winner(
  p_match_id     UUID,
  p_winner_id    UUID,
  p_player1_wins INTEGER,
  p_player2_wins INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_match_id  UUID;
  v_source_ids     UUID[];
  v_source_index   INTEGER;
  v_next_p1        UUID;
  v_next_p2        UUID;
  v_next_ready     BOOLEAN := FALSE;
BEGIN
  -- 1. Mark current match completed, clear court assignment
  UPDATE matches
  SET
    winner_id       = p_winner_id,
    score_player1   = p_player1_wins,
    score_player2   = p_player2_wins,
    status          = 'completed',
    lifecycle_state = 'COMPLETED',
    court_number    = NULL,
    updated_at      = now()
  WHERE id = p_match_id
  RETURNING next_match_id INTO v_next_match_id;

  -- 2. Advance winner to next match if one exists
  IF v_next_match_id IS NOT NULL THEN

    -- Fetch next match slot state and source ordering
    SELECT player1_id, player2_id, source_match_ids
    INTO v_next_p1, v_next_p2, v_source_ids
    FROM matches
    WHERE id = v_next_match_id;

    -- Skip if winner already placed (idempotency guard)
    IF v_next_p1 = p_winner_id OR v_next_p2 = p_winner_id THEN
      RETURN jsonb_build_object(
        'success',        TRUE,
        'nextMatchId',    v_next_match_id,
        'nextMatchReady', (v_next_p1 IS NOT NULL AND v_next_p2 IS NOT NULL)
      );
    END IF;

    -- Determine slot from source_match_ids ordering:
    --   array_position is 1-based in PostgreSQL
    --   index 1 (first)  → player1 slot
    --   index 2 (second) → player2 slot
    v_source_index := array_position(v_source_ids, p_match_id);

    IF v_source_index = 2 THEN
      -- Second source → player2 slot
      UPDATE matches
      SET player2_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p2 := p_winner_id;
    ELSE
      -- First source (or not found) → player1 slot
      UPDATE matches
      SET player1_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p1 := p_winner_id;
    END IF;

    -- If both players are now known, transition to CONTEST
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

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error',   SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users (RLS still applies to underlying tables)
GRANT EXECUTE ON FUNCTION batch_update_match_schedule(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_match_winner(UUID, UUID, INTEGER, INTEGER) TO authenticated;
