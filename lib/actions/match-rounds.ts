'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { updateRoundScore, checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'
import { routes } from '@/config/routes'

/**
 * Update a specific round's score in a match
 */
export async function updateMatchRoundScore(
  matchId: string,
  roundNumber: number,
  scorePlayer1: number,
  scorePlayer2: number
) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  try {
    const supabase = createServerSupabaseClient()

    // Get the match to find player IDs
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('player1_id, player2_id, tournament_id')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Get the specific round
    const { data: round, error: roundError } = await supabase
      .from('match_rounds')
      .select('id')
      .eq('match_id', matchId)
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      throw new Error('Round not found')
    }

    // Determine round winner
    let winnerId: string | null = null
    if (scorePlayer1 > scorePlayer2) {
      winnerId = match.player1_id
    } else if (scorePlayer2 > scorePlayer1) {
      winnerId = match.player2_id
    }

    // Update the round
    await updateRoundScore(round.id, {
      score_player1: scorePlayer1,
      score_player2: scorePlayer2,
      winner_id: winnerId,
      status: 'completed'
    })

    // Check if match has a winner (2 round wins)
    await checkAndUpdateMatchWinner(matchId)

    revalidatePath(routes.organizer.tournamentBracket(match.tournament_id))
    return { success: true }
  } catch (error) {
    console.error('Error updating round score:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update round score'
    }
  }
}
