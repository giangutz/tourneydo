-- Add court_number to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS court_number INT;
