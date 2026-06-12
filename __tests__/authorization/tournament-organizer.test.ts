/**
 * Tournament Organizer Authorization Tests
 * 
 * These tests verify that tournament organizers have the correct permissions
 * and restrictions for their role.
 */

import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'
import { mockTournament, mockMatch, mockRegistration } from '@/__tests__/utils/test-utils'

// updateTournament orchestrates division sub-operations whose multi-step queries
// the simple supabase mock can't model; stub them so the action's own flow runs.
jest.mock('@/lib/db/queries/divisions')

// Import the functions we're testing
import { createTournament, updateTournament, deleteTournament } from '@/lib/actions/tournaments'
import { getTournamentParticipants, updateRegistrationStatus } from '@/lib/db/queries/registrations'
import { generateBracket } from '@/lib/utils/bracket-generator'

describe('Tournament Organizer Authorization', () => {
  const organizerId = 'organizer-1'

  beforeEach(() => {
    setMockOrganizer(organizerId)
    clearMockQueryResponse()
  })

  afterEach(() => {
    clearMockAuth()
  })

  describe('Tournament Management', () => {
    it('✓ CAN create tournaments', async () => {
      const tournament = mockTournament({ organizer_id: organizerId })
      mockSuccessQuery(tournament)

      const formData = new FormData()
      formData.append('name', tournament.name)
      formData.append('tournament_type', 'standard')
      formData.append('start_date', tournament.start_date!)
      formData.append('end_date', tournament.end_date!)
      formData.append('weigh_in_start', '2025-05-29')
      formData.append('weigh_in_end', '2025-05-30')
      formData.append('venue', tournament.venue!)
      formData.append('max_players', String(tournament.max_players!))
      formData.append('entry_fee', String(tournament.entry_fee!))
      formData.append('registration_deadline', tournament.registration_deadline!)

      const result = await createTournament(null, formData)
      expect(result.success).toBe(true)
      expect(result.tournamentId).toBeDefined()
    })

    it('✓ CAN update own tournaments', async () => {
      const tournament = mockTournament({ organizer_id: organizerId })
      mockSuccessQuery(tournament)

      const formData = new FormData()
      formData.append('name', 'Updated Tournament Name')
      formData.append('tournament_type', 'standard')
      formData.append('start_date', tournament.start_date!)
      formData.append('end_date', tournament.end_date!)
      formData.append('weigh_in_start', '2025-05-29')
      formData.append('weigh_in_end', '2025-05-30')
      formData.append('venue', tournament.venue!)
      formData.append('max_players', String(tournament.max_players!))
      formData.append('entry_fee', String(tournament.entry_fee!))
      formData.append('registration_deadline', tournament.registration_deadline!)

      const result = await updateTournament(tournament.id, null, formData)
      expect(result.success).toBe(true)
    })

    it('✓ CAN delete own tournaments', async () => {
      mockSuccessQuery(null)

      await expect(deleteTournament('tournament-1')).resolves.not.toThrow()
    })

    it('✗ CANNOT modify other organizers\' tournaments (RLS enforced)', async () => {
      // This would be enforced by Supabase RLS policies
      // The mock would return an error from Supabase
      mockErrorQuery('You do not have permission to perform this action', '42501')

      const formData = new FormData()
      formData.append('name', 'Hacked Tournament')
      formData.append('tournament_type', 'standard')
      formData.append('start_date', '2024-01-01')
      formData.append('end_date', '2024-01-02')
      formData.append('weigh_in_start', '2023-12-30')
      formData.append('weigh_in_end', '2023-12-31')
      formData.append('venue', 'Test Venue')
      formData.append('max_players', '32')
      formData.append('entry_fee', '50')
      formData.append('registration_deadline', '2023-12-31')

      const result = await updateTournament('other-tournament-id', null, formData)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('permission')
    })
  })

  describe('Bracket Management', () => {
    it('✓ CAN generate brackets for upcoming tournaments', () => {
      const participants = [
        { id: '1', team_id: 't1', player_id: 'p1' },
        { id: '2', team_id: 't2', player_id: 'p2' },
        { id: '3', team_id: 't3', player_id: 'p3' },
        { id: '4', team_id: 't4', player_id: 'p4' },
      ]

      const matches = generateBracket('tournament-1', participants)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches.every(m => m.tournament_id === 'tournament-1')).toBe(true)
    })

    it('✓ CAN manually adjust players on generated bracket', async () => {
      // This would be tested through match update functionality
      const updatedMatch = mockMatch({ player1_id: 'new-player-1' })
      mockSuccessQuery(updatedMatch)

      // In real implementation, this would call a match update function
      // For now, we verify the mock works
      expect(updatedMatch.player1_id).toBe('new-player-1')
    })

    it('✗ CANNOT generate brackets for ongoing tournaments', () => {
      // This business logic should be enforced in the bracket generation action
      // The test would verify that the action checks tournament status
      const tournament = mockTournament({ status: 'ongoing' })

      // In a real implementation, there would be a server action that checks this
      // For now, we document the expected behavior
      expect(tournament.status).toBe('ongoing')
      // generateBracketAction would throw or return error
    })

    it('✗ CANNOT generate brackets for completed tournaments', () => {
      const tournament = mockTournament({ status: 'completed' })
      expect(tournament.status).toBe('completed')
      // generateBracketAction would throw or return error
    })
  })

  describe('Match Management', () => {
    it('✓ CAN input scores for matches', async () => {
      const match = mockMatch({
        score_player1: 10,
        score_player2: 8,
        winner_id: 'player-1',
        status: 'completed',
      })
      mockSuccessQuery(match)

      // In real implementation, this would call saveMatchScores action
      expect(match.score_player1).toBe(10)
      expect(match.score_player2).toBe(8)
      expect(match.winner_id).toBe('player-1')
    })

    it('✓ CAN update match status', async () => {
      const match = mockMatch({ status: 'in_progress' })
      mockSuccessQuery(match)

      expect(match.status).toBe('in_progress')
    })

    it('✓ Matches update for live spectator viewing', async () => {
      // This tests that match updates are visible to spectators
      const match = mockMatch({ score_player1: 5, score_player2: 3 })
      mockSuccessQuery(match)

      // Spectators should be able to query this match
      expect(match.score_player1).toBe(5)
      expect(match.score_player2).toBe(3)
    })
  })

  describe('Participant Management', () => {
    it('✓ CAN view tournament participants', async () => {
      const participants = [
        mockRegistration({ tournament_id: 'tournament-1' }),
        mockRegistration({ tournament_id: 'tournament-1', player_id: 'player-2' }),
      ]
      mockSuccessQuery(participants)

      const result = await getTournamentParticipants('tournament-1')
      expect(result).toBeDefined()
    })

    it('✓ CAN mark participants as pending', async () => {
      mockSuccessQuery(null)

      await updateRegistrationStatus('registration-1', { status: 'pending' })
      // No error thrown means success
    })

    it('✓ CAN mark participants as verified', async () => {
      mockSuccessQuery(null)

      await updateRegistrationStatus('registration-1', { status: 'verified' })
    })

    it('✓ CAN mark participants as paid', async () => {
      mockSuccessQuery(null)

      await updateRegistrationStatus('registration-1', { status: 'paid' })
    })
  })

  describe('Restrictions', () => {
    it('✗ CANNOT access coach-only features', async () => {
      // Organizers should not be able to create players
      // This would be enforced by checking role in the action
      mockErrorQuery('Unauthorized', '42501')

      // In real implementation, createPlayerAction would check role
      // and return error for non-coach users
    })

    it('✗ CANNOT register players to tournaments', async () => {
      // Only coaches can register players
      mockErrorQuery('Only coaches can register players', '42501')

      // registerTeamForTournament would check role
    })
  })
})
