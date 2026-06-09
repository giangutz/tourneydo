'use server'

// Reuse the logic from regenerate-bracket-schedule to ensure consistency
import { regenerateBracketSchedule } from '@/lib/actions/regenerate-bracket-schedule'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types/api'
import type { TournamentScheduleConfigInsert, MatchAssignment } from '@/types/models'
import {
  getTournamentScheduleConfig,
  upsertTournamentScheduleConfig,
  archiveMatchNumbers,
  updateMatchSchedule,
  getDivisionScheduleConfigs,
  calculateDivisionPriorities
} from '@/lib/db/queries/schedule'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { assignMatchNumbers } from '@/lib/utils/match-scheduler'
import { getTournamentById, updateTournament } from '@/lib/db/queries/tournaments'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Save tournament schedule config and run feasibility check
 * Does NOT regenerate brackets - that's a separate action
 */
export async function saveTournamentScheduleConfig(
  config: Omit<TournamentScheduleConfigInsert, 'max_divisions_per_day'> & { max_divisions_per_day?: number | null }
): Promise<ActionResult<{ feasible: boolean; validation?: any }>> {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    // Check if user is organizer
    const tournament = await getTournamentById(config.tournament_id)
    if (!tournament || tournament.organizer_id !== userId) {
      throw new Error('Unauthorized: only organizer can manage schedule')
    }

    // Save config
    const configToSave: TournamentScheduleConfigInsert = {
      ...config,
      max_divisions_per_day: config.max_divisions_per_day ?? null
    }
    const savedConfig = await upsertTournamentScheduleConfig(configToSave)

    // Sync court number to tournament settings
    if (tournament.courts !== config.courts) {
      await updateTournament(config.tournament_id, { courts: config.courts })
    }

    // Run feasibility check
    const { validateSchedule } = await import('@/lib/utils/match-scheduler')
    const matches = await getTournamentMatches(config.tournament_id)

    let validation = null
    let feasible = true

    if (matches.length > 0) {
      // Calculate division priorities for validation
      const priorityConfigs = await calculateDivisionPriorities(config.tournament_id)

      // Save division configs
      const supabase = createServerSupabaseClient()
      for (const divConfig of priorityConfigs) {
        await supabase.from('division_schedule_config').upsert(divConfig)
      }

      const divisionConfigs = await getDivisionScheduleConfigs(config.tournament_id)

      validation = validateSchedule({
        tournamentConfig: savedConfig,
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

      feasible = validation.feasible
    }

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${config.tournament_id}`)

    return { success: true, data: { feasible, validation } }
  } catch (error) {
    logger.error({ error: error }, 'Unexpected error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save schedule config'
    }
  }
}

export async function generateSchedule(tournamentId: string): Promise<ActionResult<void>> {
  const result = await regenerateBracketSchedule(tournamentId)

  if (result.success) {
    return { success: true, data: undefined }
  } else {
    // Check if result has error structure from regenerateBracketSchedule
    // The types might be slightly different so we map safely
    const errorMsg = 'error' in result ? result.error : 'Failed to generate schedule'
    return { success: false, error: errorMsg }
  }
}
