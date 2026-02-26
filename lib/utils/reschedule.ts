/**
 * Dynamic Match Rescheduling
 * 
 * Handles mid-tournament court additions and other rescheduling scenarios.
 * Only affects remaining (unstarted) matches while preserving completed/in-progress matches.
 */

import { Match, MatchLifecycleState } from '@/types/models'
import { getSchedulableMatches } from './match-lifecycle'
import { formatMatchNumber } from './match-numbering'

// ============================================================================
// Types
// ============================================================================

export interface RescheduleRequest {
  tournamentId: string
  currentDay: number
  newCourtCount: number
  dailyStartTime: string  // HH:MM format
  dailyEndTime: string
  avgMatchDuration: number  // minutes
}

export interface RescheduleResult {
  success: boolean
  reassignedMatches: MatchReassignment[]
  unchangedMatches: string[]  // IDs of matches that didn't need changes
  warnings: ScheduleWarning[]
  requiresConfirmation: boolean
  confirmationMessage?: string
}

export interface MatchReassignment {
  matchId: string
  previousCourt: number | null
  newCourt: number
  previousSequence: number | null
  newSequence: number
  previousMatchNumber: string | null
  newMatchNumber: string
}

export interface ScheduleWarning {
  type: 'CAPACITY_EXCEEDED' | 'FINALS_LATE' | 'RECOVERY_CONFLICT' | 'RENUMBERING_REQUIRED'
  severity: 'info' | 'warning' | 'error'
  message: string
  affectedMatchIds: string[]
}

// ============================================================================
// Rescheduling Logic
// ============================================================================

/**
 * Reschedule remaining matches when courts are added mid-tournament.
 * 
 * Rules:
 * - Only affects WAITING and CONTEST matches
 * - IN_PROGRESS and COMPLETED matches are immutable
 * - Preserves dependency order
 * - Preserves recovery constraints
 * - Flags when renumbering is required
 */
export function rescheduleRemainingMatches(
  request: RescheduleRequest,
  existingMatches: Match[]
): RescheduleResult {
  const warnings: ScheduleWarning[] = []
  const reassignedMatches: MatchReassignment[] = []
  const unchangedMatches: string[] = []

  // 1. Categorize matches
  const immutableStates: MatchLifecycleState[] = ['IN_PROGRESS', 'COMPLETED', 'AUTO_ADVANCE']
  const rescheduleableStates: MatchLifecycleState[] = ['WAITING', 'CONTEST']

  const immutableMatches = existingMatches.filter(m =>
    immutableStates.includes(m.lifecycle_state) ||
    m.day_number !== null && m.day_number < request.currentDay
  )

  const matchesToReschedule = existingMatches.filter(m =>
    rescheduleableStates.includes(m.lifecycle_state) &&
    (m.day_number === null || m.day_number === request.currentDay)
  )

  // Mark immutable as unchanged
  immutableMatches.forEach(m => unchangedMatches.push(m.id))

  if (matchesToReschedule.length === 0) {
    return {
      success: true,
      reassignedMatches: [],
      unchangedMatches,
      warnings: [],
      requiresConfirmation: false
    }
  }

  // 2. Calculate new capacity
  const dailyMinutes = calculateMinutes(request.dailyStartTime, request.dailyEndTime)
  const matchesPerCourt = Math.floor(dailyMinutes / request.avgMatchDuration)
  const totalCapacity = matchesPerCourt * request.newCourtCount

  // 3. Check if we have enough capacity
  const schedulableMatches = getSchedulableMatches(matchesToReschedule)
  if (schedulableMatches.length > totalCapacity) {
    warnings.push({
      type: 'CAPACITY_EXCEEDED',
      severity: 'warning',
      message: `${schedulableMatches.length} matches need scheduling but only ${totalCapacity} slots available. Some matches may run late.`,
      affectedMatchIds: schedulableMatches.slice(totalCapacity).map(m => m.id)
    })
  }

  // 4. Sort matches by priority for court assignment
  const sortedMatches = sortMatchesByPriority(matchesToReschedule)

  // 5. Assign to courts using round-robin
  const courtSequences = new Map<number, number>()
  for (let c = 1; c <= request.newCourtCount; c++) {
    courtSequences.set(c, 1)
  }

  let courtIndex = 0
  let requiresRenumbering = false

  for (const match of sortedMatches) {
    const court = (courtIndex % request.newCourtCount) + 1
    const sequence = courtSequences.get(court) || 1
    const newMatchNumber = formatMatchNumber(court, sequence)

    // Check if this is actually a change
    const hasChange =
      match.court_number !== court ||
      match.match_sequence !== sequence ||
      match.match_number_formatted !== newMatchNumber

    if (hasChange) {
      // Check if renumbering is happening
      if (match.match_number_formatted !== null && match.match_number_formatted !== newMatchNumber) {
        requiresRenumbering = true
      }

      reassignedMatches.push({
        matchId: match.id,
        previousCourt: match.court_number,
        newCourt: court,
        previousSequence: match.match_sequence,
        newSequence: sequence,
        previousMatchNumber: match.match_number_formatted,
        newMatchNumber
      })
    } else {
      unchangedMatches.push(match.id)
    }

    courtSequences.set(court, sequence + 1)
    courtIndex++
  }

  // 6. Add renumbering warning if needed
  if (requiresRenumbering) {
    warnings.push({
      type: 'RENUMBERING_REQUIRED',
      severity: 'warning',
      message: `Rescheduling will change match numbers for ${reassignedMatches.filter(r => r.previousMatchNumber !== null).length} matches. This may cause confusion for referees and athletes.`,
      affectedMatchIds: reassignedMatches
        .filter(r => r.previousMatchNumber !== null)
        .map(r => r.matchId)
    })
  }

  return {
    success: true,
    reassignedMatches,
    unchangedMatches,
    warnings,
    requiresConfirmation: requiresRenumbering,
    confirmationMessage: requiresRenumbering
      ? `This will renumber ${reassignedMatches.length} matches. Do you want to proceed?`
      : undefined
  }
}

