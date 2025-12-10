-- Allow tournament organizers to insert registrations for their tournaments
CREATE POLICY "Organizers can insert registrations for their tournaments"
ON tournament_registrations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE tournaments.id = tournament_registrations.tournament_id
    AND tournaments.organizer_id = (SELECT auth.jwt() ->> 'sub')
  )
);
