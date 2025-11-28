-- Add missing fields to tournament_registrations table
ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS coach_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));

-- Create index for coach_id
CREATE INDEX IF NOT EXISTS idx_registrations_coach_id ON tournament_registrations(coach_id);

-- Update RLS policy to allow organizers to read registrations
CREATE POLICY "Organizers can read registrations for their tournaments"
  ON tournament_registrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );
