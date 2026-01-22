-- Fix RLS policies to handle Clerk IDs (text) properly
-- auth.uid() attempts to return a UUID, which fails for Clerk's text IDs

-- Drop invalid policies
DROP POLICY IF EXISTS "Organizers manage tournament schedule" ON tournament_schedule_config;
DROP POLICY IF EXISTS "Organizers manage division schedule" ON division_schedule_config;

-- Recreate policies using auth.jwt() ->> 'sub'
CREATE POLICY "Organizers manage tournament schedule" ON tournament_schedule_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_schedule_config.tournament_id
      AND t.organizer_id = (select auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Organizers manage division schedule" ON division_schedule_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = division_schedule_config.tournament_id
      AND t.organizer_id = (select auth.jwt() ->> 'sub')
    )
  );
