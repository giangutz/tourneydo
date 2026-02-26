-- Migration 052: Add payments and payment_players tables
--
-- The payments table was previously created manually in Supabase. This migration
-- formalises the schema and adds the payment_players junction table so that
-- per-player payment tracking and status updates work correctly.
-- All DDL uses IF NOT EXISTS / DROP IF EXISTS so it is idempotent.

-- ============================================================================
-- 1. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id          UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id         TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount           NUMERIC     NOT NULL,
  reference_number TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tournament_id ON payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payments_team_id       ON payments(team_id);
CREATE INDEX IF NOT EXISTS idx_payments_coach_id      ON payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_status        ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Coaches can create and view their own payments
DROP POLICY IF EXISTS "Coaches can manage own payments" ON payments;
CREATE POLICY "Coaches can manage own payments"
  ON payments
  USING  (coach_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (coach_id = (auth.jwt() ->> 'sub'));

-- Organizers can view payments for their tournaments
DROP POLICY IF EXISTS "Organizers can view tournament payments" ON payments;
CREATE POLICY "Organizers can view tournament payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = payments.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- Organizers can update payment status (verify / reject)
DROP POLICY IF EXISTS "Organizers can update payment status" ON payments;
CREATE POLICY "Organizers can update payment status"
  ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = payments.tournament_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- ============================================================================
-- 2. PAYMENT_PLAYERS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_players (
  payment_id UUID        NOT NULL REFERENCES payments(id)  ON DELETE CASCADE,
  player_id  UUID        NOT NULL REFERENCES players(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (payment_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_players_payment_id ON payment_players(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_players_player_id  ON payment_players(player_id);

ALTER TABLE payment_players ENABLE ROW LEVEL SECURITY;

-- Coaches can view payment_players for their own payments
DROP POLICY IF EXISTS "Coaches can view their payment players" ON payment_players;
CREATE POLICY "Coaches can view their payment players"
  ON payment_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments
      WHERE payments.id = payment_players.payment_id
        AND payments.coach_id = (auth.jwt() ->> 'sub')
    )
  );

-- Organizers can view payment_players for their tournaments
DROP POLICY IF EXISTS "Organizers can view tournament payment players" ON payment_players;
CREATE POLICY "Organizers can view tournament payment players"
  ON payment_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments
      JOIN tournaments ON tournaments.id = payments.tournament_id
      WHERE payments.id = payment_players.payment_id
        AND tournaments.organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- Coaches can insert payment_players only for their own payments
DROP POLICY IF EXISTS "Coaches can insert payment players for own payments" ON payment_players;
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
