/**
 * Athlete Clash Detector
 *
 * Detects cross-division double-booking: a single athlete scheduled in two
 * matches whose time windows overlap. This is physically impossible (an athlete
 * cannot compete on two courts simultaneously) and is the classic
 * invisible-until-the-day scheduling failure when an athlete is entered in
 * multiple divisions / weight classes / disciplines.
 *
 * The match-scheduler distributes matches round-robin across courts keyed only
 * on division/category/belt, so it has no awareness that the same person may
 * appear in two different blocks. This module runs as a post-assignment pass
 * over the computed schedule and flags every overlapping pair.
 *
 * It is a pure function with no I/O so it can be unit-tested in isolation and
 * reused by both the feasibility-preview and the schedule-generation flows.
 */

import { AthleteClash, ClashMatchRef, MatchAssignment } from '@/types/models'

/** Player slots for a given match (null = BYE / not yet determined). */
export interface ClashPlayerInfo {
  player1_id: string | null
  player2_id: string | null
}

interface PlayerInterval {
  ref: ClashMatchRef
  startMs: number
  endMs: number
}

/**
 * Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap iff
 * aStart < bEnd AND bStart < aEnd. Touching edges (aEnd === bStart) do NOT
 * overlap, so genuine back-to-back matches are allowed.
 */
function intervalsOverlap(a: PlayerInterval, b: PlayerInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs
}

function toMatchRef(a: MatchAssignment): ClashMatchRef {
  return {
    matchId: a.matchId,
    matchNumber: a.matchNumber,
    court: a.court,
    day: a.day,
    scheduledStartTime: a.scheduledStartTime,
    scheduledEndTime: a.scheduledEndTime,
  }
}

/**
 * Detect athletes scheduled in two overlapping matches.
 *
 * @param assignments  Scheduled matches with start/end timestamps and courts.
 * @param playerLookup Map of matchId -> the two player slots for that match.
 * @param nameLookup   Optional map of playerId -> display name for richer output.
 * @returns One AthleteClash per overlapping pair, ordered deterministically by
 *          day, then earliest start time, then playerId.
 */
export function detectAthleteClashes(
  assignments: MatchAssignment[],
  playerLookup: Map<string, ClashPlayerInfo>,
  nameLookup?: Map<string, string>
): AthleteClash[] {
  // 1. Group every match interval by the athletes competing in it.
  const intervalsByPlayer = new Map<string, PlayerInterval[]>()

  for (const assignment of assignments) {
    const slots = playerLookup.get(assignment.matchId)
    if (!slots) continue // No player data for this match -> cannot evaluate.

    const ref = toMatchRef(assignment)
    const startMs = Date.parse(assignment.scheduledStartTime)
    const endMs = Date.parse(assignment.scheduledEndTime)
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue

    for (const playerId of [slots.player1_id, slots.player2_id]) {
      if (!playerId) continue // BYE / undetermined slot.
      const list = intervalsByPlayer.get(playerId) ?? []
      list.push({ ref, startMs, endMs })
      intervalsByPlayer.set(playerId, list)
    }
  }

  // 2. For each athlete with multiple matches, flag every overlapping pair.
  const clashes: AthleteClash[] = []

  for (const [playerId, intervals] of intervalsByPlayer) {
    if (intervals.length < 2) continue

    // Sort by start time so output and pairing are deterministic.
    const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs)

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]
        // Sorted by start: once b starts at/after a ends, no later j can overlap a.
        if (b.startMs >= a.endMs) break
        if (!intervalsOverlap(a, b)) continue

        const overlapMs = Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs)
        clashes.push({
          playerId,
          playerName: nameLookup?.get(playerId),
          day: a.ref.day,
          overlapMinutes: Math.round(overlapMs / 60000),
          matches: [a.ref, b.ref],
        })
      }
    }
  }

  // 3. Deterministic global ordering: day -> earliest start -> playerId.
  return clashes.sort((x, y) => {
    if (x.day !== y.day) return x.day - y.day
    const xStart = Date.parse(x.matches[0].scheduledStartTime)
    const yStart = Date.parse(y.matches[0].scheduledStartTime)
    if (xStart !== yStart) return xStart - yStart
    return x.playerId.localeCompare(y.playerId)
  })
}

/**
 * Convenience builder: produce the matchId -> player-slots map the detector
 * needs from raw match records that carry player1_id / player2_id.
 */
export function buildPlayerLookup(
  matches: Array<{ id: string; player1_id: string | null; player2_id: string | null }>
): Map<string, ClashPlayerInfo> {
  return new Map(
    matches.map((m) => [m.id, { player1_id: m.player1_id, player2_id: m.player2_id }])
  )
}

/** Minimal shape of a persisted, scheduled match needed for clash detection. */
export interface ScheduledMatchLike {
  id: string
  match_number?: number | null
  match_number_formatted?: string | null
  court_number: number | null
  day_number?: number | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  player1_id: string | null
  player2_id: string | null
}

/**
 * Detect athlete clashes directly from persisted match rows (the authoritative,
 * always-accurate source). Matches without a court or scheduled time window are
 * skipped, so this is safe to call before a schedule has been generated.
 */
export function detectClashesFromScheduledMatches(
  matches: ScheduledMatchLike[],
  nameLookup?: Map<string, string>
): AthleteClash[] {
  const assignments: MatchAssignment[] = []
  const playerLookup = new Map<string, ClashPlayerInfo>()

  for (const m of matches) {
    if (!m.scheduled_start_time || !m.scheduled_end_time || m.court_number == null) continue

    assignments.push({
      matchId: m.id,
      matchNumber: m.match_number_formatted ?? (m.match_number != null ? String(m.match_number) : ''),
      day: m.day_number ?? 1,
      court: m.court_number,
      sequence: 0,
      estimatedStartTime: '',
      scheduledStartTime: m.scheduled_start_time,
      scheduledEndTime: m.scheduled_end_time,
      divisionId: '',
      categoryId: '',
    })
    playerLookup.set(m.id, { player1_id: m.player1_id, player2_id: m.player2_id })
  }

  return detectAthleteClashes(assignments, playerLookup, nameLookup)
}
