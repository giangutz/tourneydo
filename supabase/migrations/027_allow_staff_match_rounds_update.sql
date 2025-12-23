-- Policy: Staff can update match_rounds (for scoring)
-- Roles: admin, staff, official, bracket_manager
-- This is required because updating a match score updates the match_rounds table.

CREATE POLICY "Staff can update match_rounds"
ON match_rounds
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM matches
    JOIN tournament_staff ON tournament_staff.tournament_id = matches.tournament_id
    WHERE matches.id = match_rounds.match_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.role IN ('admin', 'staff', 'official', 'bracket_manager')
  )
);
