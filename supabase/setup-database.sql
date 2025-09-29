-- TourneyDo Database Setup Script
-- Run this in your Supabase SQL Editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('organizer', 'coach', 'athlete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tournament_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'weigh_in', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE belt_rank AS ENUM ('white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black_1', 'black_2', 'black_3', 'black_4', 'black_5', 'black_6', 'black_7', 'black_8', 'black_9');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender AS ENUM ('male', 'female');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'athlete',
    phone TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
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

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create athletes table
CREATE TABLE IF NOT EXISTS athletes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender NOT NULL,
    belt_rank belt_rank NOT NULL,
    weight_class DECIMAL(5,2),
    height DECIMAL(5,2),
    actual_weight DECIMAL(5,2),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament registrations table
CREATE TABLE IF NOT EXISTS tournament_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_status TEXT DEFAULT 'pending',
    payment_amount DECIMAL(10,2),
    notes TEXT,
    checked_in BOOLEAN DEFAULT FALSE,
    weighed_in BOOLEAN DEFAULT FALSE,
    UNIQUE(tournament_id, athlete_id)
);

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
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

-- Create division participants table
CREATE TABLE IF NOT EXISTS division_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES tournament_registrations(id) ON DELETE CASCADE NOT NULL,
    seed_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(division_id, athlete_id)
);

-- Create brackets table
CREATE TABLE IF NOT EXISTS brackets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    bracket_type TEXT DEFAULT 'single_elimination',
    total_rounds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
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

-- Create tournament results table
CREATE TABLE IF NOT EXISTS tournament_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    placement INTEGER NOT NULL,
    medal_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_athletes_team ON athletes(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_athlete ON tournament_registrations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_divisions_tournament ON divisions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_division_participants_division ON division_participants(division_id);
CREATE INDEX IF NOT EXISTS idx_matches_bracket ON matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_number);

-- Enable Row Level Security (RLS)
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

-- Create RLS policies

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Tournaments policies
DROP POLICY IF EXISTS "Anyone can view published tournaments" ON tournaments;
CREATE POLICY "Anyone can view published tournaments" ON tournaments
    FOR SELECT USING (status != 'draft');

DROP POLICY IF EXISTS "Organizers can manage their tournaments" ON tournaments;
CREATE POLICY "Organizers can manage their tournaments" ON tournaments
    FOR ALL USING (auth.uid() = organizer_id);

-- Teams policies
DROP POLICY IF EXISTS "Coaches can manage their teams" ON teams;
CREATE POLICY "Coaches can manage their teams" ON teams
    FOR ALL USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
CREATE POLICY "Anyone can view teams" ON teams
    FOR SELECT USING (true);

-- Athletes policies
DROP POLICY IF EXISTS "Athletes can view their own profile" ON athletes;
CREATE POLICY "Athletes can view their own profile" ON athletes
    FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Coaches can manage their team athletes" ON athletes;
CREATE POLICY "Coaches can manage their team athletes" ON athletes
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE coach_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tournament organizers can view registered athletes" ON athletes;
CREATE POLICY "Tournament organizers can view registered athletes" ON athletes
    FOR SELECT USING (
        id IN (
            SELECT athlete_id FROM tournament_registrations tr
            JOIN tournaments t ON tr.tournament_id = t.id
            WHERE t.organizer_id = auth.uid()
        )
    );

-- Tournament registrations policies
DROP POLICY IF EXISTS "Coaches can manage their team registrations" ON tournament_registrations;
CREATE POLICY "Coaches can manage their team registrations" ON tournament_registrations
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE coach_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tournament organizers can view registrations" ON tournament_registrations;
CREATE POLICY "Tournament organizers can view registrations" ON tournament_registrations
    FOR SELECT USING (
        tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id = auth.uid()
        )
    );

-- Create function for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_athletes_updated_at ON athletes;
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brackets_updated_at ON brackets;
CREATE TRIGGER update_brackets_updated_at BEFORE UPDATE ON brackets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a test profile (optional - remove this if you don't want test data)
-- This will only work if you have a user in auth.users already
-- INSERT INTO profiles (id, email, full_name, role) 
-- SELECT id, email, 'Test User', 'organizer' 
-- FROM auth.users 
-- WHERE email = 'your-email@example.com'
-- ON CONFLICT (id) DO NOTHING;
