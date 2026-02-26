/**
 * Athlete Merge Server Actions
 *
 * Allows tournament organizers to confirm that two or more `players` rows
 * represent the same physical athlete, linking them to a single `global_athletes`
 * record.
 *
 * Security: Only authenticated users can invoke these actions. The caller's
 * `userId` is recorded in the merge log for audit purposes.
 */

'use server'

import { auth } from '@clerk/nextjs/server'
import type { ActionResult } from '@/types/api'
import {
  getDedupCandidates,
  getPlayersByIds,
  mergePlayersIntoGlobalAthlete,
  unlinkPlayerFromGlobalAthlete,
  type DedupCandidate,
  type PlayerWithTeam,
  type GlobalAthlete,
} from '@/lib/db/queries/global-athletes'
import { logger } from '@/lib/logger'

/**
 * Fetch the list of candidate player-duplicate groups.
 * No mutation — safe to call on page load.
 */
export async function getDedupCandidatesAction(): Promise<
  ActionResult<{ candidates: DedupCandidate[]; players: PlayerWithTeam[] }>
> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    const candidates = await getDedupCandidates()

    // Pre-load player details for all candidate IDs so the UI can render them
    const allPlayerIds = [...new Set(candidates.flatMap(c => c.playerIds))]
    const players = await getPlayersByIds(allPlayerIds)

    return { success: true, data: { candidates, players } }
  } catch (error) {
    logger.error({ error }, 'getDedupCandidatesAction failed')
    return { success: false, error: 'Failed to load dedup candidates' }
  }
}

/**
 * Confirm that the given player IDs represent the same athlete and link them
 * to a new (or existing) global athlete record.
 *
 * @param playerIds           - IDs of the player rows to merge
 * @param canonicalFirstName  - Confirmed canonical first name
 * @param canonicalLastName   - Confirmed canonical last name
 * @param dateOfBirth         - ISO date string (YYYY-MM-DD), or null
 * @param gender              - Optional gender string
 * @param notes               - Optional organizer notes for the audit log
 */
export async function confirmMergeAction(
  playerIds: string[],
  canonicalFirstName: string,
  canonicalLastName: string,
  dateOfBirth: string | null,
  gender: string | null,
  notes?: string
): Promise<ActionResult<GlobalAthlete>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    if (playerIds.length < 2) {
      return { success: false, error: 'At least two player records are required for a merge' }
    }
    if (!canonicalFirstName.trim() || !canonicalLastName.trim()) {
      return { success: false, error: 'Canonical name is required' }
    }

    const globalAthlete = await mergePlayersIntoGlobalAthlete(
      canonicalFirstName.trim(),
      canonicalLastName.trim(),
      dateOfBirth,
      gender,
      playerIds,
      userId,
      notes
    )

    logger.info(
      { userId, globalAthleteId: globalAthlete.id, playerIds },
      'Athletes merged'
    )

    return { success: true, data: globalAthlete }
  } catch (error) {
    logger.error({ error }, 'confirmMergeAction failed')
    return { success: false, error: 'Failed to merge athletes' }
  }
}

/**
 * Undo a mistaken merge by clearing a player's global_athlete_id link.
 */
export async function unlinkAthleteAction(playerId: string): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Unauthorized' }

    await unlinkPlayerFromGlobalAthlete(playerId)

    logger.info({ userId, playerId }, 'Player unlinked from global athlete')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error({ error }, 'unlinkAthleteAction failed')
    return { success: false, error: 'Failed to unlink athlete' }
  }
}
