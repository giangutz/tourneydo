import { createPlayerAction, updatePlayerAction, deletePlayerAction } from '@/lib/actions/players'
import { setMockCoach, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'
import { mockPlayer } from '../../utils/test-utils'

describe('Player Server Actions', () => {
  beforeEach(() => {
    setMockCoach()
    clearMockQueryResponse()
  })

  afterEach(() => {
    clearMockAuth()
  })

  describe('createPlayerAction', () => {
    it('should create player with valid data', async () => {
      const player = mockPlayer()
      mockSuccessQuery(player)

      const formData = new FormData()
      formData.append('first_name', player.first_name)
      formData.append('last_name', player.last_name)
      formData.append('email', player.email || '')
      formData.append('dob', player.dob || '')

      const result = await createPlayerAction(formData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeDefined()
      }
    })

    it('should fail if unauthorized', async () => {
      clearMockAuth()

      const formData = new FormData()
      const result = await createPlayerAction(formData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unauthorized')
      }
    })
  })

  describe('updatePlayerAction', () => {
    it('should update player with valid data', async () => {
      const player = mockPlayer()
      mockSuccessQuery(player)

      const formData = new FormData()
      formData.append('first_name', 'Updated Name')
      formData.append('last_name', player.last_name)
      formData.append('email', player.email || '')
      formData.append('dob', player.dob || '')

      const result = await updatePlayerAction('player-1', formData)

      expect(result.success).toBe(true)
    })
  })

  describe('deletePlayerAction', () => {
    it('should delete player', async () => {
      mockSuccessQuery(null)

      const result = await deletePlayerAction('player-1')
      expect(result.success).toBe(true)
    })
  })
})
