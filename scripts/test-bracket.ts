import { generateBracket } from '../lib/utils/bracket-generator'

interface Participant {
  id: string
  team_id: string
  player_id: string
}

console.log('\n' + '='.repeat(70))
console.log('RECURSIVE SEEDING TEST - Improved Algorithm')
console.log('='.repeat(70))

// Test 1: 8 players, 4 teams (2 per team)
console.log('\n--- Test 1: 8 players, 4 teams (2 per team) ---')
const test1Participants = [
  { id: 'p1', team_id: 'teamA', player_id: 'playerA1' },
  { id: 'p2', team_id: 'teamA', player_id: 'playerA2' },
  { id: 'p3', team_id: 'teamB', player_id: 'playerB1' },
  { id: 'p4', team_id: 'teamB', player_id: 'playerB2' },
  { id: 'p5', team_id: 'teamC', player_id: 'playerC1' },
  { id: 'p6', team_id: 'teamC', player_id: 'playerC2' },
  { id: 'p7', team_id: 'teamD', player_id: 'playerD1' },
  { id: 'p8', team_id: 'teamD', player_id: 'playerD2' },
]

const test1Matches = generateBracket('test', test1Participants)
console.log('Generated', test1Matches.length, 'matches')

const test1Round1 = test1Matches.filter(m => m.round === 1)
console.log('\nRound 1 matches:')
test1Round1.forEach(m => {
  const p1 = test1Participants.find(p => p.player_id === m.player1_id)
  const p2 = test1Participants.find(p => p.player_id === m.player2_id)
  const sameTeam = p1 && p2 && p1.team_id === p2.team_id
  console.log(`  Match ${m.match_number}: ${p1?.player_id || 'BYE'} (${p1?.team_id || '-'}) vs ${p2?.player_id || 'BYE'} (${p2?.team_id || '-'}) ${sameTeam ? '❌ SAME TEAM!' : '✓'}`)
})

// Test 2: 5 players, 2 teams (3 from teamA, 2 from teamB)
console.log('\n--- Test 2: 5 players, 2 teams (3 from teamA, 2 from teamB) ---')
const test2Participants = [
  { id: 'p1', team_id: 'teamA', player_id: 'playerA1' },
  { id: 'p2', team_id: 'teamA', player_id: 'playerA2' },
  { id: 'p3', team_id: 'teamA', player_id: 'playerA3' },
  { id: 'p4', team_id: 'teamB', player_id: 'playerB1' },
  { id: 'p5', team_id: 'teamB', player_id: 'playerB2' },
]

const test2Matches = generateBracket('test', test2Participants)
console.log('Generated', test2Matches.length, 'matches')

const test2Round1 = test2Matches.filter(m => m.round === 1)
console.log('\nRound 1 matches:')
test2Round1.forEach(m => {
  const p1 = test2Participants.find(p => p.player_id === m.player1_id)
  const p2 = test2Participants.find(p => p.player_id === m.player2_id)
  const sameTeam = p1 && p2 && p1.team_id === p2.team_id
  console.log(`  Match ${m.match_number}: ${p1?.player_id || 'BYE'} (${p1?.team_id || '-'}) vs ${p2?.player_id || 'BYE'} (${p2?.team_id || '-'}) ${sameTeam ? '❌ SAME TEAM!' : '✓'}`)
})

// Test 3: 3 players, 3 teams
console.log('\n--- Test 3: 3 players, 3 teams (one BYE) ---')
const test3Participants = [
  { id: 'p1', team_id: 'teamA', player_id: 'playerA1' },
  { id: 'p2', team_id: 'teamB', player_id: 'playerB1' },
  { id: 'p3', team_id: 'teamC', player_id: 'playerC1' },
]

const test3Matches = generateBracket('test', test3Participants)
console.log('Generated', test3Matches.length, 'matches')

const test3Round1 = test3Matches.filter(m => m.round === 1)
console.log('\nRound 1 matches:')
test3Round1.forEach(m => {
  const p1 = test3Participants.find(p => p.player_id === m.player1_id)
  const p2 = test3Participants.find(p => p.player_id === m.player2_id)
  const hasBye = !p1 || !p2
  console.log(`  Match ${m.match_number}: ${p1?.player_id || 'BYE'} vs ${p2?.player_id || 'BYE'} ${hasBye ? '[BYE]' : ''}`)
})

// Test 4: 6 players, 2 teams (4 from teamA, 2 from teamB)
console.log('\n--- Test 4: 6 players, 2 teams (4 from teamA, 2 from teamB) ---')
const test4Participants = [
  { id: 'p1', team_id: 'teamA', player_id: 'playerA1' },
  { id: 'p2', team_id: 'teamA', player_id: 'playerA2' },
  { id: 'p3', team_id: 'teamA', player_id: 'playerA3' },
  { id: 'p4', team_id: 'teamA', player_id: 'playerA4' },
  { id: 'p5', team_id: 'teamB', player_id: 'playerB1' },
  { id: 'p6', team_id: 'teamB', player_id: 'playerB2' },
]

const test4Matches = generateBracket('test', test4Participants)
console.log('Generated', test4Matches.length, 'matches')

const test4Round1 = test4Matches.filter(m => m.round === 1)
console.log('\nRound 1 matches:')
test4Round1.forEach(m => {
  const p1 = test4Participants.find(p => p.player_id === m.player1_id)
  const p2 = test4Participants.find(p => p.player_id === m.player2_id)
  const sameTeam = p1 && p2 && p1.team_id === p2.team_id
  console.log(`  Match ${m.match_number}: ${p1?.player_id || 'BYE'} (${p1?.team_id || '-'}) vs ${p2?.player_id || 'BYE'} (${p2?.team_id || '-'}) ${sameTeam ? '❌ SAME TEAM!' : '✓'}`)
})

console.log('\n' + '='.repeat(70))
console.log('TESTS COMPLETE')
console.log('='.repeat(70) + '\n')
