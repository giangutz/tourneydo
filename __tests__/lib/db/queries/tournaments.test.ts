import {
  getTournamentsByOrganizerId,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournaments,
  getPublicTournaments,
} from '@/lib/db/queries/tournaments'
import { mockTournament } from '@/__tests__/utils/test-utils'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

describe('Tournament Queries', () => {
  beforeEach(() => {
    clearMockQueryResponse()
  })

  describe('getTournamentsByOrganizerId', () => {
    it('should return tournaments for organizer', async () => {
      const tournaments = [mockTournament(), mockTournament({ id: '2' })]
      mockSuccessQuery(tournaments)

      const result = await getTournamentsByOrganizerId('organizer-1')
      expect(result).toHaveLength(2)
    })

    it('should return empty array if no tournaments found', async () => {
      mockSuccessQuery([])
      const result = await getTournamentsByOrganizerId('organizer-1')
      expect(result).toEqual([])
    })

    it('should throw error on failure', async () => {
      mockErrorQuery('Database error')
      await expect(getTournamentsByOrganizerId('organizer-1')).rejects.toThrow('Failed to fetch tournaments')
    })
  })

  describe('getTournamentById', () => {
    it('should return tournament if found', async () => {
      const tournament = mockTournament()
      mockSuccessQuery(tournament)

      const result = await getTournamentById('tournament-1')
      expect(result).toEqual(tournament)
    })

    it('should return null if not found', async () => {
      mockErrorQuery('Not found', 'PGRST116')
      const result = await getTournamentById('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('createTournament', () => {
    it('should create and return tournament', async () => {
      const tournament = mockTournament()
      mockSuccessQuery(tournament)

      const result = await createTournament({
        name: tournament.name,
        organizer_id: tournament.organizer_id,
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        status: 'upcoming'
      })

      expect(result).toEqual(tournament)
    })
  })

  describe('updateTournament', () => {
    it('should update and return tournament', async () => {
      const tournament = mockTournament({ name: 'Updated Name' })
      mockSuccessQuery(tournament)

      const result = await updateTournament('tournament-1', { name: 'Updated Name' })
      expect(result.name).toBe('Updated Name')
    })
  })

  describe('deleteTournament', () => {
    it('should delete tournament', async () => {
      mockSuccessQuery(null)
      await expect(deleteTournament('tournament-1')).resolves.not.toThrow()
    })
  })

  describe('getTournaments', () => {
    it('should return upcoming tournaments', async () => {
      const tournaments = [mockTournament({ status: 'upcoming' })]
      mockSuccessQuery(tournaments)

      const result = await getTournaments()
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('upcoming')
    })
  })

  describe('getPublicTournaments', () => {
    it('should return tournaments with filters', async () => {
      const tournaments = [mockTournament()]
      mockSuccessQuery(tournaments)

      const result = await getPublicTournaments({ search: 'Summer', status: 'upcoming' })
      expect(result).toHaveLength(1)
    })
  })
})
