// Add this new action to the end of schedule.ts
// This will be called from the brackets action explicitly

'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import {
  getTournamentScheduleConfig,
  calculateDivisionPriorities,
  updateMatchSchedule,
  getDivisionScheduleConfigs,
  archiveMatchNumbers
} from '@/lib/db/queries/schedule'
import { getMatchesForScheduling } from '@/lib/db/queries/matches'
import { assignMatchNumbers } from '@/lib/utils/match-scheduler'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendScheduleChangedNotification } from '@/lib/email/send-coach-notification'
import { logger } from '@/lib/logger'
import { AthleteClash, MatchAssignment, ScheduleValidationResult } from '@/types/models'
import { detectAthleteClashes, buildPlayerLookup } from '@/lib/utils/scheduling/clash-detector'
import { reorderMatchesByStructure, buildSchedulerMatchInput } from '@/lib/utils/scheduling/schedule-input'

interface ScheduleSummary {
  totalMatches: number
  totalDays: number
  courtsUsed: number
  dailyHours: number
  utilizationPercent: number
  matchesPerDay: Record<number, number>
  earliestStart?: string
  latestEnd?: string
  athleteClashes?: AthleteClash[]
  athleteClashCount?: number
}

/**
 * Regenerate brackets and assign match numbers
 * This is a separate action from saving schedule config
 */
export async function regenerateBracketSchedule(
  tournamentId: string
): Promise<{ success: true; data: ScheduleSummary } | { success: false; error: string } | { success: false; error: string; data: ScheduleValidationResult }> {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // Check if user is organizer
    const tournament = await getTournamentById(tournamentId)
    if (!tournament || tournament.organizer_id !== userId) {
      throw new Error('Unauthorized: only organizer can regenerate schedule')
    }

    const scheduleConfig = await getTournamentScheduleConfig(tournamentId)
    if (!scheduleConfig) {
      throw new Error('Schedule config not found. Please configure schedule first.')
    }

    const matches = await getMatchesForScheduling(tournamentId)
    if (matches.length === 0) {
      throw new Error('No matches found. Please generate brackets first.')
    }

    // Archive old match numbers
    await archiveMatchNumbers(tournamentId)

    // Recalculate division priorities
    const priorityConfigs = await calculateDivisionPriorities(tournamentId)

    // Save division configs in a single bulk upsert (keyed on the unique
    // tournament/division/category triple) instead of N sequential round-trips.
    const supabase = createServerSupabaseClient()
    if (priorityConfigs.length > 0) {
      const { error: divConfigError } = await supabase
        .from('division_schedule_config')
        .upsert(priorityConfigs, { onConflict: 'tournament_id,division_id,category_id' })
      if (divConfigError) {
        logger.error(
          { error: divConfigError, tournamentId },
          'Failed to upsert division schedule configs'
        )
      }
    }

    const divisionConfigs = await getDivisionScheduleConfigs(tournamentId)

    // Validate schedule feasibility BEFORE generating
    const { validateSchedule } = await import('@/lib/utils/match-scheduler')
    const validation = validateSchedule({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: buildSchedulerMatchInput(matches),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!)
    })

    // If schedule is not feasible, return validation data for UI display
    if (!validation.feasible) {
      return {
        success: false,
        error: 'Schedule constraints exceeded',
        data: validation
      }
    }

    const structSortedMatches = reorderMatchesByStructure(matches)

    // Run assignment logic
    const assignments = assignMatchNumbers({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: buildSchedulerMatchInput(structSortedMatches),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!)
    })

    await updateMatchSchedule(tournamentId, assignments)

    // Detect cross-division athlete double-booking (overlapping matches for one
    // athlete on different courts). Non-blocking: surfaced as a warning so the
    // organizer can resolve via the court manager or by adjusting divisions.
    const playerLookup = buildPlayerLookup(
      matches.map((m) => ({
        id: m.id!,
        player1_id: m.player1_id,
        player2_id: m.player2_id,
      }))
    )
    const nameLookup = new Map<string, string>()
    for (const m of matches) {
      if (m.player1?.id) {
        nameLookup.set(m.player1.id, `${m.player1.first_name ?? ''} ${m.player1.last_name ?? ''}`.trim())
      }
      if (m.player2?.id) {
        nameLookup.set(m.player2.id, `${m.player2.first_name ?? ''} ${m.player2.last_name ?? ''}`.trim())
      }
    }
    const athleteClashes = detectAthleteClashes(assignments, playerLookup, nameLookup)
    if (athleteClashes.length > 0) {
      logger.warn(
        { tournamentId, athleteClashCount: athleteClashes.length },
        'Schedule generated with athlete clashes'
      )
    }

    // Calculate schedule summary for UI display
    const matchesPerDay: Record<number, number> = {}
    let earliestStart: Date | null = null
    let latestEnd: Date | null = null

    assignments.forEach((match: MatchAssignment) => {
      const day = match.day
      matchesPerDay[day] = (matchesPerDay[day] || 0) + 1

      const startTime = new Date(match.scheduledStartTime)
      const endTime = new Date(match.scheduledEndTime)

      if (!earliestStart || startTime < earliestStart) earliestStart = startTime
      if (!latestEnd || endTime > latestEnd) latestEnd = endTime
    })

    // Helper function to convert time string (HH:MM) to minutes
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }

    const totalDays = Object.keys(matchesPerDay).length > 0
      ? Math.max(...Object.keys(matchesPerDay).map(Number))
      : 0
    const startMinutes = timeToMinutes(scheduleConfig.daily_start_time)
    const endMinutes = timeToMinutes(scheduleConfig.daily_end_time)
    const dailyMinutes = endMinutes - startMinutes
    const totalAvailableMinutes = dailyMinutes * scheduleConfig.courts * totalDays
    const totalRequiredMinutes = assignments.reduce((sum: number, m: MatchAssignment) => {
      const start = new Date(m.scheduledStartTime)
      const end = new Date(m.scheduledEndTime)
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
      return sum + durationMinutes
    }, 0)
    const utilizationPercent = (totalRequiredMinutes / totalAvailableMinutes) * 100

    const scheduleSummary = {
      totalMatches: assignments.length,
      totalDays,
      courtsUsed: scheduleConfig.courts,
      dailyHours: dailyMinutes / 60,
      utilizationPercent,
      matchesPerDay,
      earliestStart: earliestStart !== null ? (earliestStart as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
      latestEnd: latestEnd !== null ? (latestEnd as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
      athleteClashes,
      athleteClashCount: athleteClashes.length
    }

    // Notify coaches of schedule change — fire-and-forget
    if (tournament) {
      sendScheduleChangedNotification(tournamentId, tournament.name!).catch(err =>
        logger.warn({ err, tournamentId }, 'Failed to send schedule changed notifications')
      )
    }

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}`)

    return { success: true, data: scheduleSummary }
  } catch (error) {
    logger.error({ error, tournamentId }, 'regenerateBracketSchedule failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate schedule'
    }
  }
}
