-- Add division_move_policy to tournaments table
-- This controls whether participants can be moved between divisions during weigh-in
-- or if they can only be disqualified

-- Create ENUM type for division move policy
DO $$ BEGIN
  CREATE TYPE division_move_policy AS ENUM ('allow_move', 'disqualify_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS division_move_policy division_move_policy DEFAULT 'allow_move';

-- Add comment for documentation
COMMENT ON COLUMN tournaments.division_move_policy IS 
  'Controls weigh-in policy: allow_move allows moving participants to different divisions, disqualify_only only allows disqualification';
