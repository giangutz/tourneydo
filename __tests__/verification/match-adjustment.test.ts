import { updateMatchParticipants } from '@/lib/actions/matches'
import { updateMatch } from '@/lib/db/queries/matches'
import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockQueueSuccess, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

jest.mock('@/lib/db/queries/matches', () => ({
  updateMatch: jest.fn(),
  advanceWinner: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Manual Match Adjustment', () => {
  const organizerId = 'organizer-1'
  const matchId = 'match-1'
  const tournamentId = 'tournament-1'

  beforeEach(() => {
    setMockOrganizer(organizerId)
    jest.clearAllMocks()
    clearMockQueryResponse()
  })

  // updateMatchParticipants reads the current match + its sibling division matches
  // from Supabase before delegating to updateMatch. Queue those two reads.
  function queueMatchReads() {
    mockQueueSuccess({
      player1_id: 'old-1',
      player2_id: 'old-2',
      division_id: 'div-1',
      category_id: 'cat-1',
    }) // current match (.single)
    mockQueueSuccess([]) // sibling division matches
  }

  afterEach(() => {
    clearMockAuth()
  })

  it('should update match participants successfully', async () => {
    const player1Id = 'player-1'
    const player2Id = 'player-2'

    queueMatchReads()
      // Mock successful update
      ; (updateMatch as jest.Mock).mockResolvedValue({
        id: matchId,
        player1_id: player1Id,
        player2_id: player2Id,
      })

    const result = await updateMatchParticipants(matchId, tournamentId, player1Id, player2Id)

    expect(result.success).toBe(true)
    expect(updateMatch).toHaveBeenCalledWith(matchId, {
      player1_id: player1Id,
      player2_id: player2Id,
    })
  })

  it('should handle setting a participant to TBD (null)', async () => {
    const player1Id = 'player-1'
    const player2Id = null

    queueMatchReads()
      // Mock successful update
      ; (updateMatch as jest.Mock).mockResolvedValue({
        id: matchId,
        player1_id: player1Id,
        player2_id: player2Id,
      })

    const result = await updateMatchParticipants(matchId, tournamentId, player1Id, player2Id)

    expect(result.success).toBe(true)
    expect(updateMatch).toHaveBeenCalledWith(matchId, {
      player1_id: player1Id,
      player2_id: player2Id,
    })
  })
})
