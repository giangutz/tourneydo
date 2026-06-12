/**
 * WT-Compliant Match Lifecycle Management
 * 
 * This module handles match state transitions and readiness determination
 * according to World Taekwondo competition rules.
 */

import { Match } from '@/types/models'

// ============================================================================
// Constants
// ============================================================================

/** Minimum recovery time between matches for an athlete (in minutes) */
export const MINIMUM_RECOVERY_MINUTES = 15

// ============================================================================
// Source-match resolution
// ============================================================================

/**
 * Gets the source matches that feed into a given match.
 *
 * Accepts either the full match array (O(n) scan) or a precomputed
 * Map<id, Match> index (O(sources) lookup). Callers that resolve source
 * matches repeatedly — e.g. isMatchReady() inside a render loop — should pass
 * the Map to avoid an O(n) filter per call.
 */
export function getSourceMatches(
  match: Match,
  allMatches: Match[] | Map<string, Match>
): Match[] {
  if (!match.source_match_ids || match.source_match_ids.length === 0) {
    return []
  }

  if (allMatches instanceof Map) {
    return match.source_match_ids
      .map((id) => allMatches.get(id))
      .filter((m): m is Match => m !== undefined)
  }

  return allMatches.filter((m) => match.source_match_ids.includes(m.id))
}

// ============================================================================
// Match Readiness
// ============================================================================

export interface CourtStatus {
  courtNumber: number
  isOccupied: boolean
  currentMatchId: string | null
  availableAt: Date
}

export interface ReadinessResult {
  isReady: boolean
  blockedReasons: string[]
}

/**
 * Determines if a match is ready to be called to the court.
 * 
 * A match is ready if and only if:
 * 1. lifecycle_state === 'CONTEST'
 * 2. All source matches are COMPLETED
 * 3. Both athletes are known
 * 4. Both athletes are called/ready (NEW: WT operational gate)
 * 5. Both athletes have satisfied their recovery time
 * 6. The assigned court is free
 */
export function isMatchReady(
  match: Match,
  allMatches: Match[] | Map<string, Match>,
  courtStatus: Map<number, CourtStatus>,
  readiness?: { athlete1Called: boolean; athlete2Called: boolean },
  currentTime: Date = new Date()
): ReadinessResult {
  const blockedReasons: string[] = []

  // 1. Check lifecycle state
  if (match.lifecycle_state !== 'CONTEST') {
    blockedReasons.push(`Match is in ${match.lifecycle_state} state, not CONTEST`)
  }

  // 2. Check source match dependencies
  const sourceMatches = getSourceMatches(match, allMatches)
  const incompleteSourceIds = sourceMatches
    .filter((sm) => sm.lifecycle_state !== 'COMPLETED' && sm.lifecycle_state !== 'AUTO_ADVANCE')
    .map((sm) => sm.id)

  if (incompleteSourceIds.length > 0) {
    blockedReasons.push(`Waiting for ${incompleteSourceIds.length} source match(es) to complete`)
  }

  // 3. Check if both athletes are known
  if (match.player1_id === null) {
    blockedReasons.push('Player 1 not yet determined')
  }
  if (match.player2_id === null) {
    blockedReasons.push('Player 2 not yet determined')
  }

  // 4. NEW: Check athlete readiness (WT operational gate)
  if (readiness) {
    if (!readiness.athlete1Called && match.player1_id) {
      blockedReasons.push('Waiting for Athlete 1 to be called')
    }
    if (!readiness.athlete2Called && match.player2_id) {
      blockedReasons.push('Waiting for Athlete 2 to be called')
    }
  }

  // 5. Check athlete recovery time
  if (match.athlete1_available_at) {
    const availableTime = new Date(match.athlete1_available_at)
    if (currentTime < availableTime) {
      const waitMins = Math.ceil((availableTime.getTime() - currentTime.getTime()) / 60000)
      blockedReasons.push(`Player 1 needs ${waitMins} more minutes of recovery`)
    }
  }

  if (match.athlete2_available_at) {
    const availableTime = new Date(match.athlete2_available_at)
    if (currentTime < availableTime) {
      const waitMins = Math.ceil((availableTime.getTime() - currentTime.getTime()) / 60000)
      blockedReasons.push(`Player 2 needs ${waitMins} more minutes of recovery`)
    }
  }

  // 6. Check court availability
  if (match.court_number !== null) {
    const court = courtStatus.get(match.court_number)
    if (court && court.isOccupied) {
      blockedReasons.push(`Court ${match.court_number} is occupied`)
    }
  }

  return {
    isReady: blockedReasons.length === 0,
    blockedReasons
  }
}

// ============================================================================
// State Transitions
// ============================================================================

/**
 * Transitions a match to IN_PROGRESS state when called to court
 */
export function startMatch(match: Match): Partial<Match> {
  if (match.lifecycle_state !== 'CONTEST') {
    throw new Error(`Cannot start match in ${match.lifecycle_state} state. Must be CONTEST.`)
  }

  return {
    lifecycle_state: 'IN_PROGRESS',
    status: 'in_progress',
    actual_start_time: new Date().toISOString()
  }
}

/**
 * Completes a match and calculates athlete availability for next match
 */
export function completeMatch(
  match: Match,
  winnerId: string
): Partial<Match> {
  if (match.lifecycle_state !== 'IN_PROGRESS') {
    throw new Error(`Cannot complete match in ${match.lifecycle_state} state. Must be IN_PROGRESS.`)
  }

  const endTime = new Date()

  return {
    lifecycle_state: 'COMPLETED',
    status: 'completed',
    winner_id: winnerId,
    actual_end_time: endTime.toISOString()
    // Note: downstream athlete availability is set by the advance_match_winner RPC.
  }
}

// Note: winner advancement (filling the next match's slots and recomputing
// lifecycle state) is performed atomically in Postgres via the
// `advance_match_winner` RPC. The former JS implementations (propagateWinner /
// computeLifecycleState) were unused and have been removed to avoid a second,
// O(matches²) source of truth drifting from the DB.

// ============================================================================
// Filtering Utilities
// ============================================================================

/**
 * Get all matches that should be visible in the bracket UI
 * (excludes AUTO_ADVANCE matches)
 */
export function getVisibleMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.lifecycle_state !== 'AUTO_ADVANCE')
}

/**
 * Get all matches that should be scheduled (have court time)
 * (excludes AUTO_ADVANCE matches)
 */
export function getSchedulableMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.lifecycle_state !== 'AUTO_ADVANCE')
}

/**
 * Get all matches that are callable to a court right now
 * (only CONTEST state matches)
 */
export function getCallableMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.lifecycle_state === 'CONTEST')
}

/**
 * Get the next callable match for a specific court
 * This is what WT desk operators use to call matches
 */
export function getNextCallableMatch(
  court: number,
  matches: Match[]
): Match | null {
  const courtMatches = matches
    .filter((m) => m.court_number === court)
    .filter((m) => m.lifecycle_state === 'CONTEST')
    .sort((a, b) => (a.match_sequence ?? 0) - (b.match_sequence ?? 0))

  return courtMatches[0] || null
}
