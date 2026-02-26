-- Migration: Convert tournament_staff.role (single text) to roles (text array)
-- This allows staff members to hold multiple roles simultaneously.

-- ============================================================
-- Step 1: Drop RLS policies that depend on the old role column
-- (must happen BEFORE we drop the column)
-- ============================================================
DROP POLICY IF EXISTS "Staff can update registrations" ON tournament_registrations;
DROP POLICY IF EXISTS "Staff can update matches" ON matches;
DROP POLICY IF EXISTS "Staff can update match_rounds" ON match_rounds;
DROP POLICY IF EXISTS "Staff can view registrations" ON tournament_registrations;

-- ============================================================
-- Step 2: Migrate the column
-- ============================================================

-- Add the new array column
ALTER TABLE tournament_staff ADD COLUMN roles text[] DEFAULT '{}';

-- Copy existing single role value into the array
UPDATE tournament_staff SET roles = ARRAY[role];

-- Make roles NOT NULL
ALTER TABLE tournament_staff ALTER COLUMN roles SET NOT NULL;

-- Drop the old single-role column
ALTER TABLE tournament_staff DROP COLUMN role;

-- Validate array contents — must be known roles, at least one
ALTER TABLE tournament_staff ADD CONSTRAINT tournament_staff_roles_check
  CHECK (
    roles <@ ARRAY['admin','staff','official','bracket_manager','registration_manager','weigh_in_staff']::text[]
    AND array_length(roles, 1) >= 1
  );

-- GIN index for array search
CREATE INDEX IF NOT EXISTS idx_tournament_staff_roles ON tournament_staff USING GIN (roles);

-- ============================================================
-- Step 3: Recreate RLS policies using the new roles[] column
-- ============================================================

-- tournament_registrations: SELECT (any active staff)
CREATE POLICY "Staff can view registrations"
ON tournament_registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tournament_staff
    WHERE tournament_staff.tournament_id = tournament_registrations.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
  )
);

-- tournament_registrations: UPDATE (weigh-in and registration roles)
CREATE POLICY "Staff can update registrations"
ON tournament_registrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournament_staff
    WHERE tournament_staff.tournament_id = tournament_registrations.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.roles && ARRAY['admin','staff','official','weigh_in_staff','registration_manager']::text[]
  )
);

-- matches: UPDATE (bracket and scoring roles)
CREATE POLICY "Staff can update matches"
ON matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournament_staff
    WHERE tournament_staff.tournament_id = matches.tournament_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.roles && ARRAY['admin','staff','official','bracket_manager']::text[]
  )
);

-- match_rounds: UPDATE (scoring roles)
CREATE POLICY "Staff can update match_rounds"
ON match_rounds FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM matches
    JOIN tournament_staff ON tournament_staff.tournament_id = matches.tournament_id
    WHERE matches.id = match_rounds.match_id
      AND tournament_staff.user_id = (auth.jwt() ->> 'sub')
      AND tournament_staff.status = 'active'
      AND tournament_staff.roles && ARRAY['admin','staff','official','bracket_manager']::text[]
  )
);
