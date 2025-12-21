import { MatchInsert } from '@/types/models'

interface Participant {
  id: string
  team_id: string
  player_id: string
}

/**
 * Get proper bracket round label based on participant count
 * Examples: "Finals", "Semi-Finals", "Quarter-Finals", "Round of 16", etc.
 */
export function getBracketRoundLabel(
  currentRound: number,
  totalRounds: number
): string {
  const roundsFromEnd = totalRounds - currentRound + 1

  if (roundsFromEnd === 1) return 'Finals'
  if (roundsFromEnd === 2) return 'Semi-Finals'
  if (roundsFromEnd === 3) return 'Quarter-Finals'

  // Calculate participants in this round (power of 2)
  const participantsInRound = Math.pow(2, roundsFromEnd)
  return `Round of ${participantsInRound}`
}

/**
 * Recursively finds the best slot for a player to maximize distance from teammates
 * Uses binary tree navigation to find the bracket branch with fewest teammates
 */
function findBestSlotForTeamAvoidance(
  seeds: (Participant | null)[],
  bracketSize: number,
  teamId: string
): number {
  // Count teammates in a specific range [start, end)
  const countTeammates = (start: number, end: number): number => {
    let count = 0
    for (let i = start; i < end; i++) {
      if (seeds[i] && seeds[i]?.team_id === teamId) count++
    }
    return count
  }

  // Find first empty slot in range, with randomization for variety
  const findEmptyIn = (start: number, end: number): number | null => {
    const emptyIndices: number[] = []
    for (let i = start; i < end; i++) {
      if (seeds[i] === null) emptyIndices.push(i)
    }
    if (emptyIndices.length === 0) return null
    // Randomize to prevent predictable patterns
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
  }

  // Recursive tree navigation
  const navigateTree = (start: number, end: number): number => {
    const rangeSize = end - start

    // Base case: single slot
    if (rangeSize === 1) {
      return seeds[start] === null ? start : -1
    }

    const mid = start + Math.floor(rangeSize / 2)

    const leftCount = countTeammates(start, mid)
    const rightCount = countTeammates(mid, end)

    // Check for available space
    const leftHasSpace = seeds.slice(start, mid).some(s => s === null)
    const rightHasSpace = seeds.slice(mid, end).some(s => s === null)

    // Navigate to side with FEWER teammates (if both have space)
    if (leftHasSpace && rightHasSpace) {
      if (leftCount < rightCount) return navigateTree(start, mid)
      if (rightCount < leftCount) return navigateTree(mid, end)
      // Equal counts? Randomize to keep distribution unpredictable
      return Math.random() < 0.5 ? navigateTree(start, mid) : navigateTree(mid, end)
    }

    // Go to whichever side has space
    if (leftHasSpace) return navigateTree(start, mid)
    if (rightHasSpace) return navigateTree(mid, end)

    // No space (shouldn't happen with correct bracket size)
    return -1
  }

  // Start recursion from full bracket
  const bestIndex = navigateTree(0, bracketSize)

  // Fallback to linear search if recursive logic fails
  if (bestIndex === -1 || seeds[bestIndex] !== null) {
    const linearIndex = seeds.findIndex(s => s === null)
    return linearIndex !== -1 ? linearIndex : 0
  }

  return bestIndex
}

/**
 * Seed participants using recursive tree-based algorithm to maximize team distance
 * Strategy: Sort teams by size, shuffle within teams, recursively find optimal slots
 */
