/**
 * Audit Trail — Query Layer
 *
 * Provides server-side helpers for writing and reading audit entries.
 * All writes go through the `insert_audit_entry` SECURITY DEFINER RPC so that
 * Row Level Security on the audit_trail table cannot block server action writes.
 *
 * Read access is gated by RLS (organizer or active staff only).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditEntityType = 'match' | 'bracket' | 'schedule' | 'readiness' | 'participant'

export type AuditAction =
  | 'SCORE_SAVED'
  | 'MATCH_RESCORED'
  | 'BRACKET_GENERATED'
  | 'BRACKET_REGENERATED'
  | 'SCHEDULE_RECALCULATED'
  | 'READINESS_TOGGLED'
  | 'PARTICIPANT_ADDED'
  | 'PARTICIPANT_REMOVED'

export interface AuditEntry {
  id: string
  tournament_id: string
  entity_type: AuditEntityType
  entity_id: string
  action: AuditAction
  actor_id: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CreateAuditEntryParams {
  tournamentId: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  actorId: string
  previousState?: Record<string, unknown> | null
  newState?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

// ─── Write ───────────────────────────────────────────────────────────────────

/**
 * Write a single audit entry via the SECURITY DEFINER RPC.
 * Failures are logged but never thrown — audit writes must not block primary mutations.
 */
export async function createAuditEntry(params: CreateAuditEntryParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.rpc('insert_audit_entry', {
      p_tournament_id: params.tournamentId,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_action: params.action,
      p_actor_id: params.actorId,
      p_previous_state: (params.previousState ?? null) as any,
      p_new_state: (params.newState ?? null) as any,
      p_metadata: (params.metadata ?? null) as any,
    })

    if (error) {
      console.error('[audit] Failed to write audit entry:', error.message, params)
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit entry:', err, params)
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export interface GetAuditTrailOptions {
  /** Filter by entity type (optional) */
  entityType?: AuditEntityType
  /** Filter by entity id (optional) */
  entityId?: string
  /** Page number (1-based) */
  page?: number
  /** Entries per page (default: 50) */
  pageSize?: number
}

/**
 * Get paginated audit entries for a tournament.
 * Returns entries newest-first. Caller must be the organizer or active staff
 * (enforced by RLS on the audit_trail table).
 */
export async function getAuditTrail(
  tournamentId: string,
  options: GetAuditTrailOptions = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  const supabase = createServerSupabaseClient()
  const { entityType, entityId, page = 1, pageSize = 50 } = options

  let query = supabase
    .from('audit_trail')
    .select('*', { count: 'exact' })
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (entityType) query = query.eq('entity_type', entityType)
  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch audit trail: ${error.message}`)
  }

  return {
    entries: (data as AuditEntry[]) || [],
    total: count ?? 0,
  }
}
