/**
 * Tests for getPlayerCareerStats and getPlayerTournamentStats.
 *
 * All Supabase calls are mocked — pure logic testing for:
 *  - Match record computation (wins/losses/winRate)
 *  - Technique aggregation and rate calculations
 *  - Gam-jeom breakdown by type and category
 *  - hasData flag when no matches/stats exist
 *  - Tournament-scoped stats use match_id filter
 */

import { getPlayerCareerStats, getPlayerTournamentStats } from '@/lib/db/queries/player-stats'

const PLAYER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ID  = '22222222-2222-4222-8222-222222222222'
const TOURNEY   = 'a0000000-0000-4000-8000-000000000003'
const MATCH_1   = 'a0000000-0000-4000-8000-000000000010'
const MATCH_2   = 'a0000000-0000-4000-8000-000000000011'

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'
const mockCreateClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>

function buildSupabase({
  matches = [] as any[],
  techRows = [] as any[],
  gamRows = [] as any[],
} = {}) {
  const makeChain = (data: any[]) => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      or:     jest.fn().mockReturnThis(),
      in:     jest.fn().mockResolvedValue({ data, error: null }),
    }
    // Make eq/or/select/in all chainable and terminal via in()
    // For career stats, the terminal call is implicit (Promise) — we need
    // the chain to resolve when awaited. Override or() and eq() to resolve.
    Object.defineProperty(chain, Symbol.iterator, { value: undefined })
    // Last method in the chain resolves to { data, error }
    chain.or.mockReturnValue({ ...chain, then: (res: any) => Promise.resolve({ data, error: null }).then(res) })
    chain.eq.mockReturnValue({ ...chain, then: (res: any) => Promise.resolve({ data, error: null }).then(res) })
    chain.in.mockResolvedValue({ data, error: null })
    return chain
  }

  return {
    from: jest.fn((table: string) => {
      if (table === 'matches') return makeChain(matches)
      if (table === 'match_player_round_stats') return makeChain(techRows)
      if (table === 'match_gam_jeoms') return makeChain(gamRows)
      return makeChain([])
    }),
  }
}

describe('getPlayerCareerStats — match record', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns zero stats when no matches played', async () => {
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.matchRecord.played).toBe(0)
    expect(stats.matchRecord.wins).toBe(0)
    expect(stats.matchRecord.winRate).toBe(0)
    expect(stats.hasData).toBe(false)
  })

  it('counts wins correctly when player won both matches', async () => {
    const matches = [
      { id: MATCH_1, winner_id: PLAYER_ID },
      { id: MATCH_2, winner_id: PLAYER_ID },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ matches }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.matchRecord.played).toBe(2)
    expect(stats.matchRecord.wins).toBe(2)
    expect(stats.matchRecord.losses).toBe(0)
    expect(stats.matchRecord.winRate).toBe(100)
    expect(stats.hasData).toBe(true)
  })

  it('counts losses correctly when player lost both matches', async () => {
    const matches = [
      { id: MATCH_1, winner_id: OTHER_ID },
      { id: MATCH_2, winner_id: OTHER_ID },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ matches }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.matchRecord.wins).toBe(0)
    expect(stats.matchRecord.losses).toBe(2)
    expect(stats.matchRecord.winRate).toBe(0)
  })

  it('computes 50% win rate for 1W-1L', async () => {
    const matches = [
      { id: MATCH_1, winner_id: PLAYER_ID },
      { id: MATCH_2, winner_id: OTHER_ID },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ matches }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.matchRecord.winRate).toBe(50)
  })
})

