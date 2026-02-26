-- Security Advisor Fixes
--
-- Addresses all warnings from Supabase security advisor:
--   1. RLS not enabled on public.tournament_expenses
--   2. Mutable search_path on 7 functions (allows search_path injection)
--   3. Always-true WITH CHECK on payment_players INSERT policy

-- ============================================================================
-- 1. ENABLE RLS ON tournament_expenses
-- ============================================================================
-- Table is exposed to PostgREST but had no row-level security.
-- Organizers can manage expenses for their own tournaments only.

ALTER TABLE tournament_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage their tournament expenses"
  ON tournament_expenses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_expenses.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_expenses.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- Staff can view expenses for tournaments they're assigned to
CREATE POLICY "Staff can view tournament expenses"
  ON tournament_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_staff
      WHERE tournament_staff.tournament_id = tournament_expenses.tournament_id
        AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
    )
  );


-- ============================================================================
-- 2. FIX MUTABLE search_path ON FUNCTIONS
-- ============================================================================
-- Without SET search_path, an attacker who can create objects in a schema
-- earlier in the search path can shadow built-in functions or tables.
-- Fix: pin each function to SET search_path = public, pg_temp.

-- 2a. update_updated_at_column (trigger helper, migration 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2b. archive_match_numbers (migration 028)
CREATE OR REPLACE FUNCTION archive_match_numbers(p_tournament_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE matches
  SET match_number_legacy = match_number_formatted
  WHERE tournament_id = p_tournament_id
    AND match_number_formatted IS NOT NULL
    AND match_number_legacy IS NULL;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2c. update_match_athlete_readiness_updated_at (trigger helper, migration 034)
CREATE OR REPLACE FUNCTION update_match_athlete_readiness_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2d. initialize_match_readiness (migration 034)
CREATE OR REPLACE FUNCTION initialize_match_readiness(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_player1_id UUID;
  v_player2_id UUID;
BEGIN
  SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
  FROM matches
  WHERE id = p_match_id;

  IF v_player1_id IS NOT NULL THEN
    INSERT INTO match_athlete_readiness (match_id, athlete_id, called)
    VALUES (p_match_id, v_player1_id, false)
    ON CONFLICT (match_id, athlete_id) DO NOTHING;
  END IF;

  IF v_player2_id IS NOT NULL THEN
    INSERT INTO match_athlete_readiness (match_id, athlete_id, called)
    VALUES (p_match_id, v_player2_id, false)
    ON CONFLICT (match_id, athlete_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2e. get_match_readiness_status (migration 034)
CREATE OR REPLACE FUNCTION get_match_readiness_status(p_match_id UUID)
RETURNS TABLE(
  athlete1_called BOOLEAN,
  athlete2_called BOOLEAN
) AS $$
DECLARE
  v_player1_id      UUID;
  v_player2_id      UUID;
  v_athlete1_called BOOLEAN := false;
  v_athlete2_called BOOLEAN := false;
BEGIN
  SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
  FROM matches
  WHERE id = p_match_id;

  IF v_player1_id IS NOT NULL THEN
    SELECT COALESCE(called, false) INTO v_athlete1_called
    FROM match_athlete_readiness
    WHERE match_id = p_match_id AND athlete_id = v_player1_id;
  END IF;

  IF v_player2_id IS NOT NULL THEN
    SELECT COALESCE(called, false) INTO v_athlete2_called
    FROM match_athlete_readiness
    WHERE match_id = p_match_id AND athlete_id = v_player2_id;
  END IF;

  RETURN QUERY SELECT v_athlete1_called, v_athlete2_called;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- 2f. batch_update_match_schedule (migration 041)
CREATE OR REPLACE FUNCTION batch_update_match_schedule(
  p_assignments JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 2g. advance_match_winner (migration 041)
CREATE OR REPLACE FUNCTION advance_match_winner(
  p_match_id     UUID,
  p_winner_id    UUID,
  p_player1_wins INTEGER,
  p_player2_wins INTEGER
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

    v_source_index := array_position(v_source_ids, p_match_id);

    IF v_source_index = 2 THEN
      UPDATE matches
      SET player2_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p2 := p_winner_id;
    ELSE
      UPDATE matches
      SET player1_id = p_winner_id, updated_at = now()
      WHERE id = v_next_match_id;
      v_next_p1 := p_winner_id;
    END IF;

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


-- ============================================================================
-- 3. FIX ALWAYS-TRUE INSERT POLICY ON payment_players
-- ============================================================================
-- The policy "Authenticated users can insert payment players" uses WITH CHECK (true),
-- allowing any authenticated user to insert rows for any payment.
-- Replace with a check that the user owns the referenced payment.
--
-- NOTE: Wrapped in a DO block so this migration is safe to run whether or not
-- payment_players has been created yet (migration 052 creates it with the
-- correct policy directly).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_players'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can insert payment players" ON payment_players;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'payment_players'
        AND policyname = 'Coaches can insert payment players for own payments'
    ) THEN
      CREATE POLICY "Coaches can insert payment players for own payments"
        ON payment_players
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM payments
            WHERE payments.id = payment_players.payment_id
              AND payments.coach_id = (auth.jwt() ->> 'sub')
          )
        );
    END IF;
  END IF;
END $$;
