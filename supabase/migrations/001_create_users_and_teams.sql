-- Drop existing objects to ensure clean slate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
DROP FUNCTION IF EXISTS update_updated_at_column;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  user_id text primary key default auth.jwt()->>'sub',
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('tournament-organizer', 'coach')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_teams_user_id ON teams(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (
    (select auth.jwt()->>'sub') = user_id
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- RLS Policies for teams table
-- Coaches can read their own teams
CREATE POLICY "Coaches can read own teams"
  ON teams
  FOR SELECT
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can insert their own teams
CREATE POLICY "Coaches can insert own teams"
  ON teams
  FOR INSERT
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can update their own teams
CREATE POLICY "Coaches can update own teams"
  ON teams
  FOR UPDATE
  USING (
    (select auth.jwt()->>'sub') = user_id
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = user_id
  );

-- Coaches can delete their own teams
CREATE POLICY "Coaches can delete own teams"
  ON teams
  FOR DELETE
  USING (
    (select auth.jwt()->>'sub') = user_id
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
