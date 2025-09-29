-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('organizer', 'coach', 'athlete');
CREATE TYPE tournament_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'weigh_in', 'in_progress', 'completed');
CREATE TYPE belt_rank AS ENUM ('white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black_1', 'black_2', 'black_3', 'black_4', 'black_5', 'black_6', 'black_7', 'black_8', 'black_9');
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE member_role AS ENUM ('admin', 'bracket_manager', 'standard_member');
CREATE TYPE member_status AS ENUM ('active', 'inactive');

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'athlete',
    phone TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    tournament_date DATE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    weigh_in_date DATE NOT NULL,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    status tournament_status DEFAULT 'draft',
    max_participants INTEGER,
    rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table (for coaches to manage their athletes)
CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Athletes table
CREATE TABLE athletes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    date_of_birth DATE NOT NULL,
    gender gender NOT NULL,
    belt_rank belt_rank NOT NULL,
    weight DECIMAL(5,2), -- in kg (renamed from weight_class)
    height DECIMAL(5,2), -- in cm
    actual_weight DECIMAL(5,2), -- weight at weigh-in
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Team payments table
CREATE TABLE team_payments (
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

-- Tournament registrations
CREATE TABLE tournament_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
    payment_amount DECIMAL(10,2),
    notes TEXT,
    checked_in BOOLEAN DEFAULT FALSE,
    weighed_in BOOLEAN DEFAULT FALSE,
    UNIQUE(tournament_id, athlete_id)
);

-- Divisions (auto-generated based on age, weight, belt, gender)
CREATE TABLE divisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    gender gender NOT NULL,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    min_weight DECIMAL(5,2),
    max_weight DECIMAL(5,2),
    belt_rank_min belt_rank NOT NULL,
    belt_rank_max belt_rank NOT NULL,
    max_participants INTEGER DEFAULT 32,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Division participants (athletes assigned to divisions)
CREATE TABLE division_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES tournament_registrations(id) ON DELETE CASCADE NOT NULL,
    seed_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(division_id, athlete_id)
);

-- Brackets
CREATE TABLE brackets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    bracket_type TEXT DEFAULT 'single_elimination',
    total_rounds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bracket_id UUID REFERENCES brackets(id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    participant1_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    participant2_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    participant1_score INTEGER DEFAULT 0,
    participant2_score INTEGER DEFAULT 0,
    status match_status DEFAULT 'pending',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Results and rankings
CREATE TABLE tournament_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    placement INTEGER NOT NULL, -- 1st, 2nd, 3rd, etc.
    medal_type TEXT, -- gold, silver, bronze
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_athletes_team ON athletes(team_id);
CREATE INDEX idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_tournament_registrations_athlete ON tournament_registrations(athlete_id);
CREATE INDEX idx_divisions_tournament ON divisions(tournament_id);
CREATE INDEX idx_division_participants_division ON division_participants(division_id);
CREATE INDEX idx_matches_bracket ON matches(bracket_id);
CREATE INDEX idx_matches_round ON matches(round_number);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Tournaments policies
CREATE POLICY "Anyone can view published tournaments" ON tournaments
    FOR SELECT USING (status != 'draft');

CREATE POLICY "Organizers can manage their tournaments" ON tournaments
    FOR ALL USING (auth.uid() = organizer_id);

-- Teams policies
CREATE POLICY "Coaches can manage their teams" ON teams
    FOR ALL USING (auth.uid() = coach_id);

CREATE POLICY "Anyone can view teams" ON teams
    FOR SELECT USING (true);

-- Athletes policies
CREATE POLICY "Athletes can view their own profile" ON athletes
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Coaches can manage their team athletes" ON athletes
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Tournament organizers can view registered athletes" ON athletes
    FOR SELECT USING (
        id IN (
            SELECT athlete_id FROM tournament_registrations tr
            JOIN tournaments t ON tr.tournament_id = t.id
            WHERE t.organizer_id = auth.uid()
        )
    );

-- Tournament registrations policies
CREATE POLICY "Coaches can manage their team registrations" ON tournament_registrations
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE coach_id = auth.uid()
        )
    );

CREATE POLICY "Tournament organizers can view registrations" ON tournament_registrations
    FOR SELECT USING (
        tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = auth.uid()
        )
    );

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brackets_updated_at BEFORE UPDATE ON brackets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Members table (for organizer team management)
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

-- Add RLS policies for members
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

-- Email logs policies (admin only for now)
CREATE POLICY "Service role can manage email logs" ON email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Add triggers for new tables
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON email_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
