-- Migration to add missing policies for staff access
-- 1. Allow authenticated users to view teams (needed for staff to see team details in registration lists)
-- 2. Allow staff to update matches (needed for scoring)

-- Policy: Authenticated users can view teams
-- Note: 'teams' table contains public info about teams (name, coach name via join).
-- Currently only 'anon' and 'coach owner' have access. Authenticated staff need access too.
CREATE POLICY "Authenticated users can view teams"
ON teams
FOR SELECT
USING (
  auth.role() = 'authenticated'
);

-- Policy: Staff can update matches (for scoring, scheduling)
-- Roles: admin, staff, official, bracket_manager
CREATE POLICY "Staff can update matches"
ON matches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM tournament_staff 
    WHERE tournament_staff.tournament_id = matches.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.role IN ('admin', 'staff', 'official', 'bracket_manager')
  )
);
