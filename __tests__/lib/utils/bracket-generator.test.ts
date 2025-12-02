import { generateBracket, getBracketRoundLabel } from '@/lib/utils/bracket-generator'

describe('Bracket Generator', () => {
  describe('getBracketRoundLabel', () => {
    it('should return "Finals" for last round', () => {
      expect(getBracketRoundLabel(3, 3)).toBe('Finals')
    })

    it('should return "Semi-Finals" for second to last round', () => {
      expect(getBracketRoundLabel(2, 3)).toBe('Semi-Finals')
    })

    it('should return "Quarter-Finals" for third to last round', () => {
      expect(getBracketRoundLabel(1, 3)).toBe('Quarter-Finals')
    })

    it('should return "Round of X" for earlier rounds', () => {
      expect(getBracketRoundLabel(1, 4)).toBe('Round of 16')
      expect(getBracketRoundLabel(2, 5)).toBe('Round of 16')
    })
  })

  describe('generateBracket', () => {
    const tournamentId = 'tournament-1'

    it('should throw error with less than 2 participants', () => {
      expect(() => generateBracket(tournamentId, [])).toThrow(
        'At least 2 participants are required'
      )
      expect(() => generateBracket(tournamentId, [{ id: '1', team_id: 't1', player_id: 'p1' }])).toThrow(
        'At least 2 participants are required'
      )
    })

    it('should generate bracket for 2 participants (1 match)', () => {
      const participants = [
        { id: '1', team_id: 't1', player_id: 'p1' },
        { id: '2', team_id: 't2', player_id: 'p2' },
      ]
      const matches = generateBracket(tournamentId, participants)

      expect(matches).toHaveLength(1)
      expect(matches[0].round).toBe(1)
      expect(matches[0].player1_id).toBe('p1')
      expect(matches[0].player2_id).toBe('p2')
      expect(matches[0].status).toBe('scheduled')
    })

    it('should generate bracket for 4 participants (3 matches)', () => {
      const participants = [
        { id: '1', team_id: 't1', player_id: 'p1' },
        { id: '2', team_id: 't2', player_id: 'p2' },
        { id: '3', team_id: 't3', player_id: 'p3' },
        { id: '4', team_id: 't4', player_id: 'p4' },
      ]
      const matches = generateBracket(tournamentId, participants)

      expect(matches).toHaveLength(3) // 2 in round 1, 1 in round 2 (finals)

      const round1Matches = matches.filter(m => m.round === 1)
      const round2Matches = matches.filter(m => m.round === 2)

      expect(round1Matches).toHaveLength(2)
      expect(round2Matches).toHaveLength(1)
    })

    it('should generate bracket for 8 participants (7 matches)', () => {
      const participants = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        team_id: `t${i + 1}`,
        player_id: `p${i + 1}`,
      }))
      const matches = generateBracket(tournamentId, participants)

      expect(matches).toHaveLength(7) // 4 + 2 + 1

      const round1 = matches.filter(m => m.round === 1)
      const round2 = matches.filter(m => m.round === 2)
      const round3 = matches.filter(m => m.round === 3)

      expect(round1).toHaveLength(4)
      expect(round2).toHaveLength(2)
      expect(round3).toHaveLength(1)
    })

    it('should handle odd number of participants with BYEs', () => {
      const participants = [
        { id: '1', team_id: 't1', player_id: 'p1' },
        { id: '2', team_id: 't2', player_id: 'p2' },
        { id: '3', team_id: 't3', player_id: 'p3' },
      ]
      const matches = generateBracket(tournamentId, participants)

      // 3 participants -> bracket size 4 -> 1 BYE
      expect(matches).toHaveLength(3) // 2 in round 1, 1 in round 2

      // One match should have a BYE (completed with winner)
      const byeMatches = matches.filter(m => m.status === 'completed' && m.winner_id !== null)
      expect(byeMatches.length).toBeGreaterThan(0)
    })

    it('should link matches correctly with next_match_id', () => {
      const participants = Array.from({ length: 4 }, (_, i) => ({
        id: String(i + 1),
        team_id: `t${i + 1}`,
        player_id: `p${i + 1}`,
      }))
      const matches = generateBracket(tournamentId, participants)

      const round1Matches = matches.filter(m => m.round === 1)
      const finalMatch = matches.find(m => m.round === 2)

      // Both round 1 matches should point to the final
      expect(round1Matches[0].next_match_id).toBe(finalMatch?.id)
      expect(round1Matches[1].next_match_id).toBe(finalMatch?.id)

      // Final should have no next match
      expect(finalMatch?.next_match_id).toBeNull()
    })

    it('should assign unique IDs to all matches', () => {
      const participants = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        team_id: `t${i + 1}`,
        player_id: `p${i + 1}`,
      }))
      const matches = generateBracket(tournamentId, participants)

      const ids = matches.map(m => m.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(matches.length)
    })

    it('should set correct tournament_id for all matches', () => {
      const participants = Array.from({ length: 4 }, (_, i) => ({
        id: String(i + 1),
        team_id: `t${i + 1}`,
        player_id: `p${i + 1}`,
      }))
      const matches = generateBracket(tournamentId, participants)

      matches.forEach(match => {
        expect(match.tournament_id).toBe(tournamentId)
      })
    })

    it('should initialize scores to 0', () => {
      const participants = Array.from({ length: 4 }, (_, i) => ({
        id: String(i + 1),
        team_id: `t${i + 1}`,
        player_id: `p${i + 1}`,
      }))
      const matches = generateBracket(tournamentId, participants)

      matches.forEach(match => {
        if (match.status === 'scheduled') {
          expect(match.score_player1).toBe(0)
          expect(match.score_player2).toBe(0)
        }
      })
    })
  })
})
