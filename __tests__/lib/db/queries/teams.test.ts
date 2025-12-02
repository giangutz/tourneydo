import {
  getTeamsByUserId,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayersToTeam,
} from '@/lib/db/queries/teams'
import { mockTeam } from '@/__tests__/utils/test-utils'
import { mockSuccessQuery, mockErrorQuery, clearMockQueryResponse } from '@/__mocks__/@supabase/supabase-js'

describe('Team Queries', () => {
  beforeEach(() => {
    clearMockQueryResponse()
  })

  describe('getTeamsByUserId', () => {
    it('should return teams for user', async () => {
      const teams = [mockTeam(), mockTeam({ id: 'team-2' })]
      mockSuccessQuery(teams)

      const result = await getTeamsByUserId('coach-1')
      expect(result).toHaveLength(2)
    })
  })

  describe('getTeamById', () => {
    it('should return team if found', async () => {
      const team = mockTeam()
      mockSuccessQuery(team)

      const result = await getTeamById('team-1')
      expect(result).toEqual(team)
    })
  })

  describe('createTeam', () => {
    it('should create and return team', async () => {
      const team = mockTeam()
      mockSuccessQuery(team)

      const result = await createTeam({
        name: team.name,
        user_id: team.user_id
      })

      expect(result).toEqual(team)
    })
  })

  describe('updateTeam', () => {
    it('should update and return team', async () => {
      const team = mockTeam({ name: 'Updated Team' })
      mockSuccessQuery(team)

      const result = await updateTeam('team-1', { name: 'Updated Team' })
      expect(result.name).toBe('Updated Team')
    })
  })

  describe('deleteTeam', () => {
    it('should delete team', async () => {
      mockSuccessQuery(null)
      await expect(deleteTeam('team-1')).resolves.not.toThrow()
    })
  })

  describe('addPlayersToTeam', () => {
    it('should add players to team', async () => {
      mockSuccessQuery(null)
      await expect(addPlayersToTeam('team-1', ['player-1', 'player-2'])).resolves.not.toThrow()
    })
  })
})
