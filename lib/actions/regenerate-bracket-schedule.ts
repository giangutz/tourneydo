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
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { assignMatchNumbers } from '@/lib/utils/match-scheduler'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { sendScheduleChangedNotification } from '@/lib/email/send-coach-notification'
import { logger } from '@/lib/logger'
import { Match, MatchAssignment, ScheduleValidationResult } from '@/types/models'

interface ScheduleSummary {
  totalMatches: number
  totalDays: number
  courtsUsed: number
  dailyHours: number
  utilizationPercent: number
  matchesPerDay: Record<number, number>
  earliestStart?: string
  latestEnd?: string
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
      matches: matches.map(m => ({
        id: m.id!,
        divisionId: m.division_id!,
        categoryId: m.category_id!,
        round: m.round,
        status: m.status,
        winner_id: m.winner_id,
        next_match_id: m.next_match_id, // Critical for dependencies
        belt_level: m.player1?.belt_level ?? m.player2?.belt_level ?? undefined,
        division_name: m.tournament_divisions?.name,
        category_name: m.tournament_categories?.name,
        gender: m.tournament_categories?.gender,
        round_name: m.round_name,
        round_order: m.round_order,
        structural_match_number: m.structural_match_number,
        bracket_position: m.bracket_position,
        lifecycle_state: m.lifecycle_state
      })),
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

    // Helper to sort matches structurally (Top-to-Bottom visual order)
    function reorderMatchesByStructure(matches: Match[]): Match[] {
      // If all matches have structural_match_number, use it directly
      // (This is the case for newly generated brackets with DFS numbering)
      const allHaveStructural = matches.every(m =>
        m.structural_match_number != null && m.structural_match_number > 0
      )

      if (allHaveStructural) {
        // Simple sort by round and structural number
        return [...matches].sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round
          return (a.structural_match_number ?? 0) - (b.structural_match_number ?? 0)
        })
      }

      // Fallback: DFS traversal for legacy data without structural_match_number
      const matchMap = new Map(matches.map(m => [m.id, m]))

      // Build adjacency list (Parent -> Children) based on `next_match_id`
      // This is a backup in case `source_match_ids` is missing or empty
      const parentToChildren = new Map<string, Match[]>()
      for (const m of matches) {
        if (m.next_match_id) {
          if (!parentToChildren.has(m.next_match_id)) {
            parentToChildren.set(m.next_match_id, [])
          }
          parentToChildren.get(m.next_match_id)!.push(m)
        }
      }

      const verticalIndices = new Map<string, number>()
      let counter = 0

      // Identify Roots (matches with no next_match_id)
      const roots = matches.filter(m => !m.next_match_id || !matchMap.has(m.next_match_id))

      // Sort roots deterministically (Category > ID)
      roots.sort((a, b) => {
        const catA = (a.tournament_categories?.name || '') + (a.tournament_divisions?.name || '')
        const catB = (b.tournament_categories?.name || '') + (b.tournament_divisions?.name || '')
        if (catA !== catB) return catA.localeCompare(catB)
        return a.id.localeCompare(b.id)
      })

      // Depth-First Traversal to assign vertical order
      function visit(m: Match | undefined) {
        if (!m) return

        let children: Match[] = []

        // 1. Try explicit source_match_ids (Preferred: trusted Top/Bottom order)
        if (m.source_match_ids && Array.isArray(m.source_match_ids) && m.source_match_ids.length > 0) {
          children = m.source_match_ids
            .map(id => matchMap.get(id))
            .filter((x): x is Match => x !== undefined)
        }
        // 2. Fallback: Use deduced children (Heuristic: Sort by match_number)
        else if (parentToChildren.has(m.id)) {
          children = parentToChildren.get(m.id)!
          // Heuristic: Lower match number usually means "Top" or "Left" in standard bracket gen
          children.sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
        }

        // Traverse Children First (Post-Order for Bottom-Up indices)
        for (const child of children) {
          visit(child)
        }

        if (!verticalIndices.has(m.id)) {
          verticalIndices.set(m.id, counter++)
        }
      }

      roots.forEach(r => visit(r))

      return [...matches].sort((a, b) => {
        const idxA = verticalIndices.has(a.id) ? verticalIndices.get(a.id)! : 999999
        const idxB = verticalIndices.has(b.id) ? verticalIndices.get(b.id)! : 999999

        if (a.round !== b.round) return a.round - b.round
        return idxA - idxB
      })
    }

    const structSortedMatches = reorderMatchesByStructure(matches)

    // Run assignment logic
    const assignments = assignMatchNumbers({
      tournamentConfig: scheduleConfig,
      divisionConfigs,
      matches: structSortedMatches.map(m => {
        const raw = m as any
        return {
          id: m.id!,
          divisionId: m.division_id!,
          categoryId: m.category_id!,
          round: m.round,
          status: m.status,
          winner_id: m.winner_id,
          next_match_id: raw.next_match_id, // Critical for dependencies
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
      endDate: new Date(tournament.end_date!)
    })

    await updateMatchSchedule(tournamentId, assignments)

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
      latestEnd: latestEnd !== null ? (latestEnd as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined
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
