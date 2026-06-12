/**
 * Tests for WT match-score validation schema.
 *
 * Covers: basic round scores, gam-jeom taxonomy validation,
 * round-loss rule (5 gam-jeoms), golden-point round 4,
 * explicit-winner method requirements, PTG/SUP/PUN refinements.
 */

import {
  matchScoresSchema,
  saveMatchScoresInputSchema,
  gamJeomSchema,
  gamJeomsSchema,
} from '@/lib/validations/match-scores'
import { GAM_JEOM_TYPE_VALUES } from '@/lib/constants/wt-rules'

// Zod v4 validates UUID version nibble ([1-8]) and variant nibble ([89ab])
const PLAYER_1 = '11111111-1111-4111-8111-111111111111'
const PLAYER_2 = '22222222-2222-4222-8222-222222222222'

const validScores = {
  round1: { player1: 3, player2: 1 },
  round2: { player1: 0, player2: 5 },
  round3: { player1: 2, player2: 2, winnerId: PLAYER_1 },
}

// ---------------------------------------------------------------------------
// matchScoresSchema
// ---------------------------------------------------------------------------

describe('matchScoresSchema', () => {
  it('accepts valid 3-round scores', () => {
    expect(matchScoresSchema.safeParse(validScores).success).toBe(true)
  })

  it('accepts an optional golden-point round4', () => {
    const input = { ...validScores, round4: { player1: 1, player2: 0 } }
    expect(matchScoresSchema.safeParse(input).success).toBe(true)
  })

  it('rejects negative scores', () => {
    const bad = { ...validScores, round1: { player1: -1, player2: 0 } }
    expect(matchScoresSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects non-integer scores', () => {
    const bad = { ...validScores, round1: { player1: 1.5, player2: 0 } }
    expect(matchScoresSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects missing rounds', () => {
    const { round3: _omit, ...incomplete } = validScores
    expect(matchScoresSchema.safeParse(incomplete).success).toBe(false)
  })

  it('accepts winnerId override for tied round', () => {
    const input = {
      ...validScores,
      round1: { player1: 5, player2: 5, winnerId: PLAYER_1 },
    }
    expect(matchScoresSchema.safeParse(input).success).toBe(true)
  })

  it('rejects invalid UUID for winnerId', () => {
    const input = {
      ...validScores,
      round1: { player1: 5, player2: 5, winnerId: 'not-a-uuid' },
    }
    expect(matchScoresSchema.safeParse(input).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// gamJeomSchema / taxonomy validation
// ---------------------------------------------------------------------------

describe('gamJeomSchema', () => {
  it('accepts a valid gam-jeom event', () => {
    const input = { roundNumber: 1, playerId: PLAYER_1, type: 'crossing_boundary' }
    expect(gamJeomSchema.safeParse(input).success).toBe(true)
  })

  it('accepts all known violation types', () => {
    for (const type of GAM_JEOM_TYPE_VALUES) {
      const result = gamJeomSchema.safeParse({ roundNumber: 1, playerId: PLAYER_1, type })
      expect(result.success).toBe(true)
    }
  })

  it('rejects an unknown violation type', () => {
    const input = { roundNumber: 1, playerId: PLAYER_1, type: 'made_up_violation' }
    expect(gamJeomSchema.safeParse(input).success).toBe(false)
  })

  it('rejects a round number outside 1-4', () => {
    const input = { roundNumber: 5, playerId: PLAYER_1, type: 'passivity' }
    expect(gamJeomSchema.safeParse(input).success).toBe(false)
  })

  it('accepts round 4 (golden point) gam-jeom', () => {
    const input = { roundNumber: 4, playerId: PLAYER_1, type: 'passivity' }
    expect(gamJeomSchema.safeParse(input).success).toBe(true)
  })

  it('rejects invalid player UUID', () => {
    const input = { roundNumber: 1, playerId: 'bad-id', type: 'passivity' }
    expect(gamJeomSchema.safeParse(input).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// saveMatchScoresInputSchema — win-method rules
// ---------------------------------------------------------------------------

describe('saveMatchScoresInputSchema — win method rules', () => {
  const baseInput = {
    scores: validScores,
    winMethod: 'PTF',
    gamJeoms: [],
  }

  it('accepts PTF (default) with no explicit winner fields', () => {
    expect(saveMatchScoresInputSchema.safeParse(baseInput).success).toBe(true)
  })

  it('defaults winMethod to PTF when omitted', () => {
    const { winMethod: _omit, ...noMethod } = baseInput
    const result = saveMatchScoresInputSchema.safeParse(noMethod)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.winMethod).toBe('PTF')
  })

  it('accepts PTG with no explicit winner fields', () => {
    expect(saveMatchScoresInputSchema.safeParse({ ...baseInput, winMethod: 'PTG' }).success).toBe(true)
  })

  it('accepts GDP (golden point) with no explicit winner fields', () => {
    const input = {
      ...baseInput,
      winMethod: 'GDP',
      scores: { ...validScores, round4: { player1: 1, player2: 0 } },
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects RSC without winnerId', () => {
    const input = { ...baseInput, winMethod: 'RSC', winningRound: 2 }
    const result = saveMatchScoresInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('winnerId')
    }
  })

  it('rejects RSC without winningRound', () => {
    const input = { ...baseInput, winMethod: 'RSC', winnerId: PLAYER_1 }
    const result = saveMatchScoresInputSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('winningRound')
    }
  })

  it('accepts RSC with both winnerId and winningRound', () => {
    const input = {
      ...baseInput,
      winMethod: 'RSC',
      winnerId: PLAYER_1,
      winningRound: 2,
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it.each(['WDR', 'DSQ', 'PUN'] as const)(
    'rejects %s without winnerId + winningRound',
    (method) => {
      const result = saveMatchScoresInputSchema.safeParse({ ...baseInput, winMethod: method })
      expect(result.success).toBe(false)
    }
  )

  it('accepts all legacy methods (back-compat)', () => {
    const legacyMethods = ['SCORE', 'KO', 'TKO', 'DQ', 'WITHDRAWAL', 'FORFEIT'] as const
    for (const method of legacyMethods) {
      const isExplicit = ['KO', 'TKO', 'DQ', 'WITHDRAWAL', 'FORFEIT'].includes(method)
      const input = isExplicit
        ? { ...baseInput, winMethod: method, winnerId: PLAYER_1, winningRound: 1 }
        : { ...baseInput, winMethod: method }
      expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// saveMatchScoresInputSchema — gam-jeom integration
// ---------------------------------------------------------------------------

describe('saveMatchScoresInputSchema — gam-jeom array', () => {
  it('accepts empty gamJeoms array', () => {
    const input = { scores: validScores, winMethod: 'PTF', gamJeoms: [] }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it('accepts well-formed typed gam-jeoms', () => {
    const input = {
      scores: validScores,
      winMethod: 'PTF',
      gamJeoms: [
        { roundNumber: 1, playerId: PLAYER_1, type: 'passivity' },
        { roundNumber: 1, playerId: PLAYER_2, type: 'grabbing_pushing' },
      ],
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects gam-jeom with unknown type', () => {
    const input = {
      scores: validScores,
      winMethod: 'PTF',
      gamJeoms: [{ roundNumber: 1, playerId: PLAYER_1, type: 'illegal_move' }],
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// saveMatchScoresInputSchema — technique stats (optional)
// ---------------------------------------------------------------------------

describe('saveMatchScoresInputSchema — technique stats', () => {
  it('accepts omitted techniques (all optional)', () => {
    const input = { scores: validScores, winMethod: 'PTF' }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it('accepts full technique breakdown', () => {
    const input = {
      scores: validScores,
      winMethod: 'PTF',
      techniques: [
        {
          roundNumber: 1,
          playerId: PLAYER_1,
          punch: 2,
          body_kick: 1,
          head_kick: 1,
          spin_body_kick: 0,
          spin_head_kick: 0,
        },
      ],
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(true)
  })

  it('rejects negative technique counts', () => {
    const input = {
      scores: validScores,
      winMethod: 'PTF',
      techniques: [
        { roundNumber: 1, playerId: PLAYER_1, punch: -1, body_kick: 0, head_kick: 0, spin_body_kick: 0, spin_head_kick: 0 },
      ],
    }
    expect(saveMatchScoresInputSchema.safeParse(input).success).toBe(false)
  })
})
