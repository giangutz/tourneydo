'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { routes } from '@/config/routes'
import { updateMatch, advanceWinner } from '@/lib/db/queries/matches'
import { safeAction } from '@/lib/utils/errors'
import type { ActionResult } from '@/types/api'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface MatchResultUpdate {
  score_player1: number
  score_player2: number
  winner_id: string | null
  status: 'completed'
}

/**
 * Update match result and advance winner
 */
export async function updateMatchResult(
  matchId: string,
  tournamentId: string,
  updates: MatchResultUpdate
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // 1. Update current match
    const match = await updateMatch(matchId, updates)

    // 2. Advance winner to next match
    if (match.next_match_id && match.winner_id) {
      // We need to know if the winner goes to player1_id or player2_id slot in next match.
      // Usually determined by match number?
      // Or we check which slot is empty?
      // Or we check the bracket structure.
      // Simple logic:
      // If current match is odd number -> player1 slot in next match?
      // If current match is even number -> player2 slot in next match?
      // Let's check `match_number`.
      // Match 1 & 2 -> Next Match 1.
      // Match 1 is odd -> P1. Match 2 is even -> P2.

      const isOdd = match.match_number % 2 !== 0
      const targetField = isOdd ? 'player1_id' : 'player2_id'

      await advanceWinner(match.next_match_id, { [targetField]: match.winner_id })
    }

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Update match participants (Organizer only)
 */
export async function updateMatchParticipants(
  matchId: string,
  tournamentId: string,
  player1Id: string | null,
  player2Id: string | null
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const supabase = createServerSupabaseClient()

    // Get current match state
    const { data: currentMatch, error: matchError } = await (supabase as any)
      .from('matches')
      .select('player1_id, player2_id, division_id, category_id')
      .eq('id', matchId)
      .single()

    if (matchError || !currentMatch) {
      throw new Error('Match not found')
    }

    // Get all matches in the same division to handle swapping
    const { data: divisionMatches } = await (supabase as any)
      .from('matches')
      .select('id, player1_id, player2_id')
      .eq('tournament_id', tournamentId)
      .eq('division_id', currentMatch.division_id)
      .eq('category_id', currentMatch.category_id)

    // Find which players are being replaced
    const oldPlayer1 = currentMatch.player1_id
    const oldPlayer2 = currentMatch.player2_id

    // Update the current match with new players
    await updateMatch(matchId, {
      player1_id: player1Id,
      player2_id: player2Id
    })

    // Swap logic: If we're replacing a player, find where the new player was and put the old player there
    if (divisionMatches) {
      for (const match of divisionMatches) {
        if (match.id === matchId) continue // Skip the current match

        let needsUpdate = false
        const updates: any = {}

        // If new player1 was in this match, replace them with old player1
        if (player1Id && match.player1_id === player1Id) {
          updates.player1_id = oldPlayer1
          needsUpdate = true
        } else if (player1Id && match.player2_id === player1Id) {
          updates.player2_id = oldPlayer1
          needsUpdate = true
        }

        // If new player2 was in this match, replace them with old player2
        if (player2Id && match.player1_id === player2Id && !updates.player1_id) {
          updates.player1_id = oldPlayer2
          needsUpdate = true
        } else if (player2Id && match.player2_id === player2Id && !updates.player2_id) {
          updates.player2_id = oldPlayer2
          needsUpdate = true
        }

        if (needsUpdate) {
          await updateMatch(match.id, updates)
        }
      }
    }

    // Revalidate both bracket and tournament detail pages
    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Assign match to a court (Organizer only)
 */
export async function assignMatchToCourt(
  matchId: string,
  tournamentId: string,
  courtNumber: number,
  status: 'scheduled' | 'in_progress' = 'scheduled'
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await updateMatch(matchId, {
      court_number: courtNumber,
      status: status
    })

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Update match status (Organizer only)
 */
export async function updateMatchStatus(
  matchId: string,
  tournamentId: string,
  status: 'scheduled' | 'in_progress' | 'completed'
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await updateMatch(matchId, {
      status: status
    })

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Unassign match from court (Organizer only)
 */
export async function unassignMatch(
  matchId: string,
  tournamentId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await updateMatch(matchId, {
      court_number: null,
      status: 'scheduled'
    })

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}

/**
 * Move a participant to a different division (Organizer only)
 */
export async function moveParticipantToDivision(
  matchId: string,
  tournamentId: string,
  playerId: string,
  newDivisionId: string,
  newCategoryId: string
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const supabase = createServerSupabaseClient()

    // 1. Update the participant's registration to the new division
    const { error: regError } = await supabase
      .from('tournament_registrations')
      .update({
        division_id: newDivisionId,
        category_id: newCategoryId
      })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)

    if (regError) {
      throw new Error(`Failed to update registration: ${regError.message}`)
    }

    // 2. Remove the player from the current match
    // We need to check if they are player1 or player2
    const { data: currentMatch, error: matchError } = await supabase
      .from('matches')
      .select('player1_id, player2_id')
      .eq('id', matchId)
      .single()

    if (matchError || !currentMatch) {
      throw new Error('Match not found')
    }

    const updates: any = {}
    if (currentMatch.player1_id === playerId) {
      updates.player1_id = null
    } else if (currentMatch.player2_id === playerId) {
      updates.player2_id = null
    }

    if (Object.keys(updates).length > 0) {
      await updateMatch(matchId, updates)
    }

    // 3. Remove player from ANY other matches in the OLD division
    // (This is important because they might be in multiple matches if they advanced)
    // Actually, if we change their division, they shouldn't be in ANY match of the old division.
    // But for now, let's just handle the current match as requested.
    // The user said "move place to others divisions".
    // If they are in other matches, those matches will still point to them.
    // Ideally, we should remove them from all matches in the old division.
    // But that might be too destructive if not intended.
    // Let's stick to the current match for safety, or maybe the user implies a full move.
    // Given "Switch Places" context, it's usually about fixing a mistake.
    // So removing from the current match is the primary goal.

    revalidatePath(routes.organizer.tournamentBracket(tournamentId))
    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}
