'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import {
  getTournamentScheduleConfig,
  getDivisionScheduleConfigs,
  updateMatchSchedule
} from '@/lib/db/queries/schedule'
import { assignMatchNumbers } from '@/lib/utils/match-scheduler'
import { createAuditEntry } from '@/lib/db/queries/audit-trail'
import { sendScheduleChangedNotification } from '@/lib/email/send-coach-notification'
import { logger } from '@/lib/logger'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import type { MatchAssignment } from '@/types/models'

/**
 * Recalculate the schedule for all remaining (non-completed) matches.
 *
 * Called after a match completes during a live tournament. Uses actual court
 * availability (derived from actual_end_time of completed matches and
 * scheduled_end_time of in-progress matches) so that early finishes pull
 * forward later matches and delays push them back.
 *
 * Only pending/CONTEST matches are rescheduled. Completed and in-progress
 * matches are left untouched.
 */
export async function recalculateRemainingSchedule(
  tournamentId: string
): Promise<ActionResult<{ rescheduled: number }>> {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const tournament = await getTournamentById(tournamentId)
    if (!tournament || tournament.organizer_id !== userId) {
      throw new Error('Unauthorized: only the organizer can recalculate the schedule')
    }

    const scheduleConfig = await getTournamentScheduleConfig(tournamentId)
    if (!scheduleConfig) {
      throw new Error('Schedule config not found. Please configure the schedule first.')
    }

    // Calculate the current tournament day (1-based) so court availability is
    // scoped to today only — multi-day tournaments restart court numbering each day.
    const startDate = new Date(tournament.start_date!)
    startDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const currentDayNumber = Math.max(1, daysDiff + 1)

    // Derive per-court availability from actual/scheduled end times of active matches
    const courtInitialTimes = await deriveCourtAvailability(tournamentId, scheduleConfig.courts, currentDayNumber)

    const allMatches = await getTournamentMatches(tournamentId)

    // Only reschedule CONTEST/WAITING matches (immutable: IN_PROGRESS, COMPLETED, AUTO_ADVANCE)
    const rescheduleable = allMatches.filter(m => {
      const state = (m as any).lifecycle_state
      return state !== 'IN_PROGRESS' && state !== 'COMPLETED' && state !== 'AUTO_ADVANCE'
    })

    if (rescheduleable.length === 0) {
      return { success: true, data: { rescheduled: 0 } }
    }

    const divisionConfigs = await getDivisionScheduleConfigs(tournamentId)

    const assignments = assignMatchNumbers({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: rescheduleable.map(m => {
        const raw = m as any
        return {
          id: m.id!,
          divisionId: m.division_id!,
          categoryId: m.category_id!,
          round: m.round,
          status: m.status,
          winner_id: m.winner_id,
          next_match_id: raw.next_match_id,
          belt_level: raw.player1?.belt_level || raw.player2?.belt_level,
          division_name: raw.tournament_divisions?.name,
          category_name: raw.tournament_categories?.name,
          gender: raw.tournament_categories?.gender,
          round_name: raw.round_name,
          round_order: raw.round_order,
          structural_match_number: raw.structural_match_number,
          bracket_position: raw.bracket_position,
          lifecycle_state: raw.lifecycle_state
        }
      }),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!),
      courtInitialTimes
    })

    await updateMatchSchedule(tournamentId, assignments)

    // Audit: schedule recalculated
    await createAuditEntry({
      tournamentId,
      entityType: 'schedule',
      entityId: tournamentId,
      action: 'SCHEDULE_RECALCULATED',
      actorId: userId,
      metadata: { rescheduled: assignments.length, dayNumber: currentDayNumber },
    })

    // Notify coaches of schedule change — fire-and-forget
    sendScheduleChangedNotification(tournamentId, tournament.name!).catch(err =>
      logger.warn({ err, tournamentId }, 'Failed to send schedule changed notifications')
    )

    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))

    return { success: true, data: { rescheduled: assignments.length } }
  } catch (error) {
    logger.error({ error, tournamentId }, 'recalculateRemainingSchedule failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recalculate schedule'
    }
  }
}

/**
 * For each court, find the latest time it is occupied on the given day:
 *   - actual_end_time  for COMPLETED matches (real finish)
 *   - scheduled_end_time for IN_PROGRESS matches (best estimate while active)
 *
 * Scoped to `dayNumber` so that Day 1 data does not offset Day 2 court
 * availability (courts restart numbering per tournament day).
 *
 * Returns a map of { courtNumber: ISOString } for courts that have activity.
 * Courts with no activity are omitted (scheduler starts them from day start).
 */
async function deriveCourtAvailability(
  tournamentId: string,
  totalCourts: number,
  dayNumber: number
): Promise<Record<number, string>> {
  const supabase = createServerSupabaseClient()

  const { data: activeMatches } = await supabase
    .from('matches')
    .select('court_number, lifecycle_state, actual_end_time, scheduled_end_time')
    .eq('tournament_id', tournamentId)
    .eq('day_number', dayNumber)
    .in('lifecycle_state', ['IN_PROGRESS', 'COMPLETED'])
    .not('court_number', 'is', null)

  if (!activeMatches || activeMatches.length === 0) return {}

  const courtAvailability: Record<number, string> = {}

  for (const match of activeMatches) {
    const court = match.court_number as number
    if (court < 1 || court > totalCourts) continue

    // Prefer actual_end_time (real data); fall back to scheduled_end_time
    const endTime = match.actual_end_time || match.scheduled_end_time
    if (!endTime) continue

    const existing = courtAvailability[court]
    if (!existing || new Date(endTime) > new Date(existing)) {
      courtAvailability[court] = endTime
    }
  }

  return courtAvailability
}
