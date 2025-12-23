-- Create tournament_staff table
CREATE TABLE IF NOT EXISTS tournament_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id TEXT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'official')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  last_invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique email per tournament
  UNIQUE(tournament_id, email)
);

-- Index for faster queries
CREATE INDEX idx_tournament_staff_tournament ON tournament_staff(tournament_id);
CREATE INDEX idx_tournament_staff_user ON tournament_staff(user_id);
CREATE INDEX idx_tournament_staff_email ON tournament_staff(email);

-- RLS Policies
ALTER TABLE tournament_staff ENABLE ROW LEVEL SECURITY;

-- Organizers can manage staff for their tournaments
CREATE POLICY "Organizers can manage staff"
  ON tournament_staff
  FOR ALL
  USING (
    tournament_id IN (
      SELECT id FROM tournaments 
      WHERE organizer_id = (auth.jwt() ->> 'sub')
    )
  );

-- Users can view their own staff assignments
CREATE POLICY "Users can view their staff assignments"
  ON tournament_staff
  FOR SELECT
  USING (user_id = (auth.jwt() ->> 'sub'));

-- Update timestamp trigger
CREATE TRIGGER update_tournament_staff_updated_at
  BEFORE UPDATE ON tournament_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
