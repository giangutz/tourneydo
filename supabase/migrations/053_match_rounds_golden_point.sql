-- Allow a 4th (golden-point) round in match_rounds.
--
-- WT best-of-3: when the first three rounds are split 1–1 with a drawn round,
-- a golden-point round (round 4) decides the match. The original CHECK capped
-- round_number at 3 (migration 011). Relax it to 4.
--
-- Golden-point data lives ONLY in match_rounds (round 4). The denormalized
-- score_round1..3 columns on `matches` are unchanged — for a golden-point match
-- they correctly show the 1–1 regulation tally, with the winner advanced via
-- advance_match_winner.

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- Drop whatever CHECK constraint currently bounds round_number (auto-named).
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'match_rounds'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%round_number%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE match_rounds DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE match_rounds
  ADD CONSTRAINT match_rounds_round_number_check
  CHECK (round_number >= 1 AND round_number <= 4);
