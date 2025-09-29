-- Simple Clerk-Compatible Setup (No RLS conflicts)
-- This removes RLS policies that conflict with Clerk authentication

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('organizer', 'coach', 'athlete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS tournament_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS brackets CASCADE;
DROP TABLE IF EXISTS division_participants CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with TEXT id (compatible with Clerk)
CREATE TABLE profiles (
    id TEXT PRIMARY KEY, -- Clerk user ID
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'athlete',
    phone TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organizer_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    tournament_date DATE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    weigh_in_date DATE NOT NULL,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'draft',
    max_participants INTEGER,
    rules TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coach_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create athletes table
CREATE TABLE athletes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    belt_rank TEXT,
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
CREATE TABLE tournament_registrations (
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
CREATE TABLE divisions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    min_weight DECIMAL(5,2),
    max_weight DECIMAL(5,2),
    belt_rank_min TEXT NOT NULL,
    belt_rank_max TEXT NOT NULL,
    max_participants INTEGER DEFAULT 32,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create division participants table
CREATE TABLE division_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES tournament_registrations(id) ON DELETE CASCADE NOT NULL,
    seed_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(division_id, athlete_id)
);

-- Create brackets table
CREATE TABLE brackets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    bracket_type TEXT DEFAULT 'single_elimination',
    total_rounds INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
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
    status TEXT DEFAULT 'pending',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament results table
CREATE TABLE tournament_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    division_id UUID REFERENCES divisions(id) ON DELETE CASCADE NOT NULL,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
    placement INTEGER NOT NULL,
    medal_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_athletes_team ON athletes(team_id);
CREATE INDEX idx_athletes_profile ON athletes(profile_id);
CREATE INDEX idx_tournament_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_tournament_registrations_athlete ON tournament_registrations(athlete_id);
CREATE INDEX idx_divisions_tournament ON divisions(tournament_id);
CREATE INDEX idx_division_participants_division ON division_participants(division_id);
CREATE INDEX idx_matches_bracket ON matches(bracket_id);
CREATE INDEX idx_matches_round ON matches(round_number);

-- DISABLE RLS for now to avoid conflicts with Clerk
-- We'll handle authorization at the application level
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE athletes DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE division_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE brackets DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results DISABLE ROW LEVEL SECURITY;

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

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
