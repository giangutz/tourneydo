/**
 * Server Actions for Athlete Readiness
 *
 * Handles toggling athlete called status from the UI.
 * Security: All actions verify the caller is the tournament organizer or active staff.
 */

'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import {
  toggleAthleteReadiness as dbToggleAthleteReadiness,
  getMatchReadiness,
  initializeMatchReadiness
} from '@/lib/db/queries/match-readiness'
import { invalidateMatchesCache } from '@/lib/cache/result-cache'
import { getMatchById } from '@/lib/db/queries/matches'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { ActionResult } from '@/types/api'
import { ReadinessStatus } from '@/types/models'

/**
 * Verify that userId is the tournament organizer or an active staff member.
 * Returns an error string if not authorized, or null if authorized.
 */
async function authorizeTournamentAccess(
  tournamentId: string,
  userId: string
): Promise<string | null> {
  const tournament = await getTournamentById(tournamentId)
  if (!tournament) return 'Tournament not found'
  if (tournament.organizer_id === userId) return null

  const supabase = createServerSupabaseClient()
  const { data: staff } = await supabase
    .from('tournament_staff')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return staff ? null : 'Not authorized to manage this tournament'
}

/**
 * Toggle athlete called status
 * Only allowed for CONTEST matches that haven't started
 */
export async function toggleAthleteCalledStatus(
  matchId: string,
  athleteId: string,
  called: boolean
): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized'
      }
    }

    // Get match to validate state
    const match = await getMatchById(matchId)

    if (!match) {
      return {
        success: false,
        error: 'Match not found'
      }
    }

    // Authorize: organizer or active staff only
    const authError = await authorizeTournamentAccess(match.tournament_id, userId)
    if (authError) {
      return { success: false, error: authError }
    }

    // Validate match state
    if (match.lifecycle_state !== 'CONTEST') {
      return {
        success: false,
        error: `Cannot toggle readiness for match in ${match.lifecycle_state} state. Match must be in CONTEST state.`
      }
    }

    if (match.status === 'in_progress' || match.status === 'completed') {
      return {
        success: false,
        error: 'Cannot toggle readiness for match that has started or completed'
      }
    }

    // Validate athlete belongs to this match
    if (match.player1_id !== athleteId && match.player2_id !== athleteId) {
      return {
        success: false,
        error: 'Athlete does not belong to this match'
      }
    }

    // Toggle readiness
    await dbToggleAthleteReadiness(matchId, athleteId, called, userId)

    // Invalidate in-memory match cache and revalidate Next.js Data Cache paths
    invalidateMatchesCache(match.tournament_id)
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${match.tournament_id}/bracket`)
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${match.tournament_id}/matches`)

    return {
      success: true,
      data: undefined
    }
  } catch (error) {
    logger.error({ error, matchId, athleteId }, 'Failed to toggle athlete readiness')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle athlete readiness'
    }
  }
}

/**
 * Get readiness status for a match
 */
export async function getMatchReadinessStatus(
  matchId: string
): Promise<ActionResult<{ athlete1Called: boolean; athlete2Called: boolean }>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    const match = await getMatchById(matchId)
    if (!match) return { success: false, error: 'Match not found' }

    const authError = await authorizeTournamentAccess(match.tournament_id, userId)
    if (authError) return { success: false, error: authError }

    const readiness = await getMatchReadiness(matchId)

    return {
      success: true,
      data: readiness
    }
  } catch (error) {
    logger.error({ error, matchId }, 'Failed to get match readiness')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get match readiness'
    }
  }
}

/**
 * Initialize readiness for a match (called when players are assigned)
 */
export async function initializeMatchReadinessAction(
  matchId: string
): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    const match = await getMatchById(matchId)
    if (!match) return { success: false, error: 'Match not found' }

    const authError = await authorizeTournamentAccess(match.tournament_id, userId)
    if (authError) return { success: false, error: authError }

    await initializeMatchReadiness(matchId)

    return {
      success: true,
      data: undefined
    }
  } catch (error) {
    logger.error({ error, matchId }, 'Failed to initialize match readiness')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize match readiness'
    }
  }
}
