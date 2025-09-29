-- Add email column to athletes table
-- This fixes the "Could not find the 'email' column of 'athletes'" error

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_athletes_email ON athletes(email);

-- Update existing athletes with email from their profile if linked
UPDATE athletes 
SET email = profiles.email 
FROM profiles 
WHERE athletes.profile_id = profiles.id 
AND athletes.email IS NULL;

-- Add constraint to ensure email format is valid
ALTER TABLE athletes ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

COMMENT ON COLUMN athletes.email IS 'Athlete email address for direct communication and registration';
