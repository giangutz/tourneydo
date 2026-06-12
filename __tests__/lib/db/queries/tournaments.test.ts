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
import { mockSuccessQuery, mockErrorQuery, mockQueueSuccess, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

describe('Tournament Queries', () => {
  beforeEach(() => {
    clearMockQueryResponse()
  })

  describe('getTournamentsByOrganizerId', () => {
    it('should return tournaments for organizer', async () => {
      const tournaments = [mockTournament(), mockTournament({ id: '2' })]
      // This query now performs several sequential reads (organized tournaments
      // → user email → staff assignments). Queue them so the staff merge sees no
      // extra rows; otherwise the persistent mock echoes the tournaments array
      // back as fake staff entries and inflates the count.
      mockQueueSuccess(tournaments)     // organized tournaments
      mockQueueSuccess({ email: null }) // user email lookup (null skips staff sync)
      mockQueueSuccess([])              // staff assignments

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
      await expect(getTournamentsByOrganizerId('organizer-1')).rejects.toThrow('Failed to fetch organized tournaments')
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
        status: 'upcoming',
        weigh_in_start: tournament.weigh_in_start,
        weigh_in_end: tournament.weigh_in_end,
        description: tournament.description,
        entry_fee: tournament.entry_fee,
        venue: tournament.venue,
        max_players: tournament.max_players,
        registration_deadline: tournament.registration_deadline,
        courts: tournament.courts,
        tournament_type: tournament.tournament_type,
        gender_preference: tournament.gender_preference,
        allowed_belt_groups: tournament.allowed_belt_groups,
        division_move_policy: tournament.division_move_policy
      })

      expect(result).toEqual(tournament)
    })
  })

  describe('updateTournament', () => {
    it('should update tournament without throwing', async () => {
      mockSuccessQuery(null)
      await expect(
        updateTournament('tournament-1', { name: 'Updated Name' })
      ).resolves.toBeUndefined()
    })

    it('should throw on database error', async () => {
      mockErrorQuery('Database error')
      await expect(
        updateTournament('tournament-1', { name: 'Updated Name' })
      ).rejects.toThrow('Failed to update tournament')
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
      // Use future dates: getTournaments derives status from dates via
      // checkAndUpdateStatus, so a past-dated fixture would be coerced to 'completed'.
      const tournaments = [
        mockTournament({ status: 'upcoming', start_date: '2027-01-01', end_date: '2027-01-02' }),
      ]
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
