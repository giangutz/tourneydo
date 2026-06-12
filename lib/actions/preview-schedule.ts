'use server'

/**
 * Dry-run schedule preview.
 *
 * Computes the exact same assignments the commit path (regenerateBracketSchedule)
 * would produce, but persists nothing. Used to render a per-court Gantt so the
 * organizer can see the whole day before publishing the schedule.
 */

import { auth } from '@clerk/nextjs/server'
import type { ActionResult } from '@/types/api'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentScheduleConfig, getDivisionScheduleConfigs } from '@/lib/db/queries/schedule'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { assignMatchNumbers, validateSchedule } from '@/lib/utils/match-scheduler'
import { reorderMatchesByStructure, buildSchedulerMatchInput } from '@/lib/utils/scheduling/schedule-input'
import { detectAthleteClashes, buildPlayerLookup } from '@/lib/utils/scheduling/clash-detector'
import { getBeltSkillCategory } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type { SchedulePreviewMatch, SchedulePreviewData } from '@/lib/actions/preview-schedule.types'

/** Minute-of-day from an ISO timestamp, read in the server timezone that
 * produced it (the scheduler builds times with Date.setHours), so the round
 * trip is consistent and the client never has to reinterpret a timezone. */
function minuteOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export async function previewSchedule(
  tournamentId: string
): Promise<ActionResult<SchedulePreviewData>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    const tournament = await getTournamentById(tournamentId)
    if (!tournament || tournament.organizer_id !== userId) {
      return { success: false, error: 'Unauthorized: only organizer can preview the schedule' }
    }

    const scheduleConfig = await getTournamentScheduleConfig(tournamentId)
    if (!scheduleConfig) {
      return { success: false, error: 'Schedule config not found. Save the configuration first.' }
    }

    const matches = await getTournamentMatches(tournamentId)
    if (matches.length === 0) {
      return { success: false, error: 'No matches found. Generate brackets first.' }
    }

    const divisionConfigs = await getDivisionScheduleConfigs(tournamentId)

    const validation = validateSchedule({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: buildSchedulerMatchInput(matches),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!),
    })

    const structSorted = reorderMatchesByStructure(matches)
    const assignments = assignMatchNumbers({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: buildSchedulerMatchInput(structSorted),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!),
    })

    // Player name lookup for display + clash labelling.
    const nameLookup = new Map<string, string>()
    const matchById = new Map(matches.map((m) => [m.id, m]))
    for (const m of matches) {
      if (m.player1?.id) {
        nameLookup.set(m.player1.id, `${m.player1.first_name ?? ''} ${m.player1.last_name ?? ''}`.trim())
      }
      if (m.player2?.id) {
        nameLookup.set(m.player2.id, `${m.player2.first_name ?? ''} ${m.player2.last_name ?? ''}`.trim())
      }
    }

    const previewMatches: SchedulePreviewMatch[] = assignments.map((a) => {
      const m = matchById.get(a.matchId)
      const belt = m?.player1?.belt_level ?? m?.player2?.belt_level ?? null
      return {
        matchId: a.matchId,
        matchNumber: a.matchNumber,
        day: a.day,
        court: a.court,
        startMin: minuteOfDay(a.scheduledStartTime),
        endMin: minuteOfDay(a.scheduledEndTime),
        player1Name: (m?.player1_id && nameLookup.get(m.player1_id)) || (m?.player1_id ? 'TBD' : 'BYE'),
        player2Name: (m?.player2_id && nameLookup.get(m.player2_id)) || (m?.player2_id ? 'TBD' : 'BYE'),
        divisionName: m?.tournament_divisions?.name ?? '',
        categoryName: m?.tournament_categories?.name ?? '',
        roundName: m?.round_name ?? '',
        skillCategory: getBeltSkillCategory(belt),
      }
    })

    const clashes = detectAthleteClashes(
      assignments,
      buildPlayerLookup(
        matches.map((m) => ({ id: m.id!, player1_id: m.player1_id, player2_id: m.player2_id }))
      ),
      nameLookup
    )

    const totalDays = previewMatches.reduce((max, m) => Math.max(max, m.day), 1)

    return {
      success: true,
      data: {
        matches: previewMatches,
        config: {
          courts: scheduleConfig.courts,
          dailyStartTime: scheduleConfig.daily_start_time,
          dailyEndTime: scheduleConfig.daily_end_time,
          lunchEnabled: scheduleConfig.lunch_enabled !== false,
          lunchStartTime: scheduleConfig.lunch_start_time || '12:00',
          lunchEndTime: scheduleConfig.lunch_end_time || '13:00',
        },
        clashes,
        feasible: validation.feasible,
        overflowCount: validation.overflowCount ?? 0,
        totalDays,
      },
    }
  } catch (error) {
    logger.error({ error, tournamentId }, 'previewSchedule failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview schedule',
    }
  }
}
