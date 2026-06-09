'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'
import { checkTournamentAccess } from '@/lib/auth/tournament-access'
import { routes } from '@/config/routes'
import { invalidateMatchesCache } from '@/lib/cache/result-cache'
import {
  saveMatchScoresInputSchema,
  type MatchScoresInput,
  type GamJeomInput,
  type TechniqueStatInput,
} from '@/lib/validations/match-scores'
import { createAuditEntry } from '@/lib/db/queries/audit-trail'
import { isExplicitWinnerMethod, DEFAULT_WT_RULES } from '@/lib/constants/wt-rules'
import { computeDivisionPlacements } from '@/lib/db/queries/placements'
import { logger } from '@/lib/logger'
import type { WinMethod } from '@/types/models'

type RoundScores = MatchScoresInput

/**
 * Save a transcribed match result: per-round scores (incl. optional golden-point
 * round 4), typed gam-jeoms, and optional technique stats; then determine and
 * advance the winner. The final round score is authoritative (it already
 * includes gam-jeom points) — gam-jeoms are recorded for the round-loss rule and
 * player statistics only.
 *
 * Authorization: organizer OR staff with the `matches` capability.
 */
export async function saveMatchScores(
  matchId: string,
  scores: RoundScores,
  winMethod: WinMethod = 'PTF',
  winningRound?: number,
  winnerId?: string,
  expectedVersion?: string,
  gamJeoms: GamJeomInput[] = [],
  techniques: TechniqueStatInput[] = [],
) {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Validate the full payload (scores + gam-jeoms + techniques + method rules)
  const parsed = saveMatchScoresInputSchema.safeParse({
    scores,
    winMethod,
    winningRound,
    winnerId,
    gamJeoms,
    techniques,
  })
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return {
      success: false,
      error: firstIssue
        ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
        : 'Invalid score data',
    }
  }
  const input = parsed.data

  try {
    const supabase = createServerSupabaseClient()

    // Get the match to find player IDs, tournament, and current version
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('player1_id, player2_id, tournament_id, updated_at, next_match_id, division_id, category_id')
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

    // Authorize: organizer or staff with the `matches` capability (officials record results)
    const access = await checkTournamentAccess(match.tournament_id, 'matches')
    if (!access.hasAccess) {
      throw new Error('Not authorized to record results for this match')
    }

    const limit = DEFAULT_WT_RULES.gamJeomRoundLossLimit

    /** Count gam-jeoms committed by a player in a given round. */
    const gamJeomCount = (roundNumber: number, playerId: string | null): number => {
      if (!playerId) return 0
      return input.gamJeoms?.filter(
        (g) => g.roundNumber === roundNumber && g.playerId === playerId,
      ).length ?? 0
    }

    /**
     * Derive the winner of a round. Order of precedence:
     *   1. Gam-jeom round-loss: a player with ≥ limit gam-jeoms loses the round.
     *   2. Manual override (tie-break / superiority).
     *   3. Higher score.
     * Returns null for a true draw (→ golden point).
     */
    const deriveWinnerId = (
      roundNumber: number,
      player1Score: number,
      player2Score: number,
      manualWinnerId: string | null | undefined,
    ): string | null => {
      const p1Over = gamJeomCount(roundNumber, match.player1_id) >= limit
      const p2Over = gamJeomCount(roundNumber, match.player2_id) >= limit
      if (p1Over && !p2Over) return match.player2_id ?? null
      if (p2Over && !p1Over) return match.player1_id ?? null
      if (manualWinnerId) return manualWinnerId
      if (player1Score > player2Score) return match.player1_id ?? null
      if (player2Score > player1Score) return match.player2_id ?? null
      return null
    }

    // Build the rounds payload (round 4 = optional golden point)
    const roundInputs: Array<{ n: number; data: typeof input.scores.round1 }> = [
      { n: 1, data: input.scores.round1 },
      { n: 2, data: input.scores.round2 },
      { n: 3, data: input.scores.round3 },
    ]
    if (input.scores.round4) roundInputs.push({ n: 4, data: input.scores.round4 })

    const pRounds = roundInputs.map(({ n, data }) => ({
      round_number: n,
      score_player1: data.player1,
      score_player2: data.player2,
      winner_id: deriveWinnerId(n, data.player1, data.player2, data.winnerId),
    }))

    const pGamJeoms = (input.gamJeoms ?? []).map((g) => ({
      round_number: g.roundNumber,
      player_id: g.playerId,
      gam_jeom_type: g.type,
    }))

    const pTechniques = (input.techniques ?? []).map((t) => ({
      round_number: t.roundNumber,
      player_id: t.playerId,
      punch: t.punch,
      body_kick: t.body_kick,
      head_kick: t.head_kick,
      spin_body_kick: t.spin_body_kick,
      spin_head_kick: t.spin_head_kick,
    }))

    // Atomically write rounds + gam-jeoms + technique stats
    const { error: rpcError } = await supabase.rpc('save_match_scores_atomic', {
      p_match_id: matchId,
      p_rounds: pRounds,
      p_gam_jeoms: pGamJeoms,
      p_techniques: pTechniques,
    })

    if (rpcError) {
      throw new Error(`Failed to save scores: ${rpcError.message}`)
    }

    // Determine + advance the winner. Explicit methods pass the winner directly;
    // round-derived methods (PTF/PTG/GDP/SUP) let the round winner_ids decide.
    const result = await checkAndUpdateMatchWinner(
      matchId,
      isExplicitWinnerMethod(input.winMethod) ? input.winnerId ?? null : undefined,
      input.winMethod,
      input.winningRound,
    )

    if (result.hasWinner) {
      await supabase
        .from('matches')
        .update({ actual_end_time: new Date().toISOString() })
        .eq('id', matchId)

      // If this is the final match (no downstream match), compute placements
      const typedMatch = match as any
      if (!typedMatch.next_match_id) {
        await computeDivisionPlacements(supabase, matchId)
      }
    }

    // Audit (non-blocking)
    await createAuditEntry({
      tournamentId: match.tournament_id,
      entityType: 'match',
      entityId: matchId,
      action: 'SCORE_SAVED',
      actorId: userId,
      newState: {
        rounds: pRounds,
        gamJeoms: pGamJeoms,
      },
      metadata: {
        winMethod: input.winMethod,
        winningRound: input.winningRound ?? null,
        hasWinner: result.hasWinner,
        winnerId: result.winnerId,
        gamJeomCount: pGamJeoms.length,
      },
    })

    invalidateMatchesCache(match.tournament_id)
    revalidatePath(routes.organizer.tournamentBracket(match.tournament_id))
    revalidatePath(routes.organizer.tournamentDetail(match.tournament_id))

    return {
      success: true,
      hasWinner: result.hasWinner,
      winnerId: result.winnerId,
      player1Wins: result.player1Wins,
      player2Wins: result.player2Wins,
    }
  } catch (error) {
    logger.error({ error, matchId }, 'Failed to save match scores')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save match scores',
    }
  }
}