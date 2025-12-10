-- Add RLS policy to allow organizers to create and update players for their tournaments
-- This allows organizers to add participants to their tournaments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organizers can create players for their tournaments" ON players;
DROP POLICY IF EXISTS "Organizers can update players in their tournaments" ON players;

-- Allow organizers to create players for participants in their tournaments
CREATE POLICY "Organizers can create players for their tournaments"
  ON players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.organizer_id = (select auth.jwt()->>'sub')
    )
  );

-- Allow organizers to update players registered in their tournaments
CREATE POLICY "Organizers can update players in their tournaments"
  ON players
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournament_registrations tr
      JOIN tournaments t ON t.id = tr.tournament_id
      WHERE tr.player_id = players.id
      AND t.organizer_id = (select auth.jwt()->>'sub')
    )
  );
