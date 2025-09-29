-- Migration: Add Members and Email System Tables
-- Created: 2024-09-28
-- Description: Adds member management and email notification system

-- Create new enum types for members
CREATE TYPE member_role AS ENUM ('admin', 'bracket_manager', 'standard_member');
CREATE TYPE member_status AS ENUM ('active', 'inactive');

-- Members table (for organizer team management)
-- Note: Using UUID for organizer_id to match auth.users.id type
CREATE TABLE members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    role member_role NOT NULL DEFAULT 'standard_member',
    status member_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organizer_id, email)
);

-- Tournament members table (for assigning members to specific tournaments)
CREATE TABLE tournament_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    role member_role NOT NULL DEFAULT 'standard_member',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) NOT NULL,
    UNIQUE(tournament_id, member_id)
);

-- Email preferences table
CREATE TABLE email_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    tournament_reminders BOOLEAN DEFAULT true,
    registration_updates BOOLEAN DEFAULT true,
    result_notifications BOOLEAN DEFAULT false,
    marketing_communications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs table (for tracking sent emails)
CREATE TABLE email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider_response JSONB,
    error_message TEXT
);

-- Enable RLS for new tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Members policies
CREATE POLICY "Organizers can manage their members" ON members
    FOR ALL USING (auth.uid() = organizer_id);

CREATE POLICY "Members can view their own info" ON members
    FOR SELECT USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Tournament members policies
CREATE POLICY "Organizers can manage tournament members" ON tournament_members
    FOR ALL USING (
        tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Members can view tournament assignments" ON tournament_members
    FOR SELECT USING (
        member_id IN (
            SELECT id FROM members WHERE email = (
                SELECT email FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Email preferences policies
CREATE POLICY "Users can manage their email preferences" ON email_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Email logs policies (service role only)
CREATE POLICY "Service role can manage email logs" ON email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Add triggers for updated_at columns
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON email_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_members_organizer_id ON members(organizer_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_tournament_members_tournament_id ON tournament_members(tournament_id);
CREATE INDEX idx_tournament_members_member_id ON tournament_members(member_id);
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- Insert default email preferences for existing users
INSERT INTO email_preferences (user_id, email_notifications, tournament_reminders, registration_updates, result_notifications, marketing_communications)
SELECT 
    id,
    true,  -- email_notifications
    true,  -- tournament_reminders  
    true,  -- registration_updates
    false, -- result_notifications
    false  -- marketing_communications
FROM profiles
ON CONFLICT (user_id) DO NOTHING;
