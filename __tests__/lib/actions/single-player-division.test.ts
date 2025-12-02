import { generateTournamentBracket } from '@/lib/actions/brackets'
import { setMockOrganizer, clearMockAuth } from '@/__mocks__/@clerk/nextjs/server'
import { mockSuccessQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

describe('Single Player Division Support', () => {
  beforeEach(() => {
    setMockOrganizer()
    clearMockQueryResponse()
  })

  afterEach(() => {
    clearMockAuth()
  })

  it('should create a bracket for a division with only 1 participant', async () => {
    // Mock tournament with tournament_type
    const mockTournament = {
      id: 'tournament-1',
      tournament_type: 'standard',
      status: 'upcoming'
    }

    // Mock single participant
    const mockParticipant = {
      id: 'participant-1',
      player_id: 'player-1',
      team_id: 'team-1',
      status: 'verified',
      division_id: 'division-1',
      category_id: 'category-1',
      player: {
        first_name: 'John',
        last_name: 'Doe',
        dob: '2010-01-01',
        gender: 'male',
        weight: 50,
        height: 150,
        belt_level: 'White'
      }
    }

    // Mock divisions
    const mockDivisions = [{
      id: 'division-1',
      name: 'Gradeschool',
      tournament_categories: [{
        id: 'category-1',
        name: 'Group 1',
        gender: 'male'
      }]
    }]

    // Setup mocks
    mockSuccessQuery(mockTournament) // getTournamentById
    mockSuccessQuery(mockDivisions) // getTournamentDivisions
    mockSuccessQuery([mockParticipant]) // getTournamentParticipants (first call)
    mockSuccessQuery([mockParticipant]) // getTournamentParticipants (second call after assignment)
    mockSuccessQuery(null) // saveBracket

    const result = await generateTournamentBracket('tournament-1')

    // Should succeed without errors
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should handle mixed divisions with 1 and multiple participants', async () => {
    const mockTournament = {
      id: 'tournament-1',
      tournament_type: 'standard',
      status: 'upcoming'
    }

    // 3 participants: 1 in division A, 2 in division B
    const mockParticipants = [
      {
        id: 'participant-1',
        player_id: 'player-1',
        team_id: 'team-1',
        status: 'verified',
        division_id: 'division-1',
        category_id: 'category-1',
        player: {
          first_name: 'Solo',
          last_name: 'Player',
          dob: '2010-01-01',
          gender: 'male',
          weight: 40,
          belt_level: 'White'
        }
      },
      {
        id: 'participant-2',
        player_id: 'player-2',
        team_id: 'team-2',
        status: 'verified',
        division_id: 'division-1',
        category_id: 'category-2',
        player: {
          first_name: 'Player',
          last_name: 'Two',
          dob: '2010-01-01',
          gender: 'male',
          weight: 50,
          belt_level: 'White'
        }
      },
      {
        id: 'participant-3',
        player_id: 'player-3',
        team_id: 'team-3',
        status: 'verified',
        division_id: 'division-1',
        category_id: 'category-2',
        player: {
          first_name: 'Player',
          last_name: 'Three',
          dob: '2010-01-01',
          gender: 'male',
          weight: 50,
          belt_level: 'White'
        }
      }
    ]

    mockSuccessQuery(mockTournament)
    mockSuccessQuery([]) // divisions
    mockSuccessQuery(mockParticipants)
    mockSuccessQuery(mockParticipants)
    mockSuccessQuery(null)

    const result = await generateTournamentBracket('tournament-1')

    // Should handle both single and multi-player divisions
    expect(result.success).toBe(true)
  })
})
