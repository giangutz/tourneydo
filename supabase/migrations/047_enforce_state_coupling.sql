-- Migration 047: Enforce coupling between lifecycle_state and status columns
--
-- Problem: matches.status ('scheduled'|'in_progress'|'completed') and
-- matches.lifecycle_state ('AUTO_ADVANCE'|'WAITING'|'CONTEST'|'IN_PROGRESS'|'COMPLETED')
-- are updated independently in application code and can desync, causing schedule
-- recalculation and bracket queries to return inconsistent results.
--
-- Solution: DB trigger that syncs status from lifecycle_state on every write.
-- Application code only needs to set lifecycle_state; status is kept in sync automatically.

CREATE OR REPLACE FUNCTION sync_match_status_from_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.lifecycle_state = 'COMPLETED' THEN
    NEW.status := 'completed';
  ELSIF NEW.lifecycle_state = 'IN_PROGRESS' THEN
    NEW.status := 'in_progress';
  ELSE
    -- AUTO_ADVANCE, WAITING, CONTEST all map to 'scheduled'
    NEW.status := 'scheduled';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any before recreating
DROP TRIGGER IF EXISTS sync_match_status_trigger ON matches;

CREATE TRIGGER sync_match_status_trigger
  BEFORE INSERT OR UPDATE OF lifecycle_state ON matches
  FOR EACH ROW
  EXECUTE FUNCTION sync_match_status_from_lifecycle();

-- Back-fill: sync all existing rows that may be out of alignment
UPDATE matches SET lifecycle_state = lifecycle_state
WHERE status IS DISTINCT FROM (
  CASE lifecycle_state
    WHEN 'COMPLETED'   THEN 'completed'
    WHEN 'IN_PROGRESS' THEN 'in_progress'
    ELSE 'scheduled'
  END
);
