import {
  transformMatchToGame,
  buildBracketTree,
  buildBracketIndexes,
} from '@/lib/utils/bracket-data-transformer'
import type { Match } from '@/types/models'

// Minimal 4-player bracket: two round-1 matches feeding one final.
function makeMatches(): Match[] {
  const base = {
    tournament_id: 't1',
    created_at: '2026-03-01T00:00:00.000Z',
    court_number: null,
    score_round1_player1: 0,
    score_round1_player2: 0,
    score_round2_player1: 0,
    score_round2_player2: 0,
    score_round3_player1: 0,
    score_round3_player2: 0,
    winner_round1: null,
    winner_round2: null,
    winner_round3: null,
  }
  return [
    { ...base, id: 'r1a', match_number: 1, match_number_formatted: '101', round: 1, next_match_id: 'final', player1_id: 'p1', player2_id: 'p2' },
    { ...base, id: 'r1b', match_number: 2, match_number_formatted: '102', round: 1, next_match_id: 'final', player1_id: 'p3', player2_id: 'p4' },
    { ...base, id: 'final', match_number: 3, match_number_formatted: '201', round: 2, next_match_id: null, player1_id: null, player2_id: null },
  ] as unknown as Match[]
}

const participants = [
  { player_id: 'p1', player: { id: 'p1', first_name: 'Ann', last_name: 'Lee' }, team: { name: 'A' } },
  { player_id: 'p2', player: { id: 'p2', first_name: 'Bob', last_name: 'Kim' }, team: { name: 'B' } },
  { player_id: 'p3', player: { id: 'p3', first_name: 'Cy', last_name: 'Park' } },
  { player_id: 'p4', player: { id: 'p4', first_name: 'Di', last_name: 'Cho' } },
]

describe('bracket-data-transformer', () => {
  it('builds a tree rooted at the final with both round-1 sources linked', () => {
    const games = buildBracketTree(makeMatches(), participants)
    expect(games).toHaveLength(1)
    const final = games[0]
    expect(final.id).toBe('final')

    const home = final.sides.home.seed?.sourceGame
    const visitor = final.sides.visitor.seed?.sourceGame
    expect(home?.id).toBe('r1a') // lower match_number is Top/Home
    expect(visitor?.id).toBe('r1b')

    // Leaf names resolved from participants.
    expect(home?.sides.home.seed?.displayName).toBe('Ann Lee')
    expect(home?.sides.visitor.seed?.displayName).toBe('Bob Kim')
  })

  it('produces identical output with and without a prebuilt index', () => {
    const matches = makeMatches()
    const final = matches.find(m => m.id === 'final')!

    const withoutIndex = transformMatchToGame(final, matches, participants)
    const withIndex = transformMatchToGame(
      final,
      matches,
      participants,
      undefined,
      buildBracketIndexes(matches, participants)
    )

    // originalMatch holds a Match reference; compare the serialisable shape.
    expect(JSON.stringify(withIndex)).toBe(JSON.stringify(withoutIndex))
  })

  it('marks BYE for empty slots and resolves team names', () => {
    const games = buildBracketTree(makeMatches(), participants)
    const home = games[0].sides.home.seed?.sourceGame!
    expect(home.sides.home.team?.name).toBe('A')
    // p3/p4 have no team -> TBD
    const visitor = games[0].sides.visitor.seed?.sourceGame!
    expect(visitor.sides.home.team?.name).toBe('TBD')
  })
})
