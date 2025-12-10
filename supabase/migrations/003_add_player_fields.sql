-- Add weight, height, and belt_level columns to players table

-- Add weight column (for players age >= 12)
ALTER TABLE players ADD COLUMN weight DECIMAL(5,2);

-- Add height column (for players age < 12)
ALTER TABLE players ADD COLUMN height DECIMAL(5,2);

-- Add belt_level column with check constraint
ALTER TABLE players ADD COLUMN belt_level TEXT;

ALTER TABLE players ADD COLUMN gender TEXT;

-- Add check constraint for valid belt levels
ALTER TABLE players ADD CONSTRAINT valid_belt_level 
  CHECK (belt_level IN ('White', 'Yellow', 'Blue', 'Red', 'Brown', 'Black') OR belt_level IS NULL);

ALTER TABLE players ADD CONSTRAINT valid_gender 
  CHECK (gender IN ('male', 'female') OR gender IS NULL);

-- Add indexes for performance
CREATE INDEX idx_players_belt_level ON players(belt_level);

-- Add comments for documentation
COMMENT ON COLUMN players.weight IS 'Player weight in kg (typically for age >= 12)';
COMMENT ON COLUMN players.height IS 'Player height in cm (typically for age < 12)';
COMMENT ON COLUMN players.belt_level IS 'Martial arts belt level: White, Yellow, Blue, Red, Brown, Black';
COMMENT ON COLUMN players.gender IS 'Player gender: male, female';
