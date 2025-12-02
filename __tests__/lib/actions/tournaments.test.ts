import { createTournament, updateTournament, deleteTournament } from '@/lib/actions/tournaments'
import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'
import { mockTournament } from '../../utils/test-utils'

describe('Tournament Server Actions', () => {
  beforeEach(() => {
    setMockOrganizer()
    clearMockQueryResponse()
  })

  afterEach(() => {
    clearMockAuth()
  })

  describe('createTournament', () => {
    it('should create tournament with valid data', async () => {
      const tournament = mockTournament()
      mockSuccessQuery(tournament)

      const formData = new FormData()
      formData.append('name', tournament.name)
      formData.append('start_date', tournament.start_date!)
      formData.append('end_date', tournament.end_date!)
      formData.append('venue', tournament.venue!)
      formData.append('max_players', String(tournament.max_players!))
      formData.append('entry_fee', String(tournament.entry_fee!))
      formData.append('registration_deadline', tournament.registration_deadline!)
      formData.append('tournament_type', 'standard')

      const result = await createTournament(null, formData)

      expect(result.success).toBe(true)
      expect(result.tournamentId).toBeDefined()
    })

    it('should return validation errors for invalid data', async () => {
      const formData = new FormData()
      // Missing required fields

      const result = await createTournament(null, formData)

      expect(result.error).toBe('Validation failed')
      expect(result.fieldErrors).toBeDefined()
    })

    it('should fail if unauthorized', async () => {
      clearMockAuth() // No user

      const formData = new FormData()
      const result = await createTournament(null, formData)

      expect(result.error).toBe('Unauthorized')
    })
  })

  describe('updateTournament', () => {
    it('should update tournament with valid data', async () => {
      const tournament = mockTournament()
      mockSuccessQuery(tournament)

      const formData = new FormData()
      formData.append('name', 'Updated Name')
      formData.append('start_date', tournament.start_date!)
      formData.append('end_date', tournament.end_date!)
      formData.append('venue', tournament.venue!)
      formData.append('max_players', String(tournament.max_players!))
      formData.append('entry_fee', String(tournament.entry_fee!))
      formData.append('registration_deadline', tournament.registration_deadline!)
      formData.append('tournament_type', 'open-belt')

      const result = await updateTournament('tournament-1', null, formData)

      expect(result.success).toBe(true)
    })
  })

  describe('deleteTournament', () => {
    it('should delete tournament', async () => {
      mockSuccessQuery(null)

      // deleteTournament returns void or redirects, doesn't return state
      // We just check it doesn't throw
      await expect(deleteTournament('tournament-1')).resolves.not.toThrow()
    })
  })
})