function seedParticipants(participants: Participant[], bracketSize: number): (Participant | null)[] {
  const seeds: (Participant | null)[] = new Array(bracketSize).fill(null)

  if (participants.length === 0) return seeds

  // Group participants by team
  const teamGroups = new Map<string, Participant[]>()
  participants.forEach(p => {
    if (!teamGroups.has(p.team_id)) {
      teamGroups.set(p.team_id, [])
    }
    teamGroups.get(p.team_id)!.push(p)
  })

  // Sort teams by size (largest first) to maximize their spread
  const sortedTeamIds = Array.from(teamGroups.keys()).sort((a, b) =>
    teamGroups.get(b)!.length - teamGroups.get(a)!.length
  )

  // Process each team
  sortedTeamIds.forEach(teamId => {
    // Shuffle players within team to prevent predictable patterns
    const teamPlayers = teamGroups.get(teamId)!.sort(() => 0.5 - Math.random())

    // Place each player in optimal slot
    teamPlayers.forEach(player => {
      const bestSlotIndex = findBestSlotForTeamAvoidance(seeds, bracketSize, teamId)
      if (bestSlotIndex >= 0 && bestSlotIndex < bracketSize) {
        seeds[bestSlotIndex] = player
      }
    })
  })

  return seeds
}

/**
 * Generate a single elimination bracket
 * Creates only the matches needed for Round 1, future rounds are created as matches complete
 */