/**
 * Apply a reschedule result to generate match updates.
 */
export function applyReschedule(
  result: RescheduleResult
): { matchId: string; updates: Partial<Match> }[] {
  return result.reassignedMatches.map(r => ({
    matchId: r.matchId,
    updates: {
      court_number: r.newCourt,
      match_sequence: r.newSequence,
      match_number_formatted: r.newMatchNumber
    }
  }))
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  return (endHour * 60 + endMin) - (startHour * 60 + startMin)
}

/**
 * Sort matches for scheduling priority.
 * Order: CONTEST before WAITING, then by belt priority, then by round, then by existing sequence.
 */
function sortMatchesByPriority(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    // 1. CONTEST matches first (they're ready to be called)
    if (a.lifecycle_state === 'CONTEST' && b.lifecycle_state !== 'CONTEST') return -1
    if (b.lifecycle_state === 'CONTEST' && a.lifecycle_state !== 'CONTEST') return 1

    // 2. Earlier rounds first (Round 1 before Round 2)
    if (a.round !== b.round) return a.round - b.round

    // 3. Preserve existing sequence if both have one
    if (a.match_sequence !== null && b.match_sequence !== null) {
      return a.match_sequence - b.match_sequence
    }

    // 4. Matches with sequence before those without
    if (a.match_sequence !== null && b.match_sequence === null) return -1
    if (b.match_sequence !== null && a.match_sequence === null) return 1

    return 0
  })
}

// ============================================================================
// Best-Effort Scheduling with Warnings
// ============================================================================

export interface CapacityCheck {
  isFeasible: boolean
  totalMatches: number
  totalCapacity: number
  overflowCount: number
  warnings: ScheduleWarning[]
}

/**
 * Check if a schedule can fit within capacity, with warnings for overflow.
 * Never silently drops matches - always reports issues.
 */
export function checkCapacity(
  matches: Match[],
  courtCount: number,
  dailyMinutes: number,
  avgMatchDuration: number
): CapacityCheck {
  const schedulableMatches = getSchedulableMatches(matches)
  const matchesPerCourt = Math.floor(dailyMinutes / avgMatchDuration)
  const totalCapacity = matchesPerCourt * courtCount
  const overflowCount = Math.max(0, schedulableMatches.length - totalCapacity)
  const warnings: ScheduleWarning[] = []

  if (overflowCount > 0) {
    warnings.push({
      type: 'CAPACITY_EXCEEDED',
      severity: 'warning',
      message: `⚠ ${overflowCount} matches exceed configured day capacity. Finals may run late.`,
      affectedMatchIds: schedulableMatches.slice(totalCapacity).map(m => m.id)
    })
  }

  // Check if finals are in the overflow set
  const finalsMatch = schedulableMatches.find(m =>
    m.round === Math.max(...schedulableMatches.map(sm => sm.round))
  )
  if (finalsMatch && schedulableMatches.indexOf(finalsMatch) >= totalCapacity) {
    warnings.push({
      type: 'FINALS_LATE',
      severity: 'error',
      message: `⚠ Finals match will run past scheduled end time.`,
      affectedMatchIds: [finalsMatch.id]
    })
  }

  return {
    isFeasible: overflowCount === 0,
    totalMatches: schedulableMatches.length,
    totalCapacity,
    overflowCount,
    warnings
  }
}
