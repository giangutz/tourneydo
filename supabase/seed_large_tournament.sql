-- Seed script to create a large tournament with participants filling all divisions
-- Copy and paste this entire block into the Supabase SQL Editor

DO $$
DECLARE
  -- User IDs (Must match existing users or be valid UUIDs/Text IDs)
  v_organizer_id TEXT := 'user_363JOBeFT83Z8h15eDRL7EHzywE';
  v_coach1_id TEXT := 'user_365ZoLkL7wL58gy1hDEbCqYXH5v';
  v_coach2_id TEXT := 'user_36JZTK55vlez8GRdl2Aw7yjKuqZ';
  
  -- IDs for created entities
  v_tournament_id UUID;
  v_division_id UUID;
  v_category_id UUID;
  v_team_id UUID;
  v_player_id UUID;
  
  -- Helper variables
  v_coach_id TEXT;
  v_gender TEXT;
  v_birth_year INT;
  v_weight DECIMAL;
  v_height DECIMAL;
  v_teams UUID[];
  v_first_names TEXT[] := ARRAY['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'];
  v_last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  v_belts TEXT[] := ARRAY['White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black'];
  
  -- Configuration
  v_div_names TEXT[] := ARRAY['Gradeschool', 'Cadet', 'Junior', 'Senior'];
  v_div_min_ages INT[] := ARRAY[6, 12, 15, 18];
  v_div_max_ages INT[] := ARRAY[11, 14, 17, 35];
  
  v_cat_names TEXT[] := ARRAY['Fin', 'Fly', 'Bantam', 'Feather', 'Light'];
  v_cat_weights DECIMAL[] := ARRAY[45.0, 50.0, 55.0, 60.0, 68.0];
  
  -- Loop counters
  v_div_idx INT;
  v_cat_idx INT;
  v_player_count INT;
  p INT;
  i INT;

BEGIN
  -- 1. Ensure Users Exist (Idempotent)
  -- Note: In Supabase SQL Editor, you might not have permission to insert into auth.users
  -- But we can insert into public.users if RLS allows or if running as postgres
  INSERT INTO public.users (user_id, email, role) VALUES 
    (v_organizer_id, 'organizer@example.com', 'tournament-organizer'),
    (v_coach1_id, 'coach1@example.com', 'coach'),
    (v_coach2_id, 'coach2@example.com', 'coach')
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Create Tournament
  INSERT INTO public.tournaments (name, organizer_id, start_date, end_date)
  VALUES ('Grand Championship 2025', v_organizer_id, NOW() + INTERVAL '1 month', NOW() + INTERVAL '1 month 2 days')
  RETURNING id INTO v_tournament_id;

  RAISE NOTICE 'Created Tournament: %', v_tournament_id;

  -- 3. Create Teams (5 for each coach)
  FOR i IN 1..5 LOOP
    INSERT INTO public.teams (name, user_id) VALUES ('Cobra Kai ' || i, v_coach1_id) RETURNING id INTO v_team_id;
    v_teams := array_append(v_teams, v_team_id);
    INSERT INTO public.teams (name, user_id) VALUES ('Miyagi Do ' || i, v_coach2_id) RETURNING id INTO v_team_id;
    v_teams := array_append(v_teams, v_team_id);
  END LOOP;

  -- 4. Create Divisions, Categories, and Players
  FOR v_div_idx IN 1..4 LOOP
    -- Create Division
    INSERT INTO public.tournament_divisions (tournament_id, name, min_age, max_age)
    VALUES (v_tournament_id, v_div_names[v_div_idx], v_div_min_ages[v_div_idx], v_div_max_ages[v_div_idx])
    RETURNING id INTO v_division_id;
    
    RAISE NOTICE 'Created Division: %', v_div_names[v_div_idx];

    FOR v_gender IN SELECT unnest(ARRAY['male', 'female']) LOOP
      FOR v_cat_idx IN 1..5 LOOP
        -- Adjust weight for division
        v_weight := v_cat_weights[v_cat_idx] + (v_div_idx * 5);
        
        -- Create Category
        INSERT INTO public.tournament_categories (division_id, name, gender, min_weight, max_weight)
        VALUES (
            v_division_id, 
            v_cat_names[v_cat_idx], 
            v_gender, 
            v_weight - 5, 
            v_weight
        )
        RETURNING id INTO v_category_id;

        -- Create 2-4 players per category to ensure matches
        v_player_count := 2 + floor(random() * 3)::int; -- Generates 2, 3, or 4
        
        FOR p IN 1..v_player_count LOOP
            -- Pick random team
            v_team_id := v_teams[1 + floor(random() * array_length(v_teams, 1))::int];
            SELECT user_id INTO v_coach_id FROM public.teams WHERE id = v_team_id;
            
            -- Generate stats
            v_birth_year := EXTRACT(YEAR FROM NOW())::INT - (v_div_min_ages[v_div_idx] + floor(random() * (v_div_max_ages[v_div_idx] - v_div_min_ages[v_div_idx] + 1))::int);
            v_height := 140 + (v_div_idx * 10) + random() * 20;
            
            -- Create Player
            INSERT INTO public.players (first_name, last_name, email, dob, gender, weight, height, belt_level, coach_id)
            VALUES (
                v_first_names[1 + floor(random() * array_length(v_first_names, 1))::int], 
                v_last_names[1 + floor(random() * array_length(v_last_names, 1))::int], 
                'player_' || floor(random()*1000000) || '@example.com',
                make_date(v_birth_year, 1 + floor(random()*12)::int, 1 + floor(random()*28)::int),
                v_gender,
                v_weight - (random() * 4), -- Slightly under max weight
                v_height,
                v_belts[1 + floor(random() * array_length(v_belts, 1))::int],
                v_coach_id
            ) RETURNING id INTO v_player_id;

            -- Link to Team
            INSERT INTO public.team_players (team_id, player_id) VALUES (v_team_id, v_player_id);

            -- Register
            INSERT INTO public.tournament_registrations (tournament_id, team_id, player_id, division_id, category_id, status, coach_id)
            VALUES (v_tournament_id, v_team_id, v_player_id, v_division_id, v_category_id, 'verified', v_coach_id);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Seeding Complete!';
END $$;