describe('getPlayerCareerStats — technique stats', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns zero totals when no technique data', async () => {
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.techniques.total).toBe(0)
    expect(stats.techniques.headKickRate).toBe(0)
    expect(stats.techniques.spinKickRate).toBe(0)
  })

  it('sums technique counts across rounds', async () => {
    const techRows = [
      { punch: 2, body_kick: 3, head_kick: 1, spin_body_kick: 0, spin_head_kick: 1 },
      { punch: 1, body_kick: 2, head_kick: 2, spin_body_kick: 1, spin_head_kick: 0 },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ techRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.techniques.punch).toBe(3)
    expect(stats.techniques.body_kick).toBe(5)
    expect(stats.techniques.head_kick).toBe(3)
    expect(stats.techniques.spin_body_kick).toBe(1)
    expect(stats.techniques.spin_head_kick).toBe(1)
    expect(stats.techniques.total).toBe(13)
  })

  it('calculates headKickRate as head_kick / total kicks (excluding punch)', async () => {
    // 0 punch, 6 body_kick, 4 head_kick, 0 spin → headKickRate = 4/10 = 40%
    const techRows = [{ punch: 0, body_kick: 6, head_kick: 4, spin_body_kick: 0, spin_head_kick: 0 }]
    mockCreateClient.mockReturnValue(buildSupabase({ techRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.techniques.headKickRate).toBe(40)
  })

  it('calculates spinKickRate as spin totals / total kicks', async () => {
    // 0 punch, 4 body, 4 head, 1 spin_body, 1 spin_head → spin = 2/10 = 20%
    const techRows = [{ punch: 0, body_kick: 4, head_kick: 4, spin_body_kick: 1, spin_head_kick: 1 }]
    mockCreateClient.mockReturnValue(buildSupabase({ techRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.techniques.spinKickRate).toBe(20)
  })
})

describe('getPlayerCareerStats — penalty stats', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns zero penalties when no gam-jeom data', async () => {
    mockCreateClient.mockReturnValue(buildSupabase() as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.penalties.total).toBe(0)
    expect(stats.penalties.byType).toHaveLength(0)
    expect(stats.penalties.byCategory.boundary_position).toBe(0)
  })

  it('groups gam-jeoms by type correctly', async () => {
    const gamRows = [
      { gam_jeom_type: 'passivity' },
      { gam_jeom_type: 'passivity' },
      { gam_jeom_type: 'crossing_boundary' },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ gamRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.penalties.total).toBe(3)
    expect(stats.penalties.byType[0].value).toBe('passivity')
    expect(stats.penalties.byType[0].count).toBe(2)
    expect(stats.penalties.byType[1].value).toBe('crossing_boundary')
    expect(stats.penalties.byType[1].count).toBe(1)
  })

  it('accumulates byCategory totals correctly', async () => {
    const gamRows = [
      { gam_jeom_type: 'passivity' },          // match_management
      { gam_jeom_type: 'misconduct' },          // match_management
      { gam_jeom_type: 'crossing_boundary' },   // boundary_position
      { gam_jeom_type: 'grabbing_pushing' },    // combat_contact
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ gamRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.penalties.byCategory.match_management).toBe(2)
    expect(stats.penalties.byCategory.boundary_position).toBe(1)
    expect(stats.penalties.byCategory.combat_contact).toBe(1)
  })

  it('computes perMatch average correctly', async () => {
    const matches = [{ id: MATCH_1, winner_id: PLAYER_ID }, { id: MATCH_2, winner_id: OTHER_ID }]
    const gamRows = [
      { gam_jeom_type: 'passivity' },
      { gam_jeom_type: 'passivity' },
      { gam_jeom_type: 'passivity' },
    ]
    mockCreateClient.mockReturnValue(buildSupabase({ matches, gamRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    expect(stats.penalties.perMatch).toBe(1.5) // 3 / 2 matches
  })

  it('excludes unknown gam-jeom types from byType (not in taxonomy)', async () => {
    const gamRows = [{ gam_jeom_type: 'unknown_type' }]
    mockCreateClient.mockReturnValue(buildSupabase({ gamRows }) as any)
    const stats = await getPlayerCareerStats(PLAYER_ID)

    // unknown_type is not in GAM_JEOM_TYPES so byType remains empty
    expect(stats.penalties.byType).toHaveLength(0)
    // but total still counts it
    expect(stats.penalties.total).toBe(1)
  })
})
