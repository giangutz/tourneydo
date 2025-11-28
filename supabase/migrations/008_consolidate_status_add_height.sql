-- Update tournament_registrations table to consolidate status
-- Remove payment_status and update status to include payment states

-- Step 1: Drop the existing status check constraint first
ALTER TABLE tournament_registrations
  DROP CONSTRAINT IF EXISTS tournament_registrations_status_check;

-- Step 2: Migrate existing data
UPDATE tournament_registrations
SET status = CASE
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN status = 'approved' THEN 'verified'
  ELSE 'pending'
END;

-- Step 3: Drop the payment_status column
ALTER TABLE tournament_registrations
  DROP COLUMN IF EXISTS payment_status;

-- Step 4: Add the new status check constraint
ALTER TABLE tournament_registrations
  ADD CONSTRAINT tournament_registrations_status_check 
  CHECK (status IN ('pending', 'verified', 'paid'));

-- Add height column to players table
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);

-- Add comment for clarity
COMMENT ON COLUMN players.height IS 'Player height in centimeters';
