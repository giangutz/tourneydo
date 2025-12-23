-- Migration to add staff access policies for tournament_registrations
-- Staff needs to view registrations to manage weigh-ins, check-ins, etc.

-- Policy: Staff can view registrations for tournaments they are assigned to
CREATE POLICY "Staff can view registrations"
ON tournament_registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM tournament_staff 
    WHERE tournament_staff.tournament_id = tournament_registrations.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
  )
);

-- Policy: Staff (weigh_in_staff, staff, admin, official) can update registrations (for weigh-in data)
-- Note: Limiting columns in RLS UPDATE is not supported directly in the USING clause easily for columns, 
-- but granular role checks can be done. 
-- For now, giving update access to staff who have weigh-in capabilities.
CREATE POLICY "Staff can update registrations"
ON tournament_registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM tournament_staff 
    WHERE tournament_staff.tournament_id = tournament_registrations.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.role IN ('admin', 'staff', 'official', 'weigh_in_staff', 'registration_manager')
  )
);
