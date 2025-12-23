-- Migration to update tournament_staff roles
-- Remove old check constraint and add new one with expanded roles

DO $$ 
BEGIN
  -- Drop the existing constraint if it exists. 
  -- Note: We rely on the naming convention or exact match.
  -- If the previous migration didn't name it explicitly, Postgres usually names it tournament_staff_role_check
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tournament_staff_role_check') THEN
    ALTER TABLE tournament_staff DROP CONSTRAINT tournament_staff_role_check;
  END IF;
END $$;

-- Add the new constraint
ALTER TABLE tournament_staff 
ADD CONSTRAINT tournament_staff_role_check 
CHECK (role IN ('admin', 'staff', 'official', 'bracket_manager', 'registration_manager', 'weigh_in_staff'));
