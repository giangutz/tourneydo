import { createServerSupabaseClient } from '@/lib/supabase/server'

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
 * Check if match has a winner (2 round wins) and update match accordingly
 * Also advances winner to next match if applicable
 */
export async function checkAndUpdateMatchWinner(matchId: string): Promise<{
  hasWinner: boolean
  winnerId: string | null
  player1Wins: number
  player2Wins: number
}> {
  const supabase = createServerSupabaseClient()

  // Get all rounds for this match
  const rounds = await getMatchRounds(matchId)

  // Get match details
  const { data: match, error: matchError } = await (supabase as any)
    .from('matches')
    .select('player1_id, player2_id, next_match_id, tournament_id')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    throw new Error('Match not found')
  }

  // Count wins for each player
  let player1Wins = 0
  let player2Wins = 0

  for (const round of rounds) {
    if (round.winner_id) {
      if (round.winner_id === match.player1_id) {
        player1Wins++
      } else if (round.winner_id === match.player2_id) {
        player2Wins++
      }
    }
  }

  // Check if someone has won 2 rounds
  const hasWinner = player1Wins >= 2 || player2Wins >= 2
  let winnerId: string | null = null

  if (hasWinner) {
    winnerId = player1Wins >= 2 ? match.player1_id : match.player2_id

    // Update match with winner and scores (round wins)
    // Also clear court assignment when match is completed
    await (supabase as any)
      .from('matches')
      .update({
        winner_id: winnerId,
        score_player1: player1Wins,
        score_player2: player2Wins,
        status: 'completed',
        court_number: null // Remove from court when completed
      })
      .eq('id', matchId)

    // Advance winner to next match if there is one
    if (match.next_match_id && winnerId) {
      console.log(`[ADVANCEMENT] Match ${matchId} has winner ${winnerId}, advancing to next match ${match.next_match_id}`)

      const { data: nextMatch, error: nextMatchError } = await (supabase as any)
        .from('matches')
        .select('player1_id, player2_id')
        .eq('id', match.next_match_id)
        .single()

      if (nextMatchError) {
        console.error(`[ADVANCEMENT ERROR] Failed to fetch next match:`, nextMatchError)
      }

      if (nextMatch) {
        console.log(`[ADVANCEMENT] Next match current state:`, nextMatch)

        // Check if winner is already in the next match (prevent duplicate advancement)
        if (nextMatch.player1_id === winnerId || nextMatch.player2_id === winnerId) {
          console.log(`[ADVANCEMENT] Winner ${winnerId} is already in next match, skipping advancement`)
        } else {
          // Determine which slot to fill in the next match
          // If player1_id is null, fill it; otherwise fill player2_id
          const updateData = nextMatch.player1_id === null
            ? { player1_id: winnerId }
            : { player2_id: winnerId }

          console.log(`[ADVANCEMENT] Updating next match with:`, updateData)

          const { error: updateError } = await (supabase as any)
            .from('matches')
            .update(updateData)
            .eq('id', match.next_match_id)

          if (updateError) {
            console.error(`[ADVANCEMENT ERROR] Failed to update next match:`, updateError)
          } else {
            console.log(`[ADVANCEMENT SUCCESS] Winner ${winnerId} advanced to next match ${match.next_match_id}`)
          }
        }
      }
    } else {
      console.log(`[ADVANCEMENT] No advancement needed - next_match_id: ${match.next_match_id}, winnerId: ${winnerId}`)
    }
  }

  return {
    hasWinner,
    winnerId,
    player1Wins,
    player2Wins
  }
}
