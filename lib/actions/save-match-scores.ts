'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { routes } from '@/config/routes'
import { invalidateMatchesCache } from '@/lib/cache/result-cache'
import { matchScoresSchema, type MatchScoresInput } from '@/lib/validations/match-scores'
import { createAuditEntry } from '@/lib/db/queries/audit-trail'
import { logger } from '@/lib/logger'
import type { WinMethod } from '@/types/models'

// Re-export the type so callers can use it without a direct dep on validations
type RoundScores = MatchScoresInput

/**
 * Save all round scores at once and determine match winner.
 *
 * @param matchId      - The match being scored
 * @param scores       - Per-round point totals and optional manual winner override
 * @param winMethod    - How the match was decided (default: 'SCORE')
 * @param winningRound - Which round ended the match early (KO/TKO/DQ/etc.)
 *                       Omit for normal SCORE decisions.
 * @param winnerId        - Explicit winner for non-score decisions (KO/TKO/DQ/etc.)
 *                         Required when winMethod is not 'SCORE'.
 * @param expectedVersion - The `updated_at` ISO string read when the dialog opened.
 *                         If provided and the DB row has since changed, the save is
 *                         rejected with a CONFLICT error (optimistic locking).
 */
export async function saveMatchScores(
  matchId: string,
  scores: RoundScores,
  winMethod: WinMethod = 'SCORE',
  winningRound?: number,
  winnerId?: string,
  expectedVersion?: string
) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Validate scores before touching the database
  const parsedScores = matchScoresSchema.safeParse(scores)
  if (!parsedScores.success) {
    const firstIssue = parsedScores.error.issues[0]
    return {
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Invalid score data'
    }
  }
  const validScores = parsedScores.data

  try {
    const supabase = createServerSupabaseClient()

    // Get the match to find player IDs, tournament, and current version
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('player1_id, player2_id, tournament_id, updated_at')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Optimistic locking: reject if the match was modified after the dialog opened
    if (expectedVersion && match.updated_at !== expectedVersion) {
      return {
        success: false,
        error: 'This match was modified by another user. Please reload and try again.',
        conflict: true,
      }
    }

    // Verify the calling user is the tournament organizer
    const tournament = await getTournamentById(match.tournament_id)
    if (!tournament || tournament.organizer_id !== userId) {
      throw new Error('Not authorized to modify this match')
    }

    // Derive round winners from scores or manual override
    function deriveWinnerId(
      player1Score: number,
      player2Score: number,
      manualWinnerId: string | null | undefined
    ): string | null {
      if (manualWinnerId) return manualWinnerId
      const m = match!
      if (player1Score > player2Score) return m.player1_id ?? null
      if (player2Score > player1Score) return m.player2_id ?? null
      return null
    }

    const round1WinnerId = deriveWinnerId(validScores.round1.player1, validScores.round1.player2, validScores.round1.winnerId)
    const round2WinnerId = deriveWinnerId(validScores.round2.player1, validScores.round2.player2, validScores.round2.winnerId)
    const round3WinnerId = deriveWinnerId(validScores.round3.player1, validScores.round3.player2, validScores.round3.winnerId)

    // Atomically update all round rows + sync denormalized scores to matches table
    const { error: rpcError } = await supabase.rpc('save_match_scores_atomic', {
      p_match_id: matchId,
      p_rounds: [
        { round_number: 1, score_player1: validScores.round1.player1, score_player2: validScores.round1.player2, winner_id: round1WinnerId },
        { round_number: 2, score_player1: validScores.round2.player1, score_player2: validScores.round2.player2, winner_id: round2WinnerId },
        { round_number: 3, score_player1: validScores.round3.player1, score_player2: validScores.round3.player2, winner_id: round3WinnerId },
      ]
    })

    if (rpcError) {
      throw new Error(`Failed to save scores: ${rpcError.message}`)
    }

    // Check if match has a winner and advance them
    // For non-SCORE methods the winner is explicit; pass it directly to skip round counting
    const result = await checkAndUpdateMatchWinner(
      matchId,
      winMethod !== 'SCORE' ? winnerId ?? null : undefined,
      winMethod,
      winningRound
    )

    // Record actual_end_time when the match has a winner (lifecycle: COMPLETED)
    if (result.hasWinner) {
      await supabase
        .from('matches')
        .update({ actual_end_time: new Date().toISOString() })
        .eq('id', matchId)
    }

    // Write audit entry (non-blocking — failure must not break the save)
    await createAuditEntry({
      tournamentId: match.tournament_id,
      entityType: 'match',
      entityId: matchId,
      action: 'SCORE_SAVED',
      actorId: userId,
      newState: {
        round1: { player1: validScores.round1.player1, player2: validScores.round1.player2, winner: round1WinnerId },
        round2: { player1: validScores.round2.player1, player2: validScores.round2.player2, winner: round2WinnerId },
        round3: { player1: validScores.round3.player1, player2: validScores.round3.player2, winner: round3WinnerId },
      },
      metadata: {
        winMethod,
        winningRound: winningRound ?? null,
        hasWinner: result.hasWinner,
        winnerId: result.winnerId,
      },
    })

    // Invalidate in-memory match cache and revalidate Next.js Data Cache paths
    invalidateMatchesCache(match.tournament_id)
    revalidatePath(routes.organizer.tournamentBracket(match.tournament_id))
    revalidatePath(routes.organizer.tournamentDetail(match.tournament_id))

    return {
      success: true,
      hasWinner: result.hasWinner,
      winnerId: result.winnerId,
      player1Wins: result.player1Wins,
      player2Wins: result.player2Wins
    }
  } catch (error) {
    logger.error({ error, matchId }, 'Failed to save match scores')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save match scores'
    }
  }
}
