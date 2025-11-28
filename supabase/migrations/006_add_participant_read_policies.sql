-- Drop the problematic policies if they exist
DROP POLICY IF EXISTS "Organizers can read players in their tournaments" ON players;
DROP POLICY IF EXISTS "Organizers can read teams in their tournaments" ON teams;
DROP POLICY IF EXISTS "Public can read players in approved registrations" ON players;
DROP POLICY IF EXISTS "Public can read teams in approved registrations" ON teams;

-- Add simpler policies that allow reading player and team data
-- These policies allow anyone authenticated to read players and teams
-- The security is handled at the tournament_registrations level

CREATE POLICY "Authenticated users can read players"
  ON players
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read teams"
  ON teams
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Also allow anonymous users to read players and teams for public tournament pages
CREATE POLICY "Anonymous users can read players"
  ON players
  FOR SELECT
  USING (auth.role() = 'anon');

CREATE POLICY "Anonymous users can read teams"
  ON teams
  FOR SELECT
  USING (auth.role() = 'anon');
