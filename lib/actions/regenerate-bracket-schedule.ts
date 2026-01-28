// Add this new action to the end of schedule.ts
// This will be called from the brackets action explicitly

'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types/api'
import {
  getTournamentScheduleConfig,
  upsertTournamentScheduleConfig,
  calculateDivisionPriorities,
  updateMatchSchedule,
  getDivisionScheduleConfigs,
  archiveMatchNumbers
} from '@/lib/db/queries/schedule'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { assignMatchNumbers } from '@/lib/utils/match-scheduler'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * Regenerate brackets and assign match numbers
 * This is a separate action from saving schedule config
 */
export async function regenerateBracketSchedule(
  tournamentId: string
): Promise<ActionResult<void> | { success: false; error: string; data: any }> {
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

    const matches = await getTournamentMatches(tournamentId)
    if (matches.length === 0) {
      throw new Error('No matches found. Please generate brackets first.')
    }

    // Archive old match numbers
    await archiveMatchNumbers(tournamentId)

    // Recalculate division priorities
    const priorityConfigs = await calculateDivisionPriorities(tournamentId)

    // Save division configs
    const supabase = createServerSupabaseClient()
    for (const divConfig of priorityConfigs) {
      await supabase.from('division_schedule_config').upsert(divConfig)
    }

    const divisionConfigs = await getDivisionScheduleConfigs(tournamentId)

    // Validate schedule feasibility BEFORE generating
    const { validateSchedule } = await import('@/lib/utils/match-scheduler')
    const validation = validateSchedule({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: matches.map(m => {
        const raw = m as any
        return {
          id: m.id!,
          divisionId: m.division_id!,
          categoryId: m.category_id!,
          round: m.round,
          status: m.status,
          winner_id: m.winner_id,
          belt_level: raw.player1?.belt_level || raw.player2?.belt_level,
          division_name: raw.tournament_divisions?.name,
          category_name: raw.tournament_categories?.name,
          gender: raw.tournament_categories?.gender
        }
      }),
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

    // Run assignment logic
    const assignments = assignMatchNumbers({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: matches.map(m => {
        const raw = m as any
        return {
          id: m.id!,
          divisionId: m.division_id!,
          categoryId: m.category_id!,
          round: m.round,
          status: m.status,
          winner_id: m.winner_id,
          // Extended fields for scheduler
          belt_level: raw.player1?.belt_level || raw.player2?.belt_level,
          division_name: raw.tournament_divisions?.name,
          category_name: raw.tournament_categories?.name,
          gender: raw.tournament_categories?.gender
        }
      }),
      startDate: new Date(tournament.start_date!),
      endDate: new Date(tournament.end_date!)
    })

    await updateMatchSchedule(tournamentId, assignments)

    // Calculate schedule summary for UI display
    const matchesPerDay: Record<number, number> = {}
    let earliestStart: Date | null = null
    let latestEnd: Date | null = null

    assignments.forEach(match => {
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

    const totalDays = Math.max(...Object.keys(matchesPerDay).map(Number))
    const startMinutes = timeToMinutes(scheduleConfig.daily_start_time)
    const endMinutes = timeToMinutes(scheduleConfig.daily_end_time)
    const dailyMinutes = endMinutes - startMinutes
    const totalAvailableMinutes = dailyMinutes * scheduleConfig.courts * totalDays
    const totalRequiredMinutes = assignments.reduce((sum, m) => {
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
      latestEnd: latestEnd !== null ? (latestEnd as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined
    }

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}`)

    return { success: true, data: scheduleSummary as any }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate schedule'
    }
  }
}
