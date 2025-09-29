-- Mass Import Test Data for TourneyDo Tournament System
-- This script creates 500-600 test participants for the "Nationals 2025" tournament
-- Tournament ID: e1354812-df33-4394-980d-8b793d8e62bc

-- First, ensure we have the necessary data structures
DO $$
DECLARE
    tournament_id UUID := 'e1354812-df33-4394-980d-8b793d8e62bc';
    i INTEGER;
    athlete_id UUID;
    team_id UUID;
    coach_id UUID;
    registration_id UUID;
    current_date_val DATE := CURRENT_DATE;
    birth_year INTEGER;
    age INTEGER;
    weight_val DECIMAL(5,2);
    height_val DECIMAL(5,2);
    belt_ranks TEXT[] := ARRAY['white', 'yellow', 'green', 'blue', 'brown', 'black_1st_dan', 'black_2nd_dan', 'black_3rd_dan'];
    first_names_male TEXT[] := ARRAY['Alexander', 'Benjamin', 'Christopher', 'Daniel', 'Ethan', 'Felix', 'Gabriel', 'Henry', 'Isaac', 'Jacob', 'Kevin', 'Liam', 'Michael', 'Nathan', 'Oliver', 'Patrick', 'Quinn', 'Ryan', 'Samuel', 'Thomas'];
    first_names_female TEXT[] := ARRAY['Abigail', 'Bella', 'Charlotte', 'Diana', 'Emma', 'Fiona', 'Grace', 'Hannah', 'Isabella', 'Julia', 'Katherine', 'Luna', 'Mia', 'Natalie', 'Olivia', 'Penelope', 'Quinn', 'Rachel', 'Sophia', 'Taylor'];
    last_names TEXT[] := ARRAY['Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris', 'Johnson', 'Kim', 'Lee', 'Martinez', 'Nelson', 'Patel', 'Rodriguez', 'Smith', 'Taylor', 'Wilson', 'Young', 'Zhang'];
    team_names TEXT[] := ARRAY['Dragons Academy', 'Phoenix Martial Arts', 'Thunder Kicks', 'Golden Eagle TKD', 'Rising Sun Academy', 'Steel Wolves', 'Crimson Tigers', 'Blue Lightning', 'Silver Hawks', 'Iron Fist Dojo'];
    gender_val TEXT;
    first_name TEXT;
    full_name TEXT;
    email_val TEXT;
    belt_rank TEXT;
    payment_status TEXT;
    registration_date_val TIMESTAMP;
BEGIN
    -- Create coaches first
    FOR i IN 1..10 LOOP
        INSERT INTO profiles (id, full_name, email, role, organization)
        VALUES (
            uuid_parse('user_33IuNbTwAY7RMjSkIf6H1CesKkv'),
            'Coach ' || last_names[((i-1) % array_length(last_names, 1)) + 1],
            'coach' || i || '@tourneydo.com',
            'coach',
            'Academy ' || i
        );
    END LOOP;

    -- Create teams with coaches
    FOR i IN 1..10 LOOP
        SELECT id INTO coach_id FROM profiles WHERE role = 'coach' OFFSET (i-1) LIMIT 1;
        
        INSERT INTO teams (id, name, description, coach_id)
        VALUES (
            gen_random_uuid(),
            team_names[i],
            'Elite taekwondo training center',
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
            weight_val := 20 + random() * 10;
            height_val := 110 + random() * 20;
        ELSIF age < 12 THEN
            weight_val := 25 + random() * 15;
            height_val := 130 + random() * 25;
        ELSIF age < 16 THEN
            weight_val := 35 + random() * 25;
            height_val := 150 + random() * 30;
        ELSE
            weight_val := 50 + random() * 40;
            height_val := 160 + random() * 35;
        END IF;
        
        -- Age-appropriate belt rank
        IF age < 10 THEN
            belt_rank := belt_ranks[floor(random() * 4) + 1];
        ELSIF age < 16 THEN
            belt_rank := belt_ranks[floor(random() * 6) + 1];
        ELSE
            belt_rank := belt_ranks[floor(random() * array_length(belt_ranks, 1)) + 1];
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
            (SELECT id FROM profiles WHERE role = 'coach' OFFSET floor(random() * 10) LIMIT 1)
        ) RETURNING id INTO athlete_id;
        
        -- Select random team
        SELECT id INTO team_id FROM teams OFFSET floor(random() * 10) LIMIT 1;
        
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
            id, tournament_id, athlete_id, team_id, registration_date, payment_status,
            checked_in, weighed_in, weight_recorded, height_recorded, notes
        ) VALUES (
            gen_random_uuid(), tournament_id, athlete_id, team_id, registration_date_val, payment_status,
            CASE WHEN random() < 0.3 THEN true ELSE false END,
            CASE WHEN random() < 0.15 THEN true ELSE false END,
            CASE WHEN random() < 0.15 THEN weight_val + (random() * 2 - 1) ELSE NULL END,
            CASE WHEN random() < 0.15 THEN height_val + (random() * 2 - 1) ELSE NULL END,
            CASE 
                WHEN random() < 0.1 THEN 'Special dietary requirements'
                WHEN random() < 0.05 THEN 'Previous injury - left knee'
                ELSE NULL 
            END
        ) RETURNING id INTO registration_id;
        
        -- Progress indicator
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Created % athletes and registrations', i;
        END IF;
    END LOOP;

    RAISE NOTICE 'Successfully created 550 test participants with 20 pending payment approvals';
END $$;
