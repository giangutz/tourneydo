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
 * Generate a single elimination bracket
 * Supports unlimited bracket sizes based on participant count
 */
export function generateBracket(
  tournamentId: string,
  participants: Participant[],
  startMatchNumber: number = 1
): MatchInsert[] {
  console.log('generateBracket called with', participants.length, 'participants')

  if (participants.length < 2) {
    throw new Error('At least 2 participants are required to generate a bracket')
  }

  // 1. Calculate bracket size (power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const totalRounds = Math.log2(bracketSize)
  const byesCount = bracketSize - participants.length

  console.log('Bracket details:', {
    participantCount: participants.length,
    bracketSize,
    totalRounds,
    byesCount
  })

  // 2. Shuffle participants (random seeding for now)
  // TODO: Implement better seeding or avoid same team matchups
  const shuffled = [...participants].sort(() => Math.random() - 0.5)

  // 3. Distribute BYEs
  // We place BYEs in the first round.
  // The participants who get BYEs automatically advance to the second round.
  // In a standard bracket, the top seeds get the BYEs.
  // Since we are random, we just take the first N participants to have matches, and the rest get BYEs?
  // No, a match is Player A vs Player B.
  // If we have 5 players, bracket size is 8. 3 BYEs.
  // Round 1:
  // Match 1: P1 vs P2
  // Match 2: P3 vs P4
  // Match 3: P5 vs BYE -> P5 advances
  // Match 4: BYE vs BYE -> (Should not happen if logic is correct)

  // Actually, standard way:
  // Matches in Round 1 = participants.length - (bracketSize / 2) ? No.
  // Number of matches in Round 1 = participants.length - (bracketSize / 2) * 2 ?
  // Let's use a simpler approach:
  // Fill the bracket slots (1 to bracketSize).
  // Slots 1..participants.length are filled with players.
  // Slots participants.length+1..bracketSize are BYEs.
  // But we want to distribute BYEs evenly?
  // Standard single elimination:
  // If N=5, Size=8.
  // 1 vs 8 (BYE)
  // 4 vs 5
  // 3 vs 6 (BYE)
  // 2 vs 7 (BYE)

  // Simple fill for now:
  // 2. Seed participants
  // Smart seeding: Try to avoid same-team matchups in Round 1
  const seeds: (Participant | null)[] = new Array(bracketSize).fill(null)

  // Group participants by team
  const teamGroups = new Map<string, Participant[]>()
  participants.forEach(p => {
    if (!teamGroups.has(p.team_id)) {
      teamGroups.set(p.team_id, [])
    }
    teamGroups.get(p.team_id)!.push(p)
  })

  // Separate into teams with multiple players and single players
  const multiPlayerTeams: Participant[][] = []
  const singlePlayers: Participant[] = []

  teamGroups.forEach(players => {
    if (players.length > 1) {
      multiPlayerTeams.push(players)
    } else {
      singlePlayers.push(...players)
    }
  })

  // Seeding strategy:
  // 1. Place single players first (no conflict risk)
  // 2. Distribute multi-player team members across bracket halves/quarters

  let seedIndex = 0

  // Place single players first
  singlePlayers.forEach(p => {
    if (seedIndex < bracketSize) {
      seeds[seedIndex++] = p
    }
  })

  // Place multi-player teams, trying to separate them
  multiPlayerTeams.forEach(teamPlayers => {
    if (teamPlayers.length === 2 && bracketSize >= 4) {
      // For 2 players from same team, place them in opposite halves
      if (seedIndex < bracketSize / 2) {
        seeds[seedIndex++] = teamPlayers[0]
        // Place second player in opposite half
        const oppositeHalf = Math.floor(bracketSize / 2)
        let oppositeIndex = oppositeHalf
        while (oppositeIndex < bracketSize && seeds[oppositeIndex] !== null) {
          oppositeIndex++
        }
        if (oppositeIndex < bracketSize) {
          seeds[oppositeIndex] = teamPlayers[1]
        } else {
          // Fallback: just place sequentially
          seeds[seedIndex++] = teamPlayers[1]
        }
      } else {
        // Not enough space for smart placement, place sequentially
        teamPlayers.forEach(p => {
          if (seedIndex < bracketSize) {
            seeds[seedIndex++] = p
          }
        })
      }
    } else {
      // For 3+ players or small brackets, try to spread them out
      const spacing = Math.max(1, Math.floor(bracketSize / teamPlayers.length))
      teamPlayers.forEach((p, idx) => {
        let targetIndex = seedIndex + (idx * spacing)
        // Find next available slot
        while (targetIndex < bracketSize && seeds[targetIndex] !== null) {
          targetIndex++
        }
        if (targetIndex < bracketSize) {
          seeds[targetIndex] = p
        } else if (seedIndex < bracketSize) {
          seeds[seedIndex++] = p
        }
      })
      seedIndex = seeds.findIndex((s, i) => i > seedIndex && s === null)
      if (seedIndex === -1) seedIndex = bracketSize
    }
  })

  console.log('Seeding complete:', {
    totalSeeds: seeds.filter(s => s !== null).length,
    byes: seeds.filter(s => s === null).length
  })
  // 4. Generate Matches
  const matches: MatchInsert[] = []

  // Helper to generate matches for a round
  // We need to generate all matches for the bracket structure, even future ones?
  // Yes, to link them via `next_match_id`.

  // We'll generate from Final backwards to Round 1?
  // Or Round 1 to Final?
  // If we go Round 1 to Final, we don't know next_match_id yet.
  // So we should generate Final first (Round N), then Semis (Round N-1), etc.

  // Round 1 is the first round played.
  // Round `totalRounds` is the Final.

  // Let's store matches by round and match number to link them.
  // Map<Round, Map<MatchNum, MatchId>>
  // Since we don't have IDs yet (DB generates them), we can use temporary IDs or just structure.
  // But we need to insert them into DB.
  // We can insert them in order: Final, then Semis (linking to Final), etc.
  // Wait, if we insert Final first, we have its ID.
  // Then Semis can reference Final ID as `next_match_id`.
  // Yes!

  // Match numbering:
  // Final: Round=totalRounds, Match=1.
  // Semis: Round=totalRounds-1, Matches=1,2.
  // ...
  // Round 1: Round=1, Matches=1..bracketSize/2.

  let nextRoundMatches: { matchNum: number, id: string }[] = []

  // We need to generate UUIDs client-side or use placeholders?
  // Supabase `insert` returns the created object with ID.
  // So we must insert sequentially.
  // But `generateBracket` function should just return the data structure?
  // If we return data, we can't link IDs unless we generate UUIDs here.
  // We can use `crypto.randomUUID()` (available in Node/Edge).

  // 5. Recursive BYE Advancement
  // Iterate from Round 2 upwards to propagate winners from BYEs
  // We use a while loop to ensure deep recursion (e.g. if a BYE advances to a spot that becomes another BYE)

  // Temporary storage for structural info
  const structuralInfo = new Map<string, { round: number, structuralMatchNum: number, match: MatchInsert }>()
  const generatedMatches: MatchInsert[] = []
  const matchMap = new Map<string, string>() // key: "round-matchNum", value: uuid
  let matchNumberOffset = 0;

  // First Pass: Generate Matches (Final down to Round 1)
  for (let round = totalRounds; round >= 1; round--) {
    const numMatches = Math.pow(2, totalRounds - round)

    for (let i = 1; i <= numMatches; i++) {
      const matchNum = startMatchNumber + (matchNumberOffset++)
      const structuralMatchNum = i
      const id = crypto.randomUUID()
      const key = `${round}-${structuralMatchNum}`
      matchMap.set(key, id)

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

      if (round === 1) {
        const p1Index = (structuralMatchNum - 1) * 2
        const p2Index = (structuralMatchNum - 1) * 2 + 1
        const p1 = seeds[p1Index]
        const p2 = seeds[p2Index]

        player1Id = p1 ? p1.player_id : null
        player2Id = p2 ? p2.player_id : null

        if (p1 && !p2) {
          status = 'completed'
          winnerId = p1.player_id
        } else if (!p1 && p2) {
          status = 'completed'
          winnerId = p2.player_id
        } else if (!p1 && !p2) {
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
        status,
        next_match_id: nextMatchId,
        court_number: null
      }

      generatedMatches.push(match)
      structuralInfo.set(key, { round, structuralMatchNum, match })
    }
  }

  // Second Pass: Propagate BYEs (Round 2 up to Final)
  // We loop until no more changes are made to handle deep recursion
  let changesMade = true
  while (changesMade) {
    changesMade = false

    for (let round = 2; round <= totalRounds; round++) {
      const numMatches = Math.pow(2, totalRounds - round)
      for (let i = 1; i <= numMatches; i++) {
        const key = `${round}-${i}`
        const info = structuralInfo.get(key)
        if (!info) continue

        const currentMatch = info.match

        // Skip if already completed (unless we need to update it? No, once completed/BYE it stays)
        // Wait, if it was completed as a BYE, we don't need to check again?
        // Actually, we might need to check if we can advance further if we are just filling slots.
        // But if status is 'completed' and winner_id is set, it's done.
        if (currentMatch.status === 'completed' && currentMatch.winner_id) continue

        // Find source matches from previous round
        const source1Key = `${round - 1}-${i * 2 - 1}`
        const source2Key = `${round - 1}-${i * 2}`

        const source1 = structuralInfo.get(source1Key)?.match
        const source2 = structuralInfo.get(source2Key)?.match

        // Propagate winners to slots
        let updated = false
        if (source1 && source1.status === 'completed' && source1.winner_id) {
          if (currentMatch.player1_id !== source1.winner_id) {
            currentMatch.player1_id = source1.winner_id
            updated = true
          }
        }

        if (source2 && source2.status === 'completed' && source2.winner_id) {
          if (currentMatch.player2_id !== source2.winner_id) {
            currentMatch.player2_id = source2.winner_id
            updated = true
          }
        }

        if (updated) changesMade = true

        // Check for BYE in this round
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

  console.log(`Generated ${generatedMatches.length} matches total`)
  return generatedMatches
}
