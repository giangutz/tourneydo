import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { WinMethod } from '@/types/models'
import { logger } from '@/lib/logger'

export interface MatchRound {
  id: string
  match_id: string
  round_number: number
  score_player1: number | null
  score_player2: number | null
  winner_id: string | null
  status: 'pending' | 'in_progress' | 'completed' | null
  created_at: string
  updated_at: string
}

export interface RoundUpdate {
  score_player1?: number
  score_player2?: number
  winner_id?: string | null
  status?: 'pending' | 'in_progress' | 'completed'
}

/**
 * Get all rounds for a match
 */
export async function getMatchRounds(matchId: string): Promise<MatchRound[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)
    .order('round_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch match rounds: ${error.message}`)
  }

  return (data as MatchRound[]) || []
}

/**
 * Create 3 rounds for a new match
 */
export async function createMatchRounds(matchId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  const rounds = [
    { match_id: matchId, round_number: 1 },
    { match_id: matchId, round_number: 2 },
    { match_id: matchId, round_number: 3 }
  ]

  const { error } = await supabase
    .from('match_rounds')
    .insert(rounds)

  if (error) {
    throw new Error(`Failed to create match rounds: ${error.message}`)
  }
}

/**
 * Update a specific round's scores
 */
export async function updateRoundScore(
  roundId: string,
  updates: RoundUpdate
): Promise<MatchRound> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('match_rounds')
    .update(updates)
    .eq('id', roundId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update round: ${error.message}`)
  }

  return data as MatchRound
}

/**
 * Check if match has a winner (2 round wins for SCORE, or explicit winner for
 * KO/TKO/DQ/WITHDRAWAL/FORFEIT) and advance them to the next bracket slot.
 *
 * @param matchId         - Match to evaluate
 * @param explicitWinnerId - Pre-determined winner (for non-SCORE methods)
 * @param winMethod       - How the match was decided (defaults to 'SCORE')
 * @param winningRound    - Round in which the match ended early (if applicable)
 */
export async function checkAndUpdateMatchWinner(
  matchId: string,
  explicitWinnerId?: string | null,
  winMethod: WinMethod = 'SCORE',
  winningRound?: number
): Promise<{
  hasWinner: boolean
  winnerId: string | null
  player1Wins: number
  player2Wins: number
}> {
  const supabase = createServerSupabaseClient()

  // Get match details
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('player1_id, player2_id, next_match_id, tournament_id')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error('Match not found')
  }

  let player1Wins = 0
  let player2Wins = 0
  let winnerId: string | null = null
  let hasWinner = false

  if (winMethod !== 'SCORE' && explicitWinnerId) {
    // Non-score win: winner is explicitly provided — no round counting needed
    winnerId = explicitWinnerId
    hasWinner = true
    player1Wins = winnerId === match.player1_id ? 1 : 0
    player2Wins = winnerId === match.player2_id ? 1 : 0
  } else {
    // Normal SCORE: count round wins (best-of-3)
    const rounds = await getMatchRounds(matchId)

    for (const round of rounds) {
      if (round.winner_id) {
        if (round.winner_id === match.player1_id) player1Wins++
        else if (round.winner_id === match.player2_id) player2Wins++
      }
    }

    hasWinner = player1Wins >= 2 || player2Wins >= 2

    if (hasWinner) {
      winnerId = player1Wins >= 2 ? match.player1_id : match.player2_id
      if (!winnerId) throw new Error('Winner ID is null — match player data is corrupted')
    }
  }

  if (hasWinner && winnerId) {
    // Single atomic RPC call:
    //   1. Marks match completed (winner, scores, lifecycle, win_method, winning_round, clears court)
    //   2. Advances winner to next bracket slot using source_match_ids ordering
    //   3. Transitions next match to CONTEST if both players now known
    const { error: rpcError } = await supabase.rpc('advance_match_winner', {
      p_match_id:      matchId,
      p_winner_id:     winnerId,
      p_player1_wins:  player1Wins,
      p_player2_wins:  player2Wins,
      p_win_method:    winMethod,
      p_winning_round: winningRound ?? null,
    })

    if (rpcError) {
      logger.error({ error: rpcError }, 'Failed to advance match winner')
      throw new Error(`Failed to advance match winner: ${rpcError.message}`)
    }
  }

  return { hasWinner, winnerId, player1Wins, player2Wins }
}
