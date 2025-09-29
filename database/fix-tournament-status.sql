-- Fix tournament status to allow registration
-- This will make the "Nationals 2025" tournament available for registration

-- Update the tournament status to registration_open
UPDATE tournaments 
SET 
    status = 'registration_open',
    registration_deadline = CURRENT_DATE + INTERVAL '30 days'
WHERE name = 'Nationals 2025' OR id = 'e1354812-df33-4394-980d-8b793d8e62bc';

-- Verify the update
SELECT 
    id, 
    name, 
    status, 
    registration_deadline,
    start_date,
    end_date
FROM tournaments 
WHERE name = 'Nationals 2025' OR id = 'e1354812-df33-4394-980d-8b793d8e62bc';

-- Also create the team_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'approved', 'rejected', 'paid', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id),
    notes TEXT,
    athlete_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add email column to athletes table if it doesn't exist
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS email TEXT;

-- Add constraint for email format if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_email_format' 
        AND table_name = 'athletes'
    ) THEN
        ALTER TABLE athletes ADD CONSTRAINT check_email_format 
        CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Add weight and height columns with proper names if they don't exist
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);

-- Add weight_recorded and height_recorded to tournament_registrations if they don't exist
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS weight_recorded DECIMAL(5,2);
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS height_recorded DECIMAL(5,2);
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON SCRIPT IS 'Fix tournament status and add missing database columns for registration functionality';
