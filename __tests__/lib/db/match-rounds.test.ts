/**
 * Tests for checkAndUpdateMatchWinner.
 *
 * All Supabase calls are mocked via jest.mock('@/lib/supabase/server').
 * We test the winner-determination logic (round counting, explicit methods,
 * golden-point round 4, threshold cases) without hitting the database.
 */

import { checkAndUpdateMatchWinner } from '@/lib/db/queries/match-rounds'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const MATCH_ID = 'a0000000-0000-4000-8000-000000000002'

// ---------------------------------------------------------------------------
// Helpers for building mock Supabase clients
// ---------------------------------------------------------------------------

function makeRound(roundNumber: number, winnerId: string | null) {
  return { id: `r${roundNumber}`, match_id: MATCH_ID, round_number: roundNumber, winner_id: winnerId, score_player1: 0, score_player2: 0, status: 'completed', created_at: '', updated_at: '' }
}

function buildSupabaseMock(rounds: ReturnType<typeof makeRound>[]) {
  const rpcMock = jest.fn().mockResolvedValue({ error: null })
  const chainBuilder = (resolveValue: any) => {
    const c: any = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue(resolveValue), single: jest.fn().mockResolvedValue(resolveValue) }
    return c
  }

  return {
    from: jest.fn((table: string) => {
      if (table === 'matches') return chainBuilder({ data: { player1_id: P1, player2_id: P2, next_match_id: null, tournament_id: 't1' }, error: null })
      if (table === 'match_rounds') return chainBuilder({ data: rounds, error: null })
      return chainBuilder({ data: null, error: null })
    }),
    rpc: rpcMock,
    _rpc: rpcMock,
  }
}

// Mock the server supabase factory
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkAndUpdateMatchWinner — round-derived (PTF)', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns hasWinner=false when no round has a winner yet', async () => {
    const rounds = [makeRound(1, null), makeRound(2, null), makeRound(3, null)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID)
    expect(result.hasWinner).toBe(false)
    expect(result.winnerId).toBeNull()
  })

  it('detects 2-0 win for player 1', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P1), makeRound(3, null)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID)
    expect(result.hasWinner).toBe(true)
    expect(result.winnerId).toBe(P1)
    expect(result.player1Wins).toBe(2)
    expect(result.player2Wins).toBe(0)
  })

  it('detects 2-1 win for player 2', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P2), makeRound(3, P2)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID)
    expect(result.hasWinner).toBe(true)
    expect(result.winnerId).toBe(P2)
    expect(result.player1Wins).toBe(1)
    expect(result.player2Wins).toBe(2)
  })

  it('returns hasWinner=false when only 1-1 after 3 rounds (no golden point yet)', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P2), makeRound(3, null)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID)
    expect(result.hasWinner).toBe(false)
  })

  it('detects golden-point winner via round 4', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P2), makeRound(3, null), makeRound(4, P1)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID, undefined, 'GDP')
    expect(result.hasWinner).toBe(true)
    expect(result.winnerId).toBe(P1)
    expect(result.player1Wins).toBe(2) // R1 + R4
  })

  it('calls advance_match_winner RPC exactly once when a winner is found', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P1), makeRound(3, null)]
    const client = buildSupabaseMock(rounds) as any
    mockCreateClient.mockReturnValue(client)

    await checkAndUpdateMatchWinner(MATCH_ID)
    expect(client._rpc).toHaveBeenCalledTimes(1)
    expect(client._rpc).toHaveBeenCalledWith('advance_match_winner', expect.objectContaining({
      p_match_id: MATCH_ID,
      p_winner_id: P1,
      p_win_method: 'PTF',
    }))
  })

  it('does NOT call advance_match_winner when no winner yet', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, null), makeRound(3, null)]
    const client = buildSupabaseMock(rounds) as any
    mockCreateClient.mockReturnValue(client)

    await checkAndUpdateMatchWinner(MATCH_ID)
    expect(client._rpc).not.toHaveBeenCalled()
  })
})

describe('checkAndUpdateMatchWinner — explicit win methods', () => {
  afterEach(() => jest.clearAllMocks())

  it.each(['RSC', 'WDR', 'DSQ', 'PUN'] as const)(
    '%s with explicit winner skips round counting and calls RPC',
    async (method) => {
      const rounds: any[] = [] // rounds not fetched for explicit methods
      const client = buildSupabaseMock(rounds) as any
      mockCreateClient.mockReturnValue(client)

      const result = await checkAndUpdateMatchWinner(MATCH_ID, P2, method, 2)
      expect(result.hasWinner).toBe(true)
      expect(result.winnerId).toBe(P2)

      expect(client._rpc).toHaveBeenCalledWith('advance_match_winner', expect.objectContaining({
        p_winner_id: P2,
        p_win_method: method,
        p_winning_round: 2,
      }))
    }
  )

  it('passes win_method through to the RPC for PTG', async () => {
    const rounds = [makeRound(1, P1), makeRound(2, P1), makeRound(3, null)]
    const client = buildSupabaseMock(rounds) as any
    mockCreateClient.mockReturnValue(client)

    await checkAndUpdateMatchWinner(MATCH_ID, undefined, 'PTG')
    expect(client._rpc).toHaveBeenCalledWith('advance_match_winner', expect.objectContaining({
      p_win_method: 'PTG',
    }))
  })
})

describe('checkAndUpdateMatchWinner — edge cases', () => {
  afterEach(() => jest.clearAllMocks())

  it('handles 3-0 sweep (rounds after the 2nd win have no winner — still correct)', async () => {
    // In a real bracket round 3 would not be played, but if all 3 have winners:
    const rounds = [makeRound(1, P1), makeRound(2, P1), makeRound(3, P2)]
    mockCreateClient.mockReturnValue(buildSupabaseMock(rounds) as any)

    const result = await checkAndUpdateMatchWinner(MATCH_ID)
    expect(result.hasWinner).toBe(true)
    expect(result.player1Wins).toBe(2)
    expect(result.player2Wins).toBe(1)
    expect(result.winnerId).toBe(P1)
  })

  it('uses default winMethod PTF when not specified', async () => {
    const rounds = [makeRound(1, P2), makeRound(2, P2), makeRound(3, null)]
    const client = buildSupabaseMock(rounds) as any
    mockCreateClient.mockReturnValue(client)

    await checkAndUpdateMatchWinner(MATCH_ID)
    expect(client._rpc).toHaveBeenCalledWith('advance_match_winner', expect.objectContaining({
      p_win_method: 'PTF',
    }))
  })
})
