'use server'

/**
 * Match Re-scoring / Dispute Resolution
 *
 * Allows a tournament organizer to rescore a completed match when scores were
 * entered incorrectly or a dispute has been resolved.
 *
 * Safety constraint: re-scoring is only permitted when the downstream (next)
 * match has NOT yet started (lifecycle ≠ IN_PROGRESS / COMPLETED). If the
 * next match is already in progress the organizer must perform a manual bracket
 * reset before rescoring.
 *
 * Security: Only the tournament organizer may call this action.
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'
import { isExplicitWinnerMethod } from '@/lib/constants/wt-rules'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { matchScoresSchema, type MatchScoresInput } from '@/lib/validations/match-scores'
import { createAuditEntry } from '@/lib/db/queries/audit-trail'
import { logger } from '@/lib/logger'
import { invalidateMatchesCache } from '@/lib/cache/result-cache'
import { routes } from '@/config/routes'
import type { WinMethod } from '@/types/models'
import type { ActionResult } from '@/types/api'

export interface RescoreMatchInput {
  scores: MatchScoresInput
  winMethod?: WinMethod
  winningRound?: number
  winnerId?: string
  /** Human-readable reason for the rescore (required for audit trail) */
  reason: string
}

/**
 * Rescore a completed match.
 *
 * Steps:
 *  1. Authorize — organizer only
 *  2. Validate new scores via Zod schema
 *  3. Call `reverse_match_advancement` RPC to atomically reset the match and
 *     clear the winner from the downstream match's player slot
 *  4. Save new scores via `save_match_scores_atomic` RPC
 *  5. Re-run winner determination and advance the (possibly different) winner
 *  6. Write audit trail entry with reason, old scores, and new scores
 */
export async function rescoreMatch(
  matchId: string,
  input: RescoreMatchInput
): Promise<ActionResult<{ hasWinner: boolean; winnerId: string | null }>> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized' }

  // Validate scores
  const parsedScores = matchScoresSchema.safeParse(input.scores)
  if (!parsedScores.success) {
    const firstIssue = parsedScores.error.issues[0]
    return {
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Invalid score data',
    }
  }
  const validScores = parsedScores.data
  const winMethod: WinMethod = input.winMethod ?? 'PTF'

  try {
    const supabase = createServerSupabaseClient()

    // Fetch match for authorization and old-state capture
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(
        'player1_id, player2_id, tournament_id, winner_id, win_method, winning_round, ' +
        'score_round1_player1, score_round1_player2, score_round2_player1, score_round2_player2, ' +
        'score_round3_player1, score_round3_player2'
      )
      .eq('id', matchId)
      .single()

    if (matchError || !match) return { success: false, error: 'Match not found' }

    const typedMatch = match as any
    const tournament = await getTournamentById(typedMatch.tournament_id)
    if (!tournament || tournament.organizer_id !== userId) {
      return { success: false, error: 'Not authorized to rescore this match' }
    }

    // Capture old scores for the audit trail
    const previousState = {
      winnerId: typedMatch.winner_id,
      winMethod: typedMatch.win_method,
      winningRound: typedMatch.winning_round,
      round1: { player1: typedMatch.score_round1_player1, player2: typedMatch.score_round1_player2 },
      round2: { player1: typedMatch.score_round2_player1, player2: typedMatch.score_round2_player2 },
      round3: { player1: typedMatch.score_round3_player1, player2: typedMatch.score_round3_player2 },
    }

    // Step 1: Reverse advancement — clears winner from downstream match and resets
    //         current match to IN_PROGRESS. Raises exception if downstream is active.
    const { error: reverseError } = await supabase.rpc('reverse_match_advancement', {
      p_match_id: matchId,
    })
    if (reverseError) {
      // Forward the DB exception message (e.g. "downstream match is already IN_PROGRESS")
      return { success: false, error: reverseError.message }
    }

    // Step 2: Derive round winners
    function deriveWinnerId(p1: number, p2: number, manual: string | null | undefined) {
      if (manual) return manual
      if (p1 > p2) return (typedMatch as any).player1_id
      if (p2 > p1) return (typedMatch as any).player2_id
      return null
    }

    const round1WinnerId = deriveWinnerId(validScores.round1.player1, validScores.round1.player2, validScores.round1.winnerId)
    const round2WinnerId = deriveWinnerId(validScores.round2.player1, validScores.round2.player2, validScores.round2.winnerId)
    const round3WinnerId = deriveWinnerId(validScores.round3.player1, validScores.round3.player2, validScores.round3.winnerId)

    // Step 3: Save new scores atomically
    const { error: saveError } = await supabase.rpc('save_match_scores_atomic', {
      p_match_id: matchId,
      p_rounds: [
        { round_number: 1, score_player1: validScores.round1.player1, score_player2: validScores.round1.player2, winner_id: round1WinnerId },
        { round_number: 2, score_player1: validScores.round2.player1, score_player2: validScores.round2.player2, winner_id: round2WinnerId },
        { round_number: 3, score_player1: validScores.round3.player1, score_player2: validScores.round3.player2, winner_id: round3WinnerId },
      ],
    })
    if (saveError) return { success: false, error: `Failed to save new scores: ${saveError.message}` }

    // Step 4: Re-run winner determination and bracket advancement
    const result = await checkAndUpdateMatchWinner(
      matchId,
      isExplicitWinnerMethod(winMethod) ? (input.winnerId ?? null) : undefined,
      winMethod,
      input.winningRound
    )

    if (result.hasWinner) {
      await supabase
        .from('matches')
        .update({ actual_end_time: new Date().toISOString() })
        .eq('id', matchId)
    }

    // Step 5: Audit trail
    await createAuditEntry({
      tournamentId: typedMatch.tournament_id,
      entityType: 'match',
      entityId: matchId,
      action: 'MATCH_RESCORED',
      actorId: userId,
      previousState: previousState as Record<string, unknown>,
      newState: {
        round1: { player1: validScores.round1.player1, player2: validScores.round1.player2, winner: round1WinnerId },
        round2: { player1: validScores.round2.player1, player2: validScores.round2.player2, winner: round2WinnerId },
        round3: { player1: validScores.round3.player1, player2: validScores.round3.player2, winner: round3WinnerId },
      },
      metadata: {
        reason: input.reason,
        winMethod,
        winningRound: input.winningRound ?? null,
        hasWinner: result.hasWinner,
        newWinnerId: result.winnerId,
      },
    })

    invalidateMatchesCache(typedMatch.tournament_id)
    revalidatePath(routes.organizer.tournamentBracket(typedMatch.tournament_id))
    revalidatePath(routes.organizer.tournamentDetail(typedMatch.tournament_id))

    return {
      success: true,
      data: { hasWinner: result.hasWinner, winnerId: result.winnerId },
    }
  } catch (error) {
    logger.error({ error, matchId }, 'rescoreMatch failed')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rescore match',
    }
  }
}
