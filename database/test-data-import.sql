-- Mass Import Test Data for TourneyDo Tournament System
-- This script creates 500-600 test participants for the "Nationals 2025" tournament
-- Tournament ID: e1354812-df33-4394-980d-8b793d8e62bc

-- First, ensure we have the necessary data structures
DO $$
DECLARE
    tournament_id UUID := 'e1354812-df33-4394-980d-8b793d8e62bc';
    coach_count INTEGER;
    team_count INTEGER;
    i INTEGER;
    j INTEGER;
    athlete_id UUID;
    team_id UUID;
    coach_id UUID;
    registration_id UUID;
    payment_batch INTEGER;
    current_date_val DATE := CURRENT_DATE;
    birth_year INTEGER;
    age INTEGER;
    weight_val DECIMAL(5,2);
    height_val DECIMAL(5,2);
    belt_ranks TEXT[] := ARRAY['white', 'yellow', 'green', 'blue', 'brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan'];
    first_names_male TEXT[] := ARRAY['Alexander', 'Benjamin', 'Christopher', 'Daniel', 'Ethan', 'Felix', 'Gabriel', 'Henry', 'Isaac', 'Jacob', 'Kevin', 'Liam', 'Michael', 'Nathan', 'Oliver', 'Patrick', 'Quinn', 'Ryan', 'Samuel', 'Thomas', 'Ulysses', 'Victor', 'William', 'Xavier', 'Yuki', 'Zachary', 'Adrian', 'Blake', 'Connor', 'Diego'];
    first_names_female TEXT[] := ARRAY['Abigail', 'Bella', 'Charlotte', 'Diana', 'Emma', 'Fiona', 'Grace', 'Hannah', 'Isabella', 'Julia', 'Katherine', 'Luna', 'Mia', 'Natalie', 'Olivia', 'Penelope', 'Quinn', 'Rachel', 'Sophia', 'Taylor', 'Uma', 'Victoria', 'Willow', 'Ximena', 'Yasmin', 'Zoe', 'Aria', 'Brooke', 'Chloe', 'Delilah'];
    last_names TEXT[] := ARRAY['Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris', 'Johnson', 'Kim', 'Lee', 'Martinez', 'Nelson', 'O''Connor', 'Patel', 'Quinn', 'Rodriguez', 'Smith', 'Taylor', 'Upton', 'Valdez', 'Wilson', 'Xu', 'Young', 'Zhang', 'Adams', 'Baker', 'Cooper', 'Diaz', 'Edwards'];
    team_names TEXT[] := ARRAY['Dragons Taekwondo Academy', 'Phoenix Martial Arts', 'Thunder Kicks Dojo', 'Golden Eagle TKD', 'Rising Sun Academy', 'Steel Wolves Club', 'Crimson Tigers', 'Blue Lightning TKD', 'Silver Hawks Academy', 'Iron Fist Dojo', 'Jade Warriors', 'Storm Riders TKD', 'Fire Mountain Academy', 'Ocean Wave Dojo', 'Wind Walker TKD', 'Earth Shakers Club', 'Sky Breakers Academy', 'Night Shadows TKD', 'Solar Flare Dojo', 'Lunar Eclipse Academy'];
    gender_val TEXT;
    first_name TEXT;
    full_name TEXT;
    email_val TEXT;
    team_name TEXT;
    belt_rank TEXT;
    payment_status TEXT;
    registration_date_val TIMESTAMP;
