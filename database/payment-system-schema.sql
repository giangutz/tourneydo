-- Enhanced Payment System Schema for TourneyDo

-- Add payment methods to tournaments table
ALTER TABLE tournaments 
ADD COLUMN payment_methods TEXT[] DEFAULT ARRAY['Bank Transfer', 'GCash', 'PayMaya', 'Cash', 'Check'];

-- Add coach_id to teams table for multi-team coach support
ALTER TABLE teams 
ADD COLUMN coach_id UUID REFERENCES profiles(id);

-- Create team_payments table for coach payment submissions
CREATE TABLE team_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id),
    team_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    participant_count INTEGER NOT NULL,
    registration_ids UUID[] NOT NULL,
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_team_payments_tournament_id ON team_payments(tournament_id);
CREATE INDEX idx_team_payments_coach_id ON team_payments(coach_id);
CREATE INDEX idx_team_payments_status ON team_payments(status);
CREATE INDEX idx_teams_coach_id ON teams(coach_id);

-- Add weight_recorded and notes columns to tournament_registrations
ALTER TABLE tournament_registrations 
ADD COLUMN weight_recorded DECIMAL(5,2),
ADD COLUMN notes TEXT;

-- Update payment_status to include new statuses
ALTER TABLE tournament_registrations 
DROP CONSTRAINT IF EXISTS tournament_registrations_payment_status_check;

ALTER TABLE tournament_registrations 
ADD CONSTRAINT tournament_registrations_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'pending_approval'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for team_payments updated_at
CREATE TRIGGER update_team_payments_updated_at 
    BEFORE UPDATE ON team_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for team_payments
ALTER TABLE team_payments ENABLE ROW LEVEL SECURITY;

-- Coaches can view and insert their own team payments
CREATE POLICY "Coaches can manage their team payments" ON team_payments
    FOR ALL USING (
        auth.uid() = coach_id OR 
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = team_payments.tournament_id 
            AND t.organizer_id = auth.uid()
        )
    );

-- Tournament organizers can view and update all payments for their tournaments
CREATE POLICY "Organizers can manage tournament payments" ON team_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments t 
            WHERE t.id = team_payments.tournament_id 
            AND t.organizer_id = auth.uid()
        )
    );

-- Update teams RLS policy to include coach_id
DROP POLICY IF EXISTS "Users can view teams" ON teams;
CREATE POLICY "Users can view teams" ON teams
    FOR SELECT USING (true);

CREATE POLICY "Coaches can manage their teams" ON teams
    FOR ALL USING (auth.uid() = coach_id);

-- Sample data for testing
INSERT INTO teams (name, coach_id, description) VALUES 
('Dragons Taekwondo Club', (SELECT id FROM profiles WHERE role = 'coach' LIMIT 1), 'Elite training center'),
('Phoenix Martial Arts', (SELECT id FROM profiles WHERE role = 'coach' LIMIT 1), 'Community dojo'),
('Thunder Kicks Academy', (SELECT id FROM profiles WHERE role = 'coach' LIMIT 1), 'Youth development program');

-- Update existing teams to have coach_id
UPDATE teams SET coach_id = (
    SELECT p.id FROM profiles p 
    WHERE p.role = 'coach' 
    ORDER BY RANDOM() 
    LIMIT 1
) WHERE coach_id IS NULL;

COMMENT ON TABLE team_payments IS 'Stores team payment submissions from coaches for tournament registration fees';
COMMENT ON COLUMN team_payments.registration_ids IS 'Array of tournament_registration IDs included in this payment';
COMMENT ON COLUMN team_payments.reference_number IS 'Last 4-6 digits of payment reference number for verification';
COMMENT ON COLUMN team_payments.status IS 'Payment approval status: pending, approved, or rejected';
COMMENT ON COLUMN teams.coach_id IS 'References the coach who manages this team';
COMMENT ON COLUMN tournaments.payment_methods IS 'Available payment methods for this tournament';
COMMENT ON COLUMN tournament_registrations.weight_recorded IS 'Official weight recorded during weigh-in';
COMMENT ON COLUMN tournament_registrations.notes IS 'Additional notes for registration, check-in, or weigh-in';
