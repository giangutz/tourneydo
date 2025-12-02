-- Add first_name and last_name to users table
ALTER TABLE users 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Create index for name search
CREATE INDEX idx_users_name ON users(last_name, first_name);
