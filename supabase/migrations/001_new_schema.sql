-- =============================================
-- TourneyDo Database Schema v2.0
-- Comprehensive, scalable schema with RLS policies
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables and types (in correct order)
DROP TABLE IF EXISTS tournament_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS brackets CASCADE;
DROP TABLE IF EXISTS division_participants CASCADE;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS tournament_registrations CASCADE;
DROP TABLE IF EXISTS team_payments CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS gender CASCADE;
DROP TYPE IF EXISTS belt_rank CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

-- =============================================
-- ENUMS AND TYPES
-- =============================================

CREATE TYPE user_role AS ENUM ('organizer', 'coach', 'athlete');
CREATE TYPE tournament_status AS ENUM ('draft', 'registration_open', 'registration_closed', 'weigh_in', 'in_progress', 'completed', 'cancelled');
CREATE TYPE belt_rank AS ENUM ('white', 'yellow', 'blue', 'red', 'brown', 'black');
CREATE TYPE gender AS ENUM ('male', 'female');
CREATE TYPE payment_status AS ENUM ('pending', 'pending_approval', 'approved', 'rejected', 'paid', 'refunded');
CREATE TYPE match_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- =============================================
-- =============================================

-- User profiles (linked to Clerk)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    phone TEXT,
    organization TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Tournaments
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    tournament_date DATE NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    weigh_in_date DATE NOT NULL,
    entry_fee DECIMAL(10,2) DEFAULT 0 CHECK (entry_fee >= 0),
    status tournament_status DEFAULT 'draft',
    max_participants INTEGER CHECK (max_participants > 0),
    rules TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_dates CHECK (tournament_date >= registration_deadline::date),
    CONSTRAINT valid_weigh_in CHECK (weigh_in_date <= tournament_date),
    CONSTRAINT valid_contact_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    organization TEXT,
    description TEXT,
    location TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_contact_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT unique_team_name_per_coach UNIQUE (coach_id, name)
);

-- Athletes
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional link to user profile
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    date_of_birth DATE NOT NULL,
    gender gender NOT NULL,
    belt_rank belt_rank NOT NULL,
    weight DECIMAL(5,2) CHECK (weight > 0), -- in kg
    height DECIMAL(5,2) CHECK (height > 0), -- in cm
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_age CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '5 years'),
    CONSTRAINT valid_emergency_phone CHECK (emergency_contact_phone IS NULL OR emergency_contact_phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Tournament registrations
CREATE TABLE tournament_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    payment_status payment_status DEFAULT 'pending',
    payment_amount DECIMAL(10,2) DEFAULT 0 CHECK (payment_amount >= 0),
    payment_reference TEXT,
    notes TEXT,
    checked_in BOOLEAN DEFAULT false,
    check_in_time TIMESTAMPTZ,
    weighed_in BOOLEAN DEFAULT false,
    weigh_in_time TIMESTAMPTZ,
    weight_recorded DECIMAL(5,2) CHECK (weight_recorded > 0),
    height_recorded DECIMAL(5,2) CHECK (height_recorded > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_athlete_tournament UNIQUE (tournament_id, athlete_id),
    CONSTRAINT valid_check_in CHECK (checked_in = false OR check_in_time IS NOT NULL),
    CONSTRAINT valid_weigh_in CHECK (weighed_in = false OR (weigh_in_time IS NOT NULL AND weight_recorded IS NOT NULL))
);

-- Team payments (for bulk registrations)
CREATE TABLE team_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status payment_status DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    notes TEXT,
    athlete_count INTEGER DEFAULT 0 CHECK (athlete_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_team_tournament_payment UNIQUE (tournament_id, team_id)
);

-- Divisions
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'gradeschool', 'cadet', 'junior', 'senior'
    gender gender NOT NULL,
    min_age INTEGER NOT NULL CHECK (min_age >= 5),
    max_age INTEGER NOT NULL CHECK (max_age >= min_age),
    min_weight DECIMAL(5,2) CHECK (min_weight > 0),
    max_weight DECIMAL(5,2) CHECK (max_weight IS NULL OR max_weight >= min_weight),
    min_height DECIMAL(5,2) CHECK (min_height > 0),
    max_height DECIMAL(5,2) CHECK (max_height IS NULL OR max_height >= min_height),
    belt_rank_min belt_rank,
    belt_rank_max belt_rank,
    max_participants INTEGER DEFAULT 32 CHECK (max_participants > 0),
    participant_count INTEGER DEFAULT 0 CHECK (participant_count >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_division_name UNIQUE (tournament_id, name)
);

-- Division participants
CREATE TABLE division_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
    seed_number INTEGER CHECK (seed_number > 0),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id),
    
    CONSTRAINT unique_athlete_division UNIQUE (division_id, athlete_id),
    CONSTRAINT unique_registration_division UNIQUE (division_id, registration_id)
);

