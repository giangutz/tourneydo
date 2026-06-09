/**
 * Validation schemas for match score submission (WT result recording).
 *
 * The app records the FINAL result transcribed from the match slip — it does
 * not compute a live score. Per round we capture:
 *   - the final point totals (already include gam-jeom points),
 *   - an optional manual winner override (tie-break / superiority),
 *   - optional typed gam-jeom events (for the round-loss rule + player stats),
 *   - optional per-player technique counts (for player stats).
 *
 * Round 4 is the optional golden-point decider.
 *
 * Win method (see lib/constants/wt-rules.ts):
 *   - PTF/PTG/GDP/SUP resolve through the per-round winners.
 *   - RSC/WDR/DSQ/PUN (and legacy KO/TKO/DQ/WITHDRAWAL/FORFEIT) are explicit
 *     early terminations and require an explicit winner + winning round.
 */

import { z } from 'zod'
import {
  ALL_WIN_METHODS,
  GAM_JEOM_TYPE_VALUES,
  TECHNIQUE_KEYS,
  isExplicitWinnerMethod,
} from '@/lib/constants/wt-rules'
import type { WinMethod } from '@/types/models'

/** Re-exported for callers that previously imported it from here. */
export const WIN_METHODS = ALL_WIN_METHODS

const roundScoreSchema = z.object({
  player1: z
    .number({ message: 'Score must be a number' })
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative'),
  player2: z
    .number({ message: 'Score must be a number' })
    .int('Score must be a whole number')
    .min(0, 'Score cannot be negative'),
  /** Manual winner override — used for tie-break / superiority decisions. */
  winnerId: z.string().uuid('Invalid player ID').nullable().optional(),
})

export const matchScoresSchema = z.object({
  round1: roundScoreSchema,
  round2: roundScoreSchema,
  round3: roundScoreSchema,
  /** Golden-point decider — present only when rounds are split 1–1. */
  round4: roundScoreSchema.optional(),
})

/** A single typed gam-jeom (penalty) event. */
export const gamJeomSchema = z.object({
  roundNumber: z.number().int().min(1).max(4),
  playerId: z.string().uuid('Invalid player ID'),
  type: z.enum(GAM_JEOM_TYPE_VALUES as [string, ...string[]], {
    message: 'Unknown gam-jeom type',
  }),
})

export const gamJeomsSchema = z.array(gamJeomSchema)

/** Per-player-per-round technique counts (player statistics). */
export const techniqueStatSchema = z
  .object({
    roundNumber: z.number().int().min(1).max(4),
    playerId: z.string().uuid('Invalid player ID'),
  })
  .and(
    z.object(
      Object.fromEntries(
        TECHNIQUE_KEYS.map((k) => [k, z.number().int().min(0).default(0)]),
      ) as Record<(typeof TECHNIQUE_KEYS)[number], z.ZodDefault<z.ZodNumber>>,
    ),
  )

export const techniqueStatsSchema = z.array(techniqueStatSchema)

/**
 * Full save-match-scores input schema including win method + WT detail.
 * Explicit-winner methods require winnerId and winningRound.
 */
export const saveMatchScoresInputSchema = z
  .object({
    scores: matchScoresSchema,
    winMethod: z.enum(ALL_WIN_METHODS as unknown as [WinMethod, ...WinMethod[]]).default('PTF'),
    winningRound: z.number().int().min(1).max(4).optional(),
    winnerId: z.string().uuid('Invalid player ID').optional(),
    gamJeoms: gamJeomsSchema.optional(),
    techniques: techniqueStatsSchema.optional(),
  })
  .refine(
    (data) => !isExplicitWinnerMethod(data.winMethod) || !!data.winnerId,
    { message: 'winnerId is required for explicit win methods (RSC/WDR/DSQ/PUN/KO/…)', path: ['winnerId'] },
  )
  .refine(
    (data) => !isExplicitWinnerMethod(data.winMethod) || !!data.winningRound,
    { message: 'winningRound is required for explicit win methods', path: ['winningRound'] },
  )

export type RoundScoreInput = z.infer<typeof roundScoreSchema>
export type MatchScoresInput = z.infer<typeof matchScoresSchema>
export type GamJeomInput = z.infer<typeof gamJeomSchema>
export type TechniqueStatInput = z.infer<typeof techniqueStatSchema>
export type SaveMatchScoresInput = z.infer<typeof saveMatchScoresInputSchema>
