import { updateMatchParticipants } from '@/lib/actions/matches'
import { updateMatch } from '@/lib/db/queries/matches'
import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery } from '@/__mocks__/@supabase/supabase-js'

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
  })

  afterEach(() => {
    clearMockAuth()
  })

  it('should update match participants successfully', async () => {
    const player1Id = 'player-1'
    const player2Id = 'player-2'

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
