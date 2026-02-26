/**
 * Validation schemas for match score submission
 *
 * Score rules:
 *   - Must be a non-negative integer (min 0, no maximum — match officials
 *     determine the valid range per division/competition rules)
 *   - winnerId is optional: provided only when the round ends in a tie that
 *     requires a manual judge decision
 *
 * Win method:
 *   - SCORE (default): normal best-of-3 by point totals
 *   - KO/TKO/DQ/WITHDRAWAL/FORFEIT: early termination; explicit winner required
 */

import { z } from 'zod'

export const WIN_METHODS = ['SCORE', 'KO', 'TKO', 'DQ', 'WITHDRAWAL', 'FORFEIT'] as const

const roundScoreSchema = z.object({
  player1: z
    .number({ message: 'Score must be a number' })
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative'),
  player2: z
    .number({ message: 'Score must be a number' })
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative'),
  /** Manual winner override — used only for tie-break decisions */
  winnerId: z.string().uuid('Invalid player ID').nullable().optional(),
})

export const matchScoresSchema = z.object({
  round1: roundScoreSchema,
  round2: roundScoreSchema,
  round3: roundScoreSchema,
})

/**
 * Full save-match-scores input schema including win method.
 * When winMethod is not 'SCORE', winnerId and winningRound are required.
 */
export const saveMatchScoresInputSchema = z
  .object({
    scores: matchScoresSchema,
    winMethod: z.enum(WIN_METHODS).default('SCORE'),
    winningRound: z.number().int().min(1).max(3).optional(),
    winnerId: z.string().uuid('Invalid player ID').optional(),
  })
  .refine(
    (data) => data.winMethod === 'SCORE' || !!data.winnerId,
    { message: 'winnerId is required for non-SCORE win methods', path: ['winnerId'] }
  )
  .refine(
    (data) => data.winMethod === 'SCORE' || !!data.winningRound,
    { message: 'winningRound is required for non-SCORE win methods', path: ['winningRound'] }
  )

export type RoundScoreInput = z.infer<typeof roundScoreSchema>
export type MatchScoresInput = z.infer<typeof matchScoresSchema>
export type SaveMatchScoresInput = z.infer<typeof saveMatchScoresInputSchema>
