import { generateBracket } from '../lib/utils/bracket-generator'

console.log('=== Testing DFS Visual Structural Numbering ===\n')

// Test 1: 8-player bracket
console.log('Test 1: 8-Player Bracket')
console.log('Expected Round 1: 101, 102, 103, 104 (top to bottom)')
console.log('Expected Round 2: 201, 202')
console.log('Expected Round 3: 301\n')

const participants8 = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`,
  team_id: `t${i}`,
  player_id: `player${i}`
}))

const matches8 = generateBracket('test-tournament-8', participants8)

// Group by round
const byRound8 = new Map<number, any[]>()
matches8.forEach(m => {
  if (!byRound8.has(m.round)) byRound8.set(m.round, [])
  byRound8.get(m.round)!.push(m)
})

// Display results
for (let r = 1; r <= 3; r++) {
  const roundMatches = byRound8.get(r) || []
  const sorted = roundMatches.sort((a, b) => a.structural_match_number - b.structural_match_number)
  const numbers = sorted.map(m => m.structural_match_number)
  console.log(`Round ${r}: ${numbers.join(', ')}`)

  // Show match connections for Round 1
  if (r === 1) {
    sorted.forEach(m => {
      console.log(`  Match ${m.structural_match_number}: ${m.player1_id} vs ${m.player2_id} → feeds into ${m.next_match_id}`)
    })
  }
}

console.log('\n=== Test 2: 16-Player Bracket ===')
console.log('Expected Round 1: 101-108 (8 matches)')
console.log('Expected Round 2: 201-204 (4 matches)')
console.log('Expected Round 3: 301-302 (2 matches)')
console.log('Expected Round 4: 401 (Finals)\n')

const participants16 = Array.from({ length: 16 }, (_, i) => ({
  id: `p${i}`,
  team_id: `t${i}`,
  player_id: `player${i}`
}))

const matches16 = generateBracket('test-tournament-16', participants16)

const byRound16 = new Map<number, any[]>()
matches16.forEach(m => {
  if (!byRound16.has(m.round)) byRound16.set(m.round, [])
  byRound16.get(m.round)!.push(m)
})

for (let r = 1; r <= 4; r++) {
  const roundMatches = byRound16.get(r) || []
  const sorted = roundMatches.sort((a, b) => a.structural_match_number - b.structural_match_number)
  const numbers = sorted.map(m => m.structural_match_number)
  console.log(`Round ${r}: ${numbers.join(', ')} (${numbers.length} matches)`)
}

console.log('\n=== Verification ===')
console.log('✓ Check if numbers are sequential within each round')
console.log('✓ Check if top match has lowest number (e.g., 101)')
console.log('✓ Check if matches feed into correct parent matches')
