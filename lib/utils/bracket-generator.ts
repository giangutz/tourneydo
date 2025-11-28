import { MatchInsert } from '@/types/models'

interface Participant {
  id: string
  team_id: string
  player_id: string
}

/**
 * Generate a single elimination bracket
 */
export function generateBracket(
  tournamentId: string,
  participants: Participant[]
): MatchInsert[] {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are required to generate a bracket')
  }

  // 1. Calculate bracket size (power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const totalRounds = Math.log2(bracketSize)
  const byesCount = bracketSize - participants.length

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

  // Let's create an array of size `bracketSize`.
  // Fill it with participants and nulls (BYEs).
  const seeds = new Array(bracketSize).fill(null)

  // Simple fill for now:
  // 1, 2, 3, 4, 5...
  // But we should try to separate teams.

  // Optimization: Try to place teammates far apart.
  // For now, let's just fill sequentially.
  for (let i = 0; i < participants.length; i++) {
    seeds[i] = participants[i]
  }

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

  const generatedMatches: MatchInsert[] = []
  const matchMap = new Map<string, string>() // key: "round-matchNum", value: uuid

  // We iterate from Final (Round = totalRounds) down to Round 1.
  for (let round = totalRounds; round >= 1; round--) {
    const numMatches = Math.pow(2, totalRounds - round)

    for (let matchNum = 1; matchNum <= numMatches; matchNum++) {
      const id = crypto.randomUUID()
      const key = `${round}-${matchNum}`
      matchMap.set(key, id)

      // Determine next match ID
      let nextMatchId: string | null = null
      if (round < totalRounds) {
        const nextRound = round + 1
        const nextMatchNum = Math.ceil(matchNum / 2)
        nextMatchId = matchMap.get(`${nextRound}-${nextMatchNum}`) || null
      }

      // Determine players for Round 1
      let player1Id: string | null = null
      let player2Id: string | null = null
      let status: 'scheduled' | 'completed' | 'in_progress' = 'scheduled'
      let winnerId: string | null = null

      if (round === 1) {
        // In Round 1, we assign participants from `seeds`.
        // Match 1: Seed 1 vs Seed N
        // Match 2: Seed 2 vs Seed N-1 ... NO, that's not how brackets work.
        // Standard bracket pairing: 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6.
        // There is a specific algorithm for this.
        // For simplicity, let's just take adjacent seeds: 1 vs 2, 3 vs 4.
        // This is "random draw" style if we shuffled.

        const p1Index = (matchNum - 1) * 2
        const p2Index = (matchNum - 1) * 2 + 1

        const p1 = seeds[p1Index]
        const p2 = seeds[p2Index]

        player1Id = p1 ? p1.player_id : null
        player2Id = p2 ? p2.player_id : null

        // Handle BYEs
        if (p1 && !p2) {
          // P1 gets a BYE
          status = 'completed'
          winnerId = p1.player_id
        } else if (!p1 && p2) {
          // Should not happen with sequential fill
          status = 'completed'
          winnerId = p2.player_id
        } else if (!p1 && !p2) {
          // Double BYE?
          status = 'completed'
          winnerId = null
        }
      }

      generatedMatches.push({
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
        next_match_id: nextMatchId
      })
    }
  }

  return generatedMatches
}
