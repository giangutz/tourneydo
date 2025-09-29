-- =============================================
-- SEED DATA FOR DEVELOPMENT
-- =============================================

-- Insert sample profiles (these would normally be created via Clerk)
INSERT INTO profiles (id, clerk_id, email, full_name, role, organization, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'clerk_organizer_1', 'organizer@tourneydo.com', 'John Organizer', 'organizer', 'TourneyDo Organization', true),
('550e8400-e29b-41d4-a716-446655440002', 'clerk_coach_1', 'coach1@example.com', 'Sarah Coach', 'coach', 'Elite Taekwondo Academy', true),
('550e8400-e29b-41d4-a716-446655440003', 'clerk_coach_2', 'coach2@example.com', 'Mike Trainer', 'coach', 'Champions Dojo', true),
('550e8400-e29b-41d4-a716-446655440004', 'clerk_athlete_1', 'athlete1@example.com', 'Alex Athlete', 'athlete', null, true),
('550e8400-e29b-41d4-a716-446655440005', 'clerk_athlete_2', 'athlete2@example.com', 'Jordan Fighter', 'athlete', null, true);

-- Insert sample tournament
INSERT INTO tournaments (id, organizer_id, name, description, location, tournament_date, registration_deadline, weigh_in_date, entry_fee, status, max_participants, is_public) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Nationals 2025', 'National Taekwondo Championship 2025', 'Manila Sports Complex', '2025-03-15', '2025-02-28 23:59:59+00', '2025-03-14', 1500.00, 'registration_open', 200, true);

-- Insert sample teams
INSERT INTO teams (id, coach_id, name, organization, is_active) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Elite Warriors', 'Elite Taekwondo Academy', true),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Champion Fighters', 'Champions Dojo', true);

-- Insert sample athletes
INSERT INTO athletes (id, team_id, full_name, email, date_of_birth, gender, belt_rank, weight, height, is_active) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Maria Santos', 'maria@example.com', '2010-05-15', 'female', 'blue', 45.5, 150.0, true),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Carlos Rodriguez', 'carlos@example.com', '2008-08-22', 'male', 'brown', 55.2, 165.0, true),
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'Lisa Chen', 'lisa@example.com', '2012-03-10', 'female', 'red', 38.0, 140.0, true),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'David Kim', 'david@example.com', '2009-11-30', 'male', 'black', 62.8, 170.0, true),
('880e8400-e29b-41d4-a716-446655440005', null, 'Independent Fighter', 'indie@example.com', '2007-07-07', 'male', 'black', 68.5, 175.0, true);

-- Insert sample registrations
INSERT INTO tournament_registrations (id, tournament_id, athlete_id, team_id, payment_status, payment_amount, checked_in, weighed_in, weight_recorded) VALUES
('990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'paid', 1500.00, true, true, 45.2),
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'paid', 1500.00, true, true, 55.8),
('990e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'pending', 1500.00, false, false, null),
('990e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'paid', 1500.00, true, true, 63.1),
('990e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440005', null, 'pending', 1500.00, false, false, null);

-- Insert sample divisions (these would normally be auto-generated)
INSERT INTO divisions (id, tournament_id, name, category, gender, min_age, max_age, min_weight, max_weight, participant_count, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Junior Female -49kg', 'junior', 'female', 15, 17, null, 49, 0, true),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Junior Male -55kg', 'junior', 'male', 15, 17, null, 55, 0, true),
('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'Senior Male -68kg', 'senior', 'male', 18, 100, null, 68, 0, true);