BEGIN
    -- Create coaches first
    FOR i IN 1..20 LOOP
        INSERT INTO profiles (id, full_name, email, role, organization)
        VALUES (
            gen_random_uuid(),
            'Coach ' || last_names[((i-1) % array_length(last_names, 1)) + 1],
            'coach' || i || '@tourneydo.com',
            'coach',
            'TourneyDo Academy ' || i
        );
    END LOOP;

    -- Create teams with coaches
    SELECT array_agg(id) INTO coach_id FROM profiles WHERE role = 'coach' LIMIT 1;
    
    FOR i IN 1..20 LOOP
        SELECT id INTO coach_id FROM profiles WHERE role = 'coach' OFFSET (i-1) LIMIT 1;
        
        INSERT INTO teams (id, name, description, coach_id)
        VALUES (
            gen_random_uuid(),
            team_names[i],
            'Elite taekwondo training center specializing in competitive martial arts',
            coach_id
        );
    END LOOP;

    -- Create athletes and registrations (550 total)
    FOR i IN 1..550 LOOP
        -- Random gender
        gender_val := CASE WHEN random() < 0.5 THEN 'male' ELSE 'female' END;
        
        -- Random age between 6 and 35
        age := 6 + floor(random() * 30)::INTEGER;
        birth_year := EXTRACT(YEAR FROM current_date_val) - age;
        
        -- Random name based on gender
        IF gender_val = 'male' THEN
            first_name := first_names_male[floor(random() * array_length(first_names_male, 1)) + 1];
        ELSE
            first_name := first_names_female[floor(random() * array_length(first_names_female, 1)) + 1];
        END IF;
        
        full_name := first_name || ' ' || last_names[floor(random() * array_length(last_names, 1)) + 1];
        email_val := lower(replace(full_name, ' ', '.')) || '@email.com';
        
        -- Age-appropriate weight and height
        IF age < 8 THEN
            weight_val := 20 + random() * 10; -- 20-30kg
            height_val := 110 + random() * 20; -- 110-130cm
        ELSIF age < 12 THEN
            weight_val := 25 + random() * 15; -- 25-40kg
            height_val := 130 + random() * 25; -- 130-155cm
        ELSIF age < 16 THEN
            weight_val := 35 + random() * 25; -- 35-60kg
            height_val := 150 + random() * 30; -- 150-180cm
        ELSE
            weight_val := 50 + random() * 40; -- 50-90kg
            height_val := 160 + random() * 35; -- 160-195cm
        END IF;
        
        -- Age-appropriate belt rank
        IF age < 10 THEN
            belt_rank := belt_ranks[floor(random() * 4) + 1]; -- white to blue
        ELSIF age < 16 THEN
            belt_rank := belt_ranks[floor(random() * 6) + 1]; -- white to brown
        ELSE
            belt_rank := belt_ranks[floor(random() * array_length(belt_ranks, 1)) + 1]; -- any rank
        END IF;
        
        -- Create athlete
        INSERT INTO athletes (id, full_name, email, gender, date_of_birth, belt_rank, weight, height, coach_id)
        VALUES (
            gen_random_uuid(),
            full_name,
            email_val,
            gender_val,
            (birth_year || '-' || (floor(random() * 12) + 1) || '-' || (floor(random() * 28) + 1))::DATE,
            belt_rank,
            weight_val,
            height_val,
            (SELECT id FROM profiles WHERE role = 'coach' OFFSET floor(random() * 20) LIMIT 1)
        ) RETURNING id INTO athlete_id;
        
        -- Select random team
        SELECT id INTO team_id FROM teams OFFSET floor(random() * 20) LIMIT 1;
        
        -- Determine payment status (20 pending approval, rest paid)
        IF i <= 20 THEN
            payment_status := 'pending_approval';
        ELSE
            payment_status := 'paid';
        END IF;
        
        -- Random registration date within last 30 days
        registration_date_val := current_date_val - INTERVAL '30 days' + (random() * INTERVAL '30 days');
        
        -- Create registration
        INSERT INTO tournament_registrations (
            id, 
            tournament_id, 
            athlete_id, 
            team_id, 
            registration_date, 
            payment_status,
            checked_in,
            weighed_in,
            weight_recorded,
            height_recorded,
            notes
        ) VALUES (
            gen_random_uuid(),
            tournament_id,
            athlete_id,
            team_id,
            registration_date_val,
            payment_status,
            CASE WHEN random() < 0.3 THEN true ELSE false END, -- 30% checked in
            CASE WHEN random() < 0.15 THEN true ELSE false END, -- 15% weighed in
            CASE WHEN random() < 0.15 THEN weight_val + (random() * 2 - 1) ELSE NULL END, -- slight weight variation
            CASE WHEN random() < 0.15 THEN height_val + (random() * 2 - 1) ELSE NULL END, -- slight height variation
            CASE 
                WHEN random() < 0.1 THEN 'Special dietary requirements'
                WHEN random() < 0.05 THEN 'Previous injury - left knee'
                WHEN random() < 0.03 THEN 'First time competitor'
                ELSE NULL 
            END
        ) RETURNING id INTO registration_id;
        
        -- Create team payment submissions for pending approvals
        IF i <= 20 AND i % 5 = 1 THEN -- Every 5th pending registration gets a team payment
            INSERT INTO team_payments (
                tournament_id,
                coach_id,
                team_name,
                amount,
                payment_method,
                reference_number,
                description,
                status,
                participant_count,
                registration_ids,
                notes,
                created_at
            ) VALUES (
                tournament_id,
                (SELECT coach_id FROM teams WHERE id = team_id),
                (SELECT name FROM teams WHERE id = team_id),
                (SELECT entry_fee FROM tournaments WHERE id = tournament_id) * 5, -- 5 athletes per payment
                CASE floor(random() * 4)
                    WHEN 0 THEN 'Bank Transfer'
                    WHEN 1 THEN 'GCash'
                    WHEN 2 THEN 'PayMaya'
                    ELSE 'Cash'
                END,
                floor(random() * 9000 + 1000)::TEXT, -- 4-digit reference
                'Team payment for ' || (SELECT name FROM teams WHERE id = team_id),
                'pending',
                5,
                ARRAY[registration_id], -- Simplified - would normally include multiple IDs
                'Submitted via team payment portal',
                registration_date_val
            );
        END IF;
        
        -- Progress indicator
        IF i % 50 = 0 THEN
            RAISE NOTICE 'Created % athletes and registrations', i;
        END IF;
    END LOOP;

    -- Update tournament participant count
    UPDATE tournaments 
    SET max_participants = 600 
    WHERE id = tournament_id;

    -- Create some divisions based on age groups
    INSERT INTO divisions (tournament_id, name, description, min_age, max_age, gender, min_weight, max_weight, belt_ranks)
    VALUES 
    (tournament_id, 'Pee Wee Boys (6-8)', 'Young male competitors', 6, 8, 'male', NULL, NULL, ARRAY['white', 'yellow']),
    (tournament_id, 'Pee Wee Girls (6-8)', 'Young female competitors', 6, 8, 'female', NULL, NULL, ARRAY['white', 'yellow']),
    (tournament_id, 'Kids Boys (9-11)', 'Pre-teen male competitors', 9, 11, 'male', NULL, NULL, ARRAY['white', 'yellow', 'green']),
    (tournament_id, 'Kids Girls (9-11)', 'Pre-teen female competitors', 9, 11, 'female', NULL, NULL, ARRAY['white', 'yellow', 'green']),
    (tournament_id, 'Youth Boys Lightweight (12-15)', 'Teen male competitors - light', 12, 15, 'male', NULL, 55, ARRAY['green', 'blue', 'brown']),
    (tournament_id, 'Youth Boys Heavyweight (12-15)', 'Teen male competitors - heavy', 12, 15, 'male', 55, NULL, ARRAY['green', 'blue', 'brown']),
    (tournament_id, 'Youth Girls Lightweight (12-15)', 'Teen female competitors - light', 12, 15, 'female', NULL, 50, ARRAY['green', 'blue', 'brown']),
    (tournament_id, 'Youth Girls Heavyweight (12-15)', 'Teen female competitors - heavy', 12, 15, 'female', 50, NULL, ARRAY['green', 'blue', 'brown']),
    (tournament_id, 'Junior Men Flyweight (16-17)', 'Junior male - flyweight', 16, 17, 'male', NULL, 54, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Men Bantamweight (16-17)', 'Junior male - bantamweight', 16, 17, 'male', 54, 63, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Men Featherweight (16-17)', 'Junior male - featherweight', 16, 17, 'male', 63, 73, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Men Heavyweight (16-17)', 'Junior male - heavyweight', 16, 17, 'male', 73, NULL, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Women Flyweight (16-17)', 'Junior female - flyweight', 16, 17, 'female', NULL, 46, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Women Bantamweight (16-17)', 'Junior female - bantamweight', 16, 17, 'female', 46, 53, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Women Featherweight (16-17)', 'Junior female - featherweight', 16, 17, 'female', 53, 59, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Junior Women Heavyweight (16-17)', 'Junior female - heavyweight', 16, 17, 'female', 59, NULL, ARRAY['blue', 'brown', 'black_1st_dan']),
    (tournament_id, 'Senior Men Flyweight (18+)', 'Senior male - flyweight', 18, NULL, 'male', NULL, 58, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Men Bantamweight (18+)', 'Senior male - bantamweight', 18, NULL, 'male', 58, 68, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Men Featherweight (18+)', 'Senior male - featherweight', 18, NULL, 'male', 68, 80, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Men Heavyweight (18+)', 'Senior male - heavyweight', 18, NULL, 'male', 80, NULL, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Women Flyweight (18+)', 'Senior female - flyweight', 18, NULL, 'female', NULL, 49, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Women Bantamweight (18+)', 'Senior female - bantamweight', 18, NULL, 'female', 49, 57, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Women Featherweight (18+)', 'Senior female - featherweight', 18, NULL, 'female', 57, 67, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']),
    (tournament_id, 'Senior Women Heavyweight (18+)', 'Senior female - heavyweight', 18, NULL, 'female', 67, NULL, ARRAY['brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan']);

    RAISE NOTICE 'Successfully created 550 test participants with 20 pending payment approvals';
    RAISE NOTICE 'Created 24 divisions for automatic sorting and bracket generation';
    RAISE NOTICE 'Tournament "Nationals 2025" is ready for testing division generation and bracket features';
END $$;

-- Verify the data
SELECT 
    'Tournament Registrations' as data_type,
    COUNT(*) as count,
    payment_status,
    checked_in,
    weighed_in
FROM tournament_registrations 
WHERE tournament_id = 'e1354812-df33-4394-980d-8b793d8e62bc'
GROUP BY payment_status, checked_in, weighed_in
ORDER BY payment_status, checked_in, weighed_in;

SELECT 
    'Age Distribution' as data_type,
    CASE 
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 8 THEN '6-7 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 12 THEN '8-11 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 16 THEN '12-15 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 18 THEN '16-17 years'
        ELSE '18+ years'
    END as age_group,
    a.gender,
    COUNT(*) as count
FROM tournament_registrations tr
JOIN athletes a ON tr.athlete_id = a.id
WHERE tr.tournament_id = 'e1354812-df33-4394-980d-8b793d8e62bc'
GROUP BY 
    CASE 
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 8 THEN '6-7 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 12 THEN '8-11 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 16 THEN '12-15 years'
        WHEN EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_of_birth) < 18 THEN '16-17 years'
        ELSE '18+ years'
    END,
    a.gender
ORDER BY age_group, a.gender;

SELECT 
    'Team Payments' as data_type,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM team_payments 
WHERE tournament_id = 'e1354812-df33-4394-980d-8b793d8e62bc'
GROUP BY status;

SELECT 
    'Divisions Created' as data_type,
    COUNT(*) as division_count
FROM divisions 
WHERE tournament_id = 'e1354812-df33-4394-980d-8b793d8e62bc';

COMMENT ON SCRIPT IS 'Test data import script for TourneyDo tournament system. Creates 550 participants across 24 divisions with realistic age, weight, and belt rank distributions. Includes 20 pending payment approvals for testing the payment approval workflow.';
    team_names TEXT[] := ARRAY['Dragons Taekwondo Academy', 'Phoenix Martial Arts', 'Thunder Kicks Dojo', 'Golden Eagle TKD', 'Rising Sun Academy', 'Steel Wolves Club', 'Crimson Tigers', 'Blue Lightning TKD', 'Silver Hawks Academy', 'Iron Fist Dojo', 'Jade Warriors', 'Storm Riders TKD', 'Fire Mountain Academy', 'Ocean Wave Dojo', 'Wind Walker TKD', 'Earth Shakers Club', 'Sky Breakers Academy', 'Night Shadows TKD', 'Solar Flare Dojo', 'Lunar Eclipse Academy'];
    gender_val TEXT;
    first_name TEXT;
    full_name TEXT;
    email_val TEXT;
    team_name TEXT;
    belt_rank TEXT;
    payment_status TEXT;
    registration_date_val TIMESTAMP;
BEGIN
    -- Create coaches first
    FOR i IN 1..20 LOOP
        INSERT INTO profiles (id, full_name, email, role, organization)
        VALUES (
            uuid_generate_v4(),
            'Coach ' || last_names[i],
            'coach' || i || '@tourneydo.com',
            'coach',
            'TourneyDo Academy ' || i
        );
    END LOOP;

    -- Create teams with coaches
    SELECT array_agg(id) INTO coach_id FROM profiles WHERE role = 'coach' LIMIT 1;
    
    FOR i IN 1..20 LOOP
        SELECT id INTO coach_id FROM profiles WHERE role = 'coach' OFFSET (i-1) LIMIT 1;
        
        INSERT INTO teams (id, name, description, coach_id)
        VALUES (
            uuid_generate_v4(),
            team_names[i],
            'Elite taekwondo training center specializing in competitive martial arts',
            coach_id
        );
    END LOOP;

    -- Create athletes and registrations (550 total)
    FOR i IN 1..550 LOOP
        -- Random gender
        gender_val := CASE WHEN random() < 0.5 THEN 'male' ELSE 'female' END;
        
        -- Random age between 6 and 35
        age := 6 + floor(random() * 30)::INTEGER;
        birth_year := EXTRACT(YEAR FROM current_date_val) - age;
        
        -- Random name based on gender
        IF gender_val = 'male' THEN
            first_name := first_names_male[floor(random() * array_length(first_names_male, 1)) + 1];
        ELSE
            first_name := first_names_female[floor(random() * array_length(first_names_female, 1)) + 1];
        END IF;
        
        full_name := first_name || ' ' || last_names[floor(random() * array_length(last_names, 1)) + 1];
        email_val := lower(replace(full_name, ' ', '.')) || '@email.com';
        
        -- Age-appropriate weight and height
        IF age < 8 THEN
            weight_val := 20 + random() * 10; -- 20-30kg
            height_val := 110 + random() * 20; -- 110-130cm
        ELSIF age < 12 THEN
            weight_val := 25 + random() * 15; -- 25-40kg
            height_val := 130 + random() * 25; -- 130-155cm
        ELSIF age < 16 THEN
            weight_val := 35 + random() * 25; -- 35-60kg
            height_val := 150 + random() * 30; -- 150-180cm
        ELSE
            weight_val := 50 + random() * 40; -- 50-90kg
            height_val := 160 + random() * 35; -- 160-195cm
        END IF;
        
        -- Age-appropriate belt rank
        IF age < 10 THEN
            belt_rank := belt_ranks[floor(random() * 4) + 1]; -- white to blue
        ELSIF age < 16 THEN
            belt_rank := belt_ranks[floor(random() * 6) + 1]; -- white to brown
        ELSE
            belt_rank := belt_ranks[floor(random() * array_length(belt_ranks, 1)) + 1]; -- any rank
        END IF;
        
        -- Create athlete
        INSERT INTO athletes (id, full_name, email, gender, date_of_birth, belt_rank, weight, height, coach_id)
        VALUES (
            uuid_generate_v4(),
            full_name,
            email_val,
            gender_val,
            (birth_year || '-' || (floor(random() * 12) + 1) || '-' || (floor(random() * 28) + 1))::DATE,
            belt_rank,
            weight_val,
            height_val,
            (SELECT id FROM profiles WHERE role = 'coach' OFFSET floor(random() * 20) LIMIT 1)
        ) RETURNING id INTO athlete_id;
        
        -- Select random team
        SELECT id INTO team_id FROM teams OFFSET floor(random() * 20) LIMIT 1;
        
        -- Determine payment status (20 pending approval, rest paid)
        IF i <= 20 THEN
            payment_status := 'pending_approval';
        ELSE
            payment_status := 'paid';
        END IF;
        
        -- Random registration date within last 30 days
        registration_date_val := current_date_val - INTERVAL '30 days' + (random() * INTERVAL '30 days');
        
        -- Create registration
        INSERT INTO tournament_registrations (
            id, 
            tournament_id, 
            athlete_id, 
            team_id, 
            registration_date, 
            payment_status,
            checked_in,
            weighed_in,
            weight_recorded,
            height_recorded,
            notes
        ) VALUES (
            uuid_generate_v4(),
            tournament_id,
            athlete_id,
            team_id,
            registration_date_val,
            payment_status,
            CASE WHEN random() < 0.3 THEN true ELSE false END, -- 30% checked in
            CASE WHEN random() < 0.15 THEN true ELSE false END, -- 15% weighed in
            CASE WHEN random() < 0.15 THEN weight_val + (random() * 2 - 1) ELSE NULL END, -- slight weight variation
            CASE WHEN random() < 0.15 THEN height_val + (random() * 2 - 1) ELSE NULL END, -- slight height variation
            CASE 
                WHEN random() < 0.1 THEN 'Special dietary requirements'
                WHEN random() < 0.05 THEN 'Previous injury - left knee'
                WHEN random() < 0.03 THEN 'First time competitor'
                ELSE NULL 
            END
        ) RETURNING id INTO registration_id;
        
        -- Create team payment submissions for pending approvals