-- Brackets
CREATE TABLE brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bracket_type TEXT DEFAULT 'single_elimination', -- 'single_elimination', 'double_elimination', 'round_robin'
    total_rounds INTEGER NOT NULL CHECK (total_rounds > 0),
    current_round INTEGER DEFAULT 1 CHECK (current_round > 0),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_bracket_per_division UNIQUE (division_id)
);

-- Matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bracket_id UUID NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL CHECK (round_number > 0),
    match_number INTEGER NOT NULL CHECK (match_number > 0),
    participant1_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    participant2_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES division_participants(id) ON DELETE SET NULL,
    participant1_score INTEGER DEFAULT 0 CHECK (participant1_score >= 0),
    participant2_score INTEGER DEFAULT 0 CHECK (participant2_score >= 0),
    status match_status DEFAULT 'pending',
    scheduled_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    referee_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_match_position UNIQUE (bracket_id, round_number, match_number),
    CONSTRAINT valid_participants CHECK (participant1_id != participant2_id),
    CONSTRAINT valid_winner CHECK (winner_id IS NULL OR winner_id IN (participant1_id, participant2_id)),
    CONSTRAINT valid_match_times CHECK (actual_start_time IS NULL OR actual_end_time IS NULL OR actual_end_time >= actual_start_time)
);

-- Tournament results
CREATE TABLE tournament_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL CHECK (placement > 0),
    medal_type TEXT CHECK (medal_type IN ('gold', 'silver', 'bronze')),
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_athlete_division_result UNIQUE (division_id, athlete_id),
    CONSTRAINT unique_placement_per_division UNIQUE (division_id, placement)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Tournaments indexes
CREATE INDEX idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_date ON tournaments(tournament_date);
CREATE INDEX idx_tournaments_public ON tournaments(is_public) WHERE is_public = true;

-- Teams indexes
CREATE INDEX idx_teams_coach ON teams(coach_id);
CREATE INDEX idx_teams_active ON teams(is_active) WHERE is_active = true;

-- Athletes indexes
CREATE INDEX idx_athletes_team ON athletes(team_id);
CREATE INDEX idx_athletes_profile ON athletes(profile_id);
CREATE INDEX idx_athletes_belt_rank ON athletes(belt_rank);
CREATE INDEX idx_athletes_gender ON athletes(gender);
CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = true;

-- Registrations indexes
CREATE INDEX idx_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_registrations_athlete ON tournament_registrations(athlete_id);
CREATE INDEX idx_registrations_team ON tournament_registrations(team_id);
CREATE INDEX idx_registrations_status ON tournament_registrations(payment_status);

-- Divisions indexes
CREATE INDEX idx_divisions_tournament ON divisions(tournament_id);
CREATE INDEX idx_divisions_category ON divisions(category);
CREATE INDEX idx_divisions_gender ON divisions(gender);

-- Matches indexes
CREATE INDEX idx_matches_bracket ON matches(bracket_id);
CREATE INDEX idx_matches_round ON matches(round_number);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_scheduled ON matches(scheduled_time);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON tournament_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_payments_updated_at BEFORE UPDATE ON team_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brackets_updated_at BEFORE UPDATE ON brackets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER FOR DIVISION PARTICIPANT COUNT
-- =============================================

CREATE OR REPLACE FUNCTION update_division_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE divisions 
        SET participant_count = participant_count + 1 
        WHERE id = NEW.division_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE divisions 
        SET participant_count = participant_count - 1 
        WHERE id = OLD.division_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_division_count_on_participant_change
    AFTER INSERT OR DELETE ON division_participants
    FOR EACH ROW EXECUTE FUNCTION update_division_participant_count();
