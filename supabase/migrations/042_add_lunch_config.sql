-- Add configurable lunch break to tournament_schedule_config
--
-- Previously the scheduler hardcoded 12:00-13:00 as the lunch window.
-- These columns let organizers set their own window or disable it entirely.
--
-- Defaults match the old hardcoded behaviour so existing rows are unaffected.

ALTER TABLE tournament_schedule_config
  ADD COLUMN IF NOT EXISTS lunch_enabled      boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lunch_start_time   varchar(5)   NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS lunch_end_time     varchar(5)   NOT NULL DEFAULT '13:00';

COMMENT ON COLUMN tournament_schedule_config.lunch_enabled    IS 'Whether a lunch break is enforced in the daily schedule';
COMMENT ON COLUMN tournament_schedule_config.lunch_start_time IS 'Start of lunch break in HH:MM format (24h). Only used when lunch_enabled = true.';
COMMENT ON COLUMN tournament_schedule_config.lunch_end_time   IS 'End of lunch break in HH:MM format (24h). Only used when lunch_enabled = true.';
