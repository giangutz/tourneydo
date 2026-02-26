-- Migration 048: Audit trail table
--
-- Records significant mutations in the tournament lifecycle for dispute resolution,
-- operational transparency, and debugging. Written to from server actions after
-- successful DB mutations.

CREATE TABLE IF NOT EXISTS audit_trail (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  entity_type   TEXT        NOT NULL, -- 'match' | 'bracket' | 'schedule' | 'readiness' | 'participant'
  entity_id     TEXT        NOT NULL, -- UUID or other identifier of the affected entity
  action        TEXT        NOT NULL, -- e.g. 'SCORE_SAVED', 'BRACKET_GENERATED', 'READINESS_TOGGLED'
  actor_id      TEXT        NOT NULL, -- Clerk user ID of the person who performed the action
  previous_state JSONB      DEFAULT NULL,
  new_state      JSONB      DEFAULT NULL,
  metadata       JSONB      DEFAULT NULL, -- Extra context (e.g. win_method, reason for rescore)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS audit_trail_tournament_id_idx ON audit_trail (tournament_id);
CREATE INDEX IF NOT EXISTS audit_trail_entity_idx        ON audit_trail (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_trail_actor_idx         ON audit_trail (actor_id);
CREATE INDEX IF NOT EXISTS audit_trail_created_at_idx    ON audit_trail (created_at DESC);

-- RLS: only the tournament organizer and active staff may read audit entries.
-- No direct insert/update/delete is allowed from client — writes go through
-- server actions with SECURITY DEFINER functions.
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_trail_read_organizer_or_staff"
  ON audit_trail
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = audit_trail.tournament_id
        AND t.organizer_id = (SELECT auth.uid()::text)
    )
    OR
    EXISTS (
      SELECT 1 FROM tournament_staff ts
      WHERE ts.tournament_id = audit_trail.tournament_id
        AND ts.user_id = (SELECT auth.uid()::text)
        AND ts.status = 'active'
    )
  );

-- Server-side insert via SECURITY DEFINER (bypasses RLS for writes from trusted functions)
CREATE OR REPLACE FUNCTION insert_audit_entry(
  p_tournament_id  UUID,
  p_entity_type    TEXT,
  p_entity_id      TEXT,
  p_action         TEXT,
  p_actor_id       TEXT,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state      JSONB DEFAULT NULL,
  p_metadata       JSONB DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO audit_trail
    (tournament_id, entity_type, entity_id, action, actor_id, previous_state, new_state, metadata)
  VALUES
    (p_tournament_id, p_entity_type, p_entity_id, p_action, p_actor_id, p_previous_state, p_new_state, p_metadata);
END;
$$;
