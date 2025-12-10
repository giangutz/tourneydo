-- Allow organizers to delete registrations for their tournaments
CREATE POLICY "Organizers can delete registrations for their tournaments"
  ON tournament_registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = tournament_registrations.tournament_id
      AND tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );
