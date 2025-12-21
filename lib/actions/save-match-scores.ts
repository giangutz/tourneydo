'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { updateRoundScore, checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'
import { routes } from '@/config/routes'

interface RoundScores {
  round1: { player1: number; player2: number; winnerId?: string | null }
  round2: { player1: number; player2: number; winnerId?: string | null }
  round3: { player1: number; player2: number; winnerId?: string | null }
}

/**
 * Save all round scores at once and determine match winner
 */
export async function saveMatchScores(
  matchId: string,
  scores: RoundScores
) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  try {
    const supabase = createServerSupabaseClient()

    // Get the match to find player IDs and tournament
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('player1_id, player2_id, tournament_id')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Get all rounds for this match
    const { data: rounds, error: roundsError } = await supabase
      .from('match_rounds')
      .select('id, round_number')
      .eq('match_id', matchId)
      .order('round_number', { ascending: true })

    if (roundsError || !rounds || rounds.length !== 3) {
      throw new Error('Match rounds not found')
    }

    // Update each round
    const roundUpdates = [
      { roundNumber: 1, scores: scores.round1 },
      { roundNumber: 2, scores: scores.round2 },
      { roundNumber: 3, scores: scores.round3 }
    ]

    let round1WinnerId: string | null = null
    let round2WinnerId: string | null = null
    let round3WinnerId: string | null = null

    for (const update of roundUpdates) {
      const round = rounds.find(r => r.round_number === update.roundNumber)
      if (!round) continue

      const { player1, player2, winnerId: manualWinnerId } = update.scores

      // Determine round winner
      let winnerId: string | null = null

      // Use manual winner if provided (for tie-breaks)
      // Check for truthy value, not just undefined, because null means "no manual winner"
      if (manualWinnerId) {
        winnerId = manualWinnerId
        console.log(`[SAVE SCORES] Round ${update.roundNumber}: Using manual winner ${winnerId}`)
      } else if (player1 > player2) {
        winnerId = match.player1_id
        console.log(`[SAVE SCORES] Round ${update.roundNumber}: Player 1 wins by score (${player1} > ${player2})`)
      } else if (player2 > player1) {
        winnerId = match.player2_id
        console.log(`[SAVE SCORES] Round ${update.roundNumber}: Player 2 wins by score (${player2} > ${player1})`)
      } else {
        console.log(`[SAVE SCORES] Round ${update.roundNumber}: Tied (${player1} = ${player2}), no winner`)
      }

      console.log(`[SAVE SCORES] Round ${update.roundNumber}: Updating with winner_id=${winnerId}, scores=${player1}-${player2}`)

      // Update the round
      await updateRoundScore(round.id, {
        score_player1: player1,
        score_player2: player2,
        winner_id: winnerId,
        status: player1 === 0 && player2 === 0 ? 'pending' : 'completed'
      })
      // Capture winner ID for syncing to matches table
      if (update.roundNumber === 1) round1WinnerId = winnerId
      else if (update.roundNumber === 2) round2WinnerId = winnerId
      else if (update.roundNumber === 3) round3WinnerId = winnerId
    }

    console.log(`[SAVE SCORES] All rounds updated for match ${matchId}`)

    // Check if match has a winner and advance them
    console.log(`[SAVE SCORES] Checking for match winner...`)
    const result = await checkAndUpdateMatchWinner(matchId)
    console.log(`[SAVE SCORES] Winner check result:`, result)

    // Sync per-round scores to matches table for efficient querying in SVG bracket
    await (supabase as any).from('matches').update({
      score_round1_player1: scores.round1.player1,
      score_round1_player2: scores.round1.player2,
      score_round2_player1: scores.round2.player1,
      score_round2_player2: scores.round2.player2,
      score_round3_player1: scores.round3.player1,
      score_round3_player2: scores.round3.player2,
      winner_round1: round1WinnerId,
      winner_round2: round2WinnerId,
      winner_round3: round3WinnerId,
    }).eq('id', matchId)

    // Revalidate both bracket and tournament detail pages to show updates
    revalidatePath(routes.organizer.tournamentBracket(match.tournament_id))
    revalidatePath(routes.organizer.tournamentDetail(match.tournament_id))
    console.log(`[SAVE SCORES] Revalidated paths for tournament ${match.tournament_id}`)

    return {
      success: true,
      hasWinner: result.hasWinner,
      winnerId: result.winnerId,
      player1Wins: result.player1Wins,
      player2Wins: result.player2Wins
    }
  } catch (error) {
    console.error('Error saving match scores:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save match scores'
    }
  }
}
