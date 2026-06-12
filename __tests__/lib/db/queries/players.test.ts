import {
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '@/lib/db/queries/players'
import { mockPlayer } from '@/__tests__/utils/test-utils'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

describe('Player Queries', () => {
  beforeEach(() => {
    clearMockQueryResponse()
  })

  describe('getPlayerById', () => {
    it('should return player if found', async () => {
      const player = mockPlayer()
      mockSuccessQuery(player)

      const result = await getPlayerById('player-1')
      expect(result).toEqual(player)
    })

    it('should return null if not found', async () => {
      mockErrorQuery('Not found', 'PGRST116')
      const result = await getPlayerById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('createPlayer', () => {
    it('should create and return player', async () => {
      const player = mockPlayer()
      mockSuccessQuery(player)

      const result = await createPlayer({
        first_name: player.first_name,
        last_name: player.last_name,
        coach_id: player.coach_id,
        email: player.email,
        dob: player.dob,
        weight: player.weight,
        height: player.height,
        belt_level: player.belt_level,
        gender: player.gender
      })

      expect(result).toEqual(player)
    })
  })

  describe('updatePlayer', () => {
    it('should update and return player', async () => {
      const player = mockPlayer({ first_name: 'Updated' })
      // updatePlayer uses `.select()` (no `.single()`), so it expects an array.
      mockSuccessQuery([player])

      const result = await updatePlayer('player-1', { first_name: 'Updated' })
      expect(result.first_name).toBe('Updated')
    })
  })

  describe('deletePlayer', () => {
    it('should delete player', async () => {
      mockSuccessQuery(null)
      await expect(deletePlayer('player-1')).resolves.not.toThrow()
    })
  })
})
