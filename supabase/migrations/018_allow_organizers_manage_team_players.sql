-- Allow tournament organizers to manage team players for teams registered in their tournaments
-- Drop existing policies (both old and new names, in case migration is re-run)
DROP POLICY IF EXISTS "Coaches can manage team players" ON team_players;
DROP POLICY IF EXISTS "Coaches and organizers can manage team players" ON team_players;

-- Create new policy that allows:
-- 1. Team coaches to manage their own team players
-- 2. Tournament organizers to manage team players for teams in their tournaments
CREATE POLICY "Coaches and organizers can manage team players"
ON team_players
FOR ALL
USING (
  -- Team owner can manage
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_players.team_id
    AND teams.user_id = (SELECT auth.jwt() ->> 'sub')
  )
  OR
  -- Tournament organizer can manage if team is registered in their tournament
  EXISTS (
    SELECT 1 
    FROM tournament_registrations tr
    JOIN tournaments t ON t.id = tr.tournament_id
    WHERE tr.team_id = team_players.team_id
    AND t.organizer_id = (SELECT auth.jwt() ->> 'sub')
  )
)
WITH CHECK (
  -- Same logic for inserts/updates
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_players.team_id
    AND teams.user_id = (SELECT auth.jwt() ->> 'sub')
  )
  OR
  EXISTS (
    SELECT 1 
    FROM tournament_registrations tr
    JOIN tournaments t ON t.id = tr.tournament_id
    WHERE tr.team_id = team_players.team_id
    AND t.organizer_id = (SELECT auth.jwt() ->> 'sub')
  )
);
