-- Add skill_level column to matches table for Standard tournament bracket tracking
-- This allows us to distinguish which skill-level bracket a match belongs to
-- when multiple skill levels compete in the same Division+Category

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS skill_level text;

-- Add index for filtering matches by skill level
CREATE INDEX IF NOT EXISTS idx_matches_skill_level ON matches(skill_level);

-- Add comment explaining the column
COMMENT ON COLUMN matches.skill_level IS 'Skill level bracket for Standard tournaments (Beginner, Novice, Advanced I, Advanced II). NULL for Open Belt tournaments.';
