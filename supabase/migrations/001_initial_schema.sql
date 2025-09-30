-- Delete existing tables if they exist
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS tournament_status CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS organization_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS athlete_status CASCADE;
DROP TYPE IF EXISTS organization_status CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;


-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types
CREATE TYPE tournament_status AS ENUM ('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE registration_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE organization_type AS ENUM ('taekwondo_gym', 'tournament_organizer', 'federation', 'school', 'other');
CREATE TYPE user_role AS ENUM ('tournament_organizer', 'federation', 'gym_owner', 'school_admin', 'other');
CREATE TYPE athlete_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE organization_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Create profiles table (extends Clerk users)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_name TEXT,
  organization_type TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
  role user_role DEFAULT 'other' NOT NULL,

  CONSTRAINT valid_organization_type CHECK (
    organization_type IN ('taekwondo_gym', 'tournament_organizer', 'federation', 'school', 'other')
  )
);

-- Create organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  name TEXT NOT NULL,
  type organization_type NOT NULL,
  description TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  owner_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  status organization_status DEFAULT 'active' NOT NULL
);

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT NOT NULL,
  max_participants INTEGER,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  status tournament_status DEFAULT 'draft' NOT NULL,
  organizer_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  registration_fee DECIMAL(10,2),
  currency TEXT DEFAULT 'USD' NOT NULL,
  rules TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,

  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_registration_deadline CHECK (
    registration_deadline IS NULL OR registration_deadline <= start_date
  )
);

-- Create athletes table
CREATE TABLE athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL,
  belt_rank TEXT NOT NULL,
  weight_class TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_conditions TEXT,
  status athlete_status DEFAULT 'active' NOT NULL,

  CONSTRAINT valid_age CHECK (
    date_of_birth <= CURRENT_DATE - INTERVAL '3 years'
  )
);

-- Create registrations table
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status registration_status DEFAULT 'pending' NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  payment_amount DECIMAL(10,2),
  payment_currency TEXT DEFAULT 'USD',
  notes TEXT,

  UNIQUE(tournament_id, athlete_id)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_onboarding_completed ON profiles(onboarding_completed);
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);

CREATE INDEX idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_end_date ON tournaments(end_date);

CREATE INDEX idx_athletes_organization_id ON athletes(organization_id);
CREATE INDEX idx_athletes_status ON athletes(status);
CREATE INDEX idx_athletes_belt_rank ON athletes(belt_rank);

CREATE INDEX idx_registrations_tournament_id ON registrations(tournament_id);
CREATE INDEX idx_registrations_athlete_id ON registrations(athlete_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_payment_status ON registrations(payment_status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create function to get Clerk user ID from JWT (in public schema)
CREATE OR REPLACE FUNCTION public.clerk_uid()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create RLS policies using Clerk user ID

-- Profiles: Users can only see and modify their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (public.clerk_uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (public.clerk_uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (public.clerk_uid() = id);

-- Organizations: Users can view organizations they own
CREATE POLICY "Users can view organizations they own" ON organizations
  FOR SELECT USING (public.clerk_uid() = owner_id);

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (public.clerk_uid() = owner_id);

CREATE POLICY "Anyone can create public registration organization" ON organizations
  FOR ALL USING (name = 'Public Registrations' AND type = 'other')
  WITH CHECK (name = 'Public Registrations' AND type = 'other');

CREATE POLICY "Users can update organizations they own" ON organizations
  FOR UPDATE USING (public.clerk_uid() = owner_id);

-- Tournaments: Users can view all published tournaments, but only modify their own
CREATE POLICY "Anyone can view published tournaments" ON tournaments
  FOR SELECT USING (status IN ('published', 'registration_open', 'registration_closed', 'in_progress', 'completed'));

CREATE POLICY "Users can view own draft tournaments" ON tournaments
  FOR SELECT USING (public.clerk_uid() = organizer_id);

CREATE POLICY "Users can create tournaments" ON tournaments
  FOR INSERT WITH CHECK (public.clerk_uid() = organizer_id);

CREATE POLICY "Users can update own tournaments" ON tournaments
  FOR UPDATE USING (public.clerk_uid() = organizer_id);

CREATE POLICY "Users can delete own tournaments" ON tournaments
  FOR DELETE USING (public.clerk_uid() = organizer_id);

-- Athletes: Users can view athletes from organizations they own
CREATE POLICY "Users can view athletes from owned organizations" ON athletes
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
    )
  );

CREATE POLICY "Users can create athletes for owned organizations" ON athletes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
    )
  );

CREATE POLICY "Anyone can create athletes for public registration organization" ON athletes
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE name = 'Public Registrations' AND type = 'other'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE name = 'Public Registrations' AND type = 'other'
    )
  );

CREATE POLICY "Users can update athletes from owned organizations" ON athletes
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
    )
  );

CREATE POLICY "Users can delete athletes from owned organizations" ON athletes
  FOR DELETE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
    )
  );

-- Registrations: Complex policy based on tournament and athlete ownership
CREATE POLICY "Users can view registrations for tournaments they organize" ON registrations
  FOR SELECT USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE organizer_id = public.clerk_uid()
    )
  );

CREATE POLICY "Users can view registrations for athletes in their organizations" ON registrations
  FOR SELECT USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE organization_id IN (
        SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
      )
    )
  );

CREATE POLICY "Users can create registrations for athletes in their organizations" ON registrations
  FOR INSERT WITH CHECK (
    athlete_id IN (
      SELECT id FROM athletes WHERE organization_id IN (
        SELECT id FROM organizations WHERE owner_id = public.clerk_uid()
      )
    )
  );

CREATE POLICY "Anyone can create registrations for public athletes" ON registrations
  FOR INSERT WITH CHECK (
    athlete_id IN (
      SELECT id FROM athletes WHERE organization_id IN (
        SELECT id FROM organizations WHERE name = 'Public Registrations' AND type = 'other'
      )
    )
  );

CREATE POLICY "Users can update registrations for tournaments they organize" ON registrations
  FOR UPDATE USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE organizer_id = public.clerk_uid()
    )
  );

-- Allow anyone to count registrations for published tournaments
CREATE POLICY "Anyone can count registrations for published tournaments" ON registrations
  FOR SELECT USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE status IN ('published', 'registration_open', 'registration_closed', 'in_progress', 'completed')
    )
  );

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email_addresses[1].email_address,
    COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.first_name, NEW.last_name),
    NEW.image_url
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
