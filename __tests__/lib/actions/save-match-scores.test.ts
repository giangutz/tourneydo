/**
 * Tests for saveMatchScores authorization and core behaviour.
 *
 * All external calls (Clerk, Supabase, cache, realtime) are mocked.
 * Focus: who can save scores, who gets blocked, and that the correct
 * RPC + winner logic are invoked on the happy path.
 */

import { saveMatchScores } from '@/lib/actions/save-match-scores'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/auth/tournament-access', () => ({
  checkTournamentAccess: jest.fn(),
}))

jest.mock('@/lib/db/queries/match-rounds', () => ({
  checkAndUpdateMatchWinner: jest.fn(),
}))

jest.mock('@/lib/db/queries/placements', () => ({
  computeDivisionPlacements: jest.fn(),
}))

jest.mock('@/lib/cache/result-cache', () => ({
  invalidateMatchesCache: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/db/queries/audit-trail', () => ({
  createAuditEntry: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}))

import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkTournamentAccess } from '@/lib/auth/tournament-access'
import { checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>
const mockCheckAccess = checkTournamentAccess as jest.MockedFunction<typeof checkTournamentAccess>
const mockCheckWinner = checkAndUpdateMatchWinner as jest.MockedFunction<typeof checkAndUpdateMatchWinner>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Zod v4 validates UUID version nibble ([1-8]) and variant nibble ([89ab])
const USER_ID   = 'a0000000-0000-4000-8000-000000000001'
const MATCH_ID  = 'a0000000-0000-4000-8000-000000000002'
const TOURNEY   = 'a0000000-0000-4000-8000-000000000003'
const P1        = '11111111-1111-4111-8111-111111111111'
const P2        = '22222222-2222-4222-8222-222222222222'

const VALID_SCORES = {
  round1: { player1: 3, player2: 1 },
  round2: { player1: 0, player2: 5 },
  round3: { player1: 2, player2: 0 }, // no tie — no winnerId needed
}

function buildSupabase(overrides: Partial<{ matchData: any; rpcError: any; matchUpdateError: any }> = {}) {
  const { matchData, rpcError = null, matchUpdateError = null } = overrides
  const defaultMatch = {
    player1_id: P1, player2_id: P2, tournament_id: TOURNEY,
    updated_at: '2026-01-01T00:00:00Z', next_match_id: null,
    division_id: 'div-1', category_id: 'cat-1',
  }
  const chain: any = {
    select:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockReturnThis(),
    update:  jest.fn().mockReturnThis(),
    single:  jest.fn().mockResolvedValue({ data: matchData ?? defaultMatch, error: null }),
    rpc:     jest.fn().mockResolvedValue({ error: rpcError }),
  }
  // update().eq() returns the chain; await resolves to { error }
  chain.update.mockImplementation(() => ({
    eq: jest.fn().mockResolvedValue({ error: matchUpdateError }),
  }))
  return { from: jest.fn().mockReturnValue(chain), rpc: jest.fn().mockResolvedValue({ error: rpcError }), _chain: chain }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveMatchScores — authorization', () => {
  afterEach(() => jest.clearAllMocks())

  it('throws when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any)
    // The auth guard throws before the try/catch, so the call rejects
    await expect(saveMatchScores(MATCH_ID, VALID_SCORES)).rejects.toThrow('Unauthorized')
  })

  it('returns error when user has no access to the tournament', async () => {
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    mockCheckAccess.mockResolvedValue({ hasAccess: false })
    mockCheckWinner.mockResolvedValue({ hasWinner: false, winnerId: null, player1Wins: 0, player2Wins: 0 })

    const result = await saveMatchScores(MATCH_ID, VALID_SCORES)
    expect(result.success).toBe(false)
  })

  it('succeeds when user has the "matches" capability (staff/official)', async () => {
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    mockCheckAccess.mockResolvedValue({ hasAccess: true, userRoles: ['official'], isOrganizer: false })
    mockCheckWinner.mockResolvedValue({ hasWinner: false, winnerId: null, player1Wins: 1, player2Wins: 0 })

    const result = await saveMatchScores(MATCH_ID, VALID_SCORES)
    expect(result.success).toBe(true)
  })

  it('succeeds when user is the organizer', async () => {
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    mockCheckAccess.mockResolvedValue({ hasAccess: true, userRoles: ['admin'], isOrganizer: true })
    mockCheckWinner.mockResolvedValue({ hasWinner: true, winnerId: P1, player1Wins: 2, player2Wins: 0 })

    const result = await saveMatchScores(MATCH_ID, VALID_SCORES)
    expect(result.success).toBe(true)
  })
})

describe('saveMatchScores — optimistic locking', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns conflict error when expectedVersion does not match updated_at', async () => {
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    const matchData = { player1_id: P1, player2_id: P2, tournament_id: TOURNEY, updated_at: '2026-06-01T12:00:00Z', next_match_id: null }
    mockCreateClient.mockReturnValue(buildSupabase({ matchData }) as any)

    const result = await saveMatchScores(
      MATCH_ID, VALID_SCORES, 'PTF', undefined, undefined,
      '2026-06-01T11:00:00Z' // stale version
    )

    expect(result.success).toBe(false)
    expect((result as any).conflict).toBe(true)
  })

  it('proceeds when expectedVersion matches updated_at', async () => {
    const timestamp = '2026-06-01T12:00:00Z'
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    const matchData = { player1_id: P1, player2_id: P2, tournament_id: TOURNEY, updated_at: timestamp, next_match_id: null }
    mockCreateClient.mockReturnValue(buildSupabase({ matchData }) as any)
    mockCheckAccess.mockResolvedValue({ hasAccess: true, isOrganizer: true })
    mockCheckWinner.mockResolvedValue({ hasWinner: false, winnerId: null, player1Wins: 1, player2Wins: 0 })

    const result = await saveMatchScores(
      MATCH_ID, VALID_SCORES, 'PTF', undefined, undefined, timestamp
    )

    expect(result.success).toBe(true)
  })
})

describe('saveMatchScores — win method validation', () => {
  afterEach(() => jest.clearAllMocks())

  function setupHappyPath() {
    mockAuth.mockResolvedValue({ userId: USER_ID } as any)
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    mockCheckAccess.mockResolvedValue({ hasAccess: true, isOrganizer: true })
  }

  it('rejects RSC without winnerId (caught by Zod schema)', async () => {
    setupHappyPath()
    const result = await saveMatchScores(
      MATCH_ID, VALID_SCORES,
      'RSC', 2, undefined // no winnerId
    )
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/winnerId/)
  })

  it('accepts RSC with winnerId + winningRound', async () => {
    setupHappyPath()
    mockCheckWinner.mockResolvedValue({ hasWinner: true, winnerId: P1, player1Wins: 1, player2Wins: 0 })

    const result = await saveMatchScores(
      MATCH_ID, VALID_SCORES, 'RSC', 2, P1
    )
    expect(result.success).toBe(true)
  })

  it('calls checkAndUpdateMatchWinner with the correct winMethod', async () => {
    setupHappyPath()
    mockCheckWinner.mockResolvedValue({ hasWinner: false, winnerId: null, player1Wins: 1, player2Wins: 0 })

    await saveMatchScores(MATCH_ID, VALID_SCORES, 'PTG')

    expect(mockCheckWinner).toHaveBeenCalledWith(
      MATCH_ID,
      undefined,  // explicitWinnerId — PTG is round-derived
      'PTG',
      undefined
    )
  })
})