export function generateBracket(
  tournamentId: string,
  participants: Participant[],
  startMatchNumber: number = 1
): MatchInsert[] {
  console.log('generateBracket called with', participants.length, 'participants')

  if (participants.length < 1) {
    throw new Error('At least 1 participant is required to generate a bracket')
  }

  // Handle single participant case - create a Finals match with no opponent
  if (participants.length === 1) {
    console.log('Single participant - creating Finals match with automatic win')
    return [{
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: 1,
      match_number: startMatchNumber,
      player1_id: participants[0].player_id,
      player2_id: null,
      winner_id: participants[0].player_id,
      score_player1: 0,
      score_player2: 0,
      score_round1_player1: 0,
      score_round1_player2: 0,
      score_round2_player1: 0,
      score_round2_player2: 0,
      score_round3_player1: 0,
      score_round3_player2: 0,

      winner_round1: null,
      winner_round2: null,
      winner_round3: null,
      status: 'completed' as const,
      next_match_id: null,
      source_match_id: null,
      court_number: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      actual_start_time: null,
      actual_end_time: null
    }]
  }

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const totalRounds = Math.log2(bracketSize)
  const byesCount = bracketSize - participants.length

  console.log('Bracket details:', {
    participantCount: participants.length,
    bracketSize,
    totalRounds,
    byesCount
  })

  // Seed participants with same-team avoidance
  const seeds = seedParticipants(participants, bracketSize)

  console.log('Seeding complete:', {
    totalSeeds: seeds.filter(s => s !== null).length,
    byes: seeds.filter(s => s === null).length
  })

  // Generate all matches for the complete bracket structure
  const matches: MatchInsert[] = []
  const matchMap = new Map<string, string>() // key: "round-matchNum", value: uuid
  let matchNumberOffset = 0

  // Generate matches from Finals down to Round 1
  // This allows us to set next_match_id correctly
  for (let round = totalRounds; round >= 1; round--) {
    const numMatches = Math.pow(2, totalRounds - round)

    for (let structuralMatchNum = 1; structuralMatchNum <= numMatches; structuralMatchNum++) {
      const matchNum = startMatchNumber + (matchNumberOffset++)
      const id = crypto.randomUUID()
      const key = `${round}-${structuralMatchNum}`
      matchMap.set(key, id)

      // Determine next_match_id
      let nextMatchId: string | null = null
      if (round < totalRounds) {
        const nextRound = round + 1
        const nextStructuralMatchNum = Math.ceil(structuralMatchNum / 2)
        nextMatchId = matchMap.get(`${nextRound}-${nextStructuralMatchNum}`) || null
      }

      let player1Id: string | null = null
      let player2Id: string | null = null
      let status: 'scheduled' | 'completed' | 'in_progress' = 'scheduled'
      let winnerId: string | null = null

      // Only populate Round 1 matches with players
      if (round === 1) {
        const p1Index = (structuralMatchNum - 1) * 2
        const p2Index = (structuralMatchNum - 1) * 2 + 1
        const p1 = seeds[p1Index]
        const p2 = seeds[p2Index]

        player1Id = p1 ? p1.player_id : null
        player2Id = p2 ? p2.player_id : null

        // Handle BYEs
        if (p1 && !p2) {
          status = 'completed'
          winnerId = p1.player_id
        } else if (!p1 && p2) {
          status = 'completed'
          winnerId = p2.player_id
        } else if (!p1 && !p2) {
          // Double BYE - mark as completed with no winner
          status = 'completed'
          winnerId = null
        }
      }

      const match: MatchInsert = {
        id,
        tournament_id: tournamentId,
        round,
        match_number: matchNum,
        player1_id: player1Id,
        player2_id: player2Id,
        winner_id: winnerId,
        score_player1: 0,
        score_player2: 0,
        score_round1_player1: 0,
        score_round1_player2: 0,
        score_round2_player1: 0,
        score_round2_player2: 0,
        score_round3_player1: 0,
        score_round3_player2: 0,

        winner_round1: null,
        winner_round2: null,
        winner_round3: null,
        status,
        next_match_id: nextMatchId,
        source_match_id: null,
        court_number: null,
        scheduled_start_time: null,
        scheduled_end_time: null,
        actual_start_time: null,
        actual_end_time: null
      }

      matches.push(match)
    }
  }

  // Propagate BYE winners to next rounds
  let changesMade = true
  let iterations = 0
  const maxIterations = totalRounds * 2 // Safety limit

  while (changesMade && iterations < maxIterations) {
    changesMade = false
    iterations++

    for (let round = 2; round <= totalRounds; round++) {
      const numMatches = Math.pow(2, totalRounds - round)

      for (let structuralMatchNum = 1; structuralMatchNum <= numMatches; structuralMatchNum++) {
        const currentKey = `${round}-${structuralMatchNum}`
        const currentMatch = matches.find(m => matchMap.get(currentKey) === m.id)
        if (!currentMatch) continue

        // Skip if already has both players or is completed
        if (currentMatch.status === 'completed' && currentMatch.winner_id) continue

        // Find source matches from previous round
        const source1MatchNum = structuralMatchNum * 2 - 1
        const source2MatchNum = structuralMatchNum * 2
        const source1Key = `${round - 1}-${source1MatchNum}`
        const source2Key = `${round - 1}-${source2MatchNum}`

        const source1 = matches.find(m => matchMap.get(source1Key) === m.id)
        const source2 = matches.find(m => matchMap.get(source2Key) === m.id)

        // Propagate winners from completed source matches
        if (source1 && source1.status === 'completed' && source1.winner_id) {
          if (currentMatch.player1_id !== source1.winner_id) {
            currentMatch.player1_id = source1.winner_id
            changesMade = true
          }
        }

        if (source2 && source2.status === 'completed' && source2.winner_id) {
          if (currentMatch.player2_id !== source2.winner_id) {
            currentMatch.player2_id = source2.winner_id
            changesMade = true
          }
        }

        // Check if this match should be auto-completed (one player vs BYE)
        const source1IsDoubleBye = source1 && source1.status === 'completed' && !source1.winner_id
        const source2IsDoubleBye = source2 && source2.status === 'completed' && !source2.winner_id

        if (currentMatch.status !== 'completed') {
          if (currentMatch.player1_id && source2IsDoubleBye) {
            currentMatch.status = 'completed'
            currentMatch.winner_id = currentMatch.player1_id
            changesMade = true
          } else if (currentMatch.player2_id && source1IsDoubleBye) {
            currentMatch.status = 'completed'
            currentMatch.winner_id = currentMatch.player2_id
            changesMade = true
          } else if (source1IsDoubleBye && source2IsDoubleBye) {
            currentMatch.status = 'completed'
            currentMatch.winner_id = null
            changesMade = true
          }
        }
      }
    }
  }

  console.log(`Generated ${matches.length} matches total (${iterations} propagation iterations)`)
  return matches
}
