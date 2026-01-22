/**
 * Server Actions for Athlete Readiness
 * 
 * Handles toggling athlete called status from the UI.
 */

'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import {
  toggleAthleteReadiness as dbToggleAthleteReadiness,
  getMatchReadiness,
  initializeMatchReadiness
} from '@/lib/db/queries/match-readiness'
import { getMatchById } from '@/lib/db/queries/matches'
import { ActionResult } from '@/types/actions'
import { ReadinessStatus } from '@/types/models'

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

    // Revalidate bracket and match console pages
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${match.tournament_id}/bracket`)
    revalidatePath(`/dashboard/tournament-organizer/tournaments/${match.tournament_id}/matches`)

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to toggle athlete readiness:', error)
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
    const readiness = await getMatchReadiness(matchId)

    return {
      success: true,
      data: readiness
    }
  } catch (error) {
    console.error('Failed to get match readiness:', error)
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
    await initializeMatchReadiness(matchId)

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to initialize match readiness:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize match readiness'
    }
  }
}
