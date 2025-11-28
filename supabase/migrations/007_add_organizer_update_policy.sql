-- Add RLS policy to allow tournament organizers to update registrations for their tournaments

CREATE POLICY "Organizers can update registrations for their tournaments"
  ON tournament_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );
