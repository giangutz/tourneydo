'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import { updateMatch, advanceWinner } from '@/lib/db/queries/matches'

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
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
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
