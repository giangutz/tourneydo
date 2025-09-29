-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view their own profile and public profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view public profiles" ON profiles
    FOR SELECT USING (is_active = true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

-- Users can insert their own profile (for registration)
-- Allow profile creation during onboarding - more permissive for initial setup
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (true);

-- =============================================
-- TOURNAMENTS POLICIES
-- =============================================

-- Anyone can view public tournaments
CREATE POLICY "Anyone can view public tournaments" ON tournaments
    FOR SELECT USING (is_public = true OR organizer_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- Organizers can manage their own tournaments
CREATE POLICY "Organizers can manage own tournaments" ON tournaments
    FOR ALL USING (organizer_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- Organizers can create tournaments
CREATE POLICY "Organizers can create tournaments" ON tournaments
    FOR INSERT WITH CHECK (
        organizer_id IN (
            SELECT id FROM profiles 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role = 'organizer'
        )
    );

-- =============================================
-- TEAMS POLICIES
-- =============================================

-- Coaches can view and manage their own teams
CREATE POLICY "Coaches can manage own teams" ON teams
    FOR ALL USING (coach_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- Athletes can view teams they belong to
CREATE POLICY "Athletes can view their teams" ON teams
    FOR SELECT USING (id IN (
        SELECT team_id FROM athletes 
        WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Tournament organizers can view teams with registrations in their tournaments
CREATE POLICY "Organizers can view teams in their tournaments" ON teams
    FOR SELECT USING (id IN (
        SELECT DISTINCT tr.team_id 
        FROM tournament_registrations tr
        JOIN tournaments t ON tr.tournament_id = t.id
        WHERE t.organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can create teams
CREATE POLICY "Coaches can create teams" ON teams
    FOR INSERT WITH CHECK (
        coach_id IN (
            SELECT id FROM profiles 
            WHERE clerk_id = auth.jwt() ->> 'sub' 
            AND role = 'coach'
        )
    );

-- =============================================
-- ATHLETES POLICIES
-- =============================================

-- Athletes can view and update their own profile
CREATE POLICY "Athletes can manage own profile" ON athletes
    FOR ALL USING (profile_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- Coaches can manage athletes in their teams
CREATE POLICY "Coaches can manage team athletes" ON athletes
    FOR ALL USING (team_id IN (
        SELECT id FROM teams WHERE coach_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Tournament organizers can view athletes registered in their tournaments
CREATE POLICY "Organizers can view registered athletes" ON athletes
    FOR SELECT USING (id IN (
        SELECT DISTINCT tr.athlete_id 
        FROM tournament_registrations tr
        JOIN tournaments t ON tr.tournament_id = t.id
        WHERE t.organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can create athletes for their teams
CREATE POLICY "Coaches can create athletes" ON athletes
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE coach_id IN (
                SELECT id FROM profiles 
                WHERE clerk_id = auth.jwt() ->> 'sub' 
                AND role = 'coach'
            )
        )
    );

-- =============================================
-- TOURNAMENT REGISTRATIONS POLICIES
-- =============================================

-- Athletes can view their own registrations
CREATE POLICY "Athletes can view own registrations" ON tournament_registrations
    FOR SELECT USING (athlete_id IN (
        SELECT id FROM athletes WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can view registrations for their team athletes
CREATE POLICY "Coaches can view team registrations" ON tournament_registrations
    FOR SELECT USING (team_id IN (
        SELECT id FROM teams WHERE coach_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ) OR athlete_id IN (
        SELECT id FROM athletes WHERE team_id IN (
            SELECT id FROM teams WHERE coach_id IN (
                SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    ));

-- Tournament organizers can view all registrations for their tournaments
CREATE POLICY "Organizers can view tournament registrations" ON tournament_registrations
    FOR SELECT USING (tournament_id IN (
        SELECT id FROM tournaments WHERE organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can register their team athletes
CREATE POLICY "Coaches can register team athletes" ON tournament_registrations
    FOR INSERT WITH CHECK (
        athlete_id IN (
            SELECT id FROM athletes WHERE team_id IN (
                SELECT id FROM teams WHERE coach_id IN (
                    SELECT id FROM profiles 
                    WHERE clerk_id = auth.jwt() ->> 'sub' 
                    AND role = 'coach'
                )
            )
        )
    );

-- Athletes can register themselves
CREATE POLICY "Athletes can register themselves" ON tournament_registrations
    FOR INSERT WITH CHECK (
        athlete_id IN (
            SELECT id FROM athletes WHERE profile_id IN (
                SELECT id FROM profiles 
                WHERE clerk_id = auth.jwt() ->> 'sub' 
                AND role = 'athlete'
            )
        )
    );

-- Tournament organizers can update registrations for their tournaments
CREATE POLICY "Organizers can update tournament registrations" ON tournament_registrations
    FOR UPDATE USING (tournament_id IN (
        SELECT id FROM tournaments WHERE organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- =============================================
-- TEAM PAYMENTS POLICIES
-- =============================================

-- Coaches can manage payments for their teams
CREATE POLICY "Coaches can manage team payments" ON team_payments
    FOR ALL USING (coach_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- Tournament organizers can view and approve payments for their tournaments
CREATE POLICY "Organizers can manage tournament payments" ON team_payments
    FOR ALL USING (tournament_id IN (
        SELECT id FROM tournaments WHERE organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- =============================================
-- DIVISIONS POLICIES
-- =============================================

-- Anyone can view divisions for public tournaments
CREATE POLICY "Anyone can view public tournament divisions" ON divisions
    FOR SELECT USING (tournament_id IN (
        SELECT id FROM tournaments WHERE is_public = true
    ));

-- Tournament organizers can manage divisions for their tournaments
CREATE POLICY "Organizers can manage tournament divisions" ON divisions
    FOR ALL USING (tournament_id IN (
        SELECT id FROM tournaments WHERE organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- =============================================
-- DIVISION PARTICIPANTS POLICIES
-- =============================================

-- Athletes can view their own division assignments
CREATE POLICY "Athletes can view own division assignments" ON division_participants
    FOR SELECT USING (athlete_id IN (
        SELECT id FROM athletes WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can view division assignments for their team athletes
CREATE POLICY "Coaches can view team division assignments" ON division_participants
    FOR SELECT USING (athlete_id IN (
        SELECT id FROM athletes WHERE team_id IN (
            SELECT id FROM teams WHERE coach_id IN (
                SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    ));

-- Tournament organizers can manage division participants for their tournaments
CREATE POLICY "Organizers can manage division participants" ON division_participants
    FOR ALL USING (division_id IN (
        SELECT id FROM divisions WHERE tournament_id IN (
            SELECT id FROM tournaments WHERE organizer_id IN (
                SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    ));

-- Anyone can view division participants for public tournaments
CREATE POLICY "Anyone can view public division participants" ON division_participants
    FOR SELECT USING (division_id IN (
        SELECT d.id FROM divisions d
        JOIN tournaments t ON d.tournament_id = t.id
        WHERE t.is_public = true
    ));

-- =============================================
-- BRACKETS POLICIES
-- =============================================

-- Anyone can view brackets for public tournaments
CREATE POLICY "Anyone can view public tournament brackets" ON brackets
    FOR SELECT USING (division_id IN (
        SELECT d.id FROM divisions d
        JOIN tournaments t ON d.tournament_id = t.id
        WHERE t.is_public = true
    ));

-- Tournament organizers can manage brackets for their tournaments
CREATE POLICY "Organizers can manage tournament brackets" ON brackets
    FOR ALL USING (division_id IN (
        SELECT d.id FROM divisions d
        JOIN tournaments t ON d.tournament_id = t.id
        WHERE t.organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- =============================================
-- MATCHES POLICIES
-- =============================================

-- Anyone can view matches for public tournaments
CREATE POLICY "Anyone can view public tournament matches" ON matches
    FOR SELECT USING (bracket_id IN (
        SELECT b.id FROM brackets b
        JOIN divisions d ON b.division_id = d.id
        JOIN tournaments t ON d.tournament_id = t.id
        WHERE t.is_public = true
    ));

-- Tournament organizers can manage matches for their tournaments
CREATE POLICY "Organizers can manage tournament matches" ON matches
    FOR ALL USING (bracket_id IN (
        SELECT b.id FROM brackets b
        JOIN divisions d ON b.division_id = d.id
        JOIN tournaments t ON d.tournament_id = t.id
        WHERE t.organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Referees can update matches they are assigned to
CREATE POLICY "Referees can update assigned matches" ON matches
    FOR UPDATE USING (referee_id IN (
        SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
    ));

-- =============================================
-- TOURNAMENT RESULTS POLICIES
-- =============================================

-- Anyone can view results for public tournaments
CREATE POLICY "Anyone can view public tournament results" ON tournament_results
    FOR SELECT USING (tournament_id IN (
        SELECT id FROM tournaments WHERE is_public = true
    ));

-- Tournament organizers can manage results for their tournaments
CREATE POLICY "Organizers can manage tournament results" ON tournament_results
    FOR ALL USING (tournament_id IN (
        SELECT id FROM tournaments WHERE organizer_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Athletes can view their own results
CREATE POLICY "Athletes can view own results" ON tournament_results
    FOR SELECT USING (athlete_id IN (
        SELECT id FROM athletes WHERE profile_id IN (
            SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
        )
    ));

-- Coaches can view results for their team athletes
CREATE POLICY "Coaches can view team results" ON tournament_results
    FOR SELECT USING (athlete_id IN (
        SELECT id FROM athletes WHERE team_id IN (
            SELECT id FROM teams WHERE coach_id IN (
                SELECT id FROM profiles WHERE clerk_id = auth.jwt() ->> 'sub'
            )
        )
    ));
