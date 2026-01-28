import { Match, MatchInsert } from '@/types/models'
import crypto from 'crypto'

interface Participant {
  id: string
  team_id: string
  player_id: string
  rank?: number
}

// ... (helpers unchanged) ...

// ============================================================================
// MAIN GENERATOR
// ============================================================================

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
 * World Taekwondo Standard Recursive Seeding (supports up to 512+)
 */
function generateSeedingOrder(size: number): number[] {
  if (size === 2) return [1, 2]

  const half = size / 2
  const sequence: number[] = []
  const halfSequence = generateSeedingOrder(half)

  halfSequence.forEach((seed) => {
    sequence.push(seed)
    sequence.push(size + 1 - seed)
  })

  return sequence
}

/**
 * Cryptographically secure array shuffle
 */
function secureShuffleArray<T>(array: T[]): void {
  // Use crypto for secure randomness if available, else standard (but Node has crypto)
  for (let i = array.length - 1; i > 0; i--) {
    const randomBuffer = crypto.randomBytes(4)
    const randomInt = randomBuffer.readUInt32BE(0)
    const j = randomInt % (i + 1);
    [array[i], array[j]] = [array[j], array[i]]
  }
}

/**
 * Conflict scoring function
 * Lower score is better.
 */
function calculateSwapScore(
  targetPos: number,
  candidatePos: number,
  targetSeed: number,
  candidateSeed: number
): number {
  const seedDiff = Math.abs(candidateSeed - targetSeed)
  const positionDistance = Math.abs(candidatePos - targetPos)

  // We want to minimize Seed Difference deviation (keep fair seeding)
  // But also maximize Position Distance? No, minimizing score implies we WANT
  // the candidate that is 'best'.
  // Actually, we want a candidate that is somewhat close in seed (fairness) 
  // but resolves the conflict.

  // The provided reference used: score = seedDiff - positionDistance * 0.1
  // This favors candidates that are further away in position but close in seed.
  return seedDiff - positionDistance * 0.1
}


/**
 * Assign participants to seeds minimizing team conflicts using Scored Optimization
 */
function assignParticipantsToSeeds(
  participants: Participant[],
  bracketSize: number
): (Participant | null)[] {

  // 1. Separate Seeded vs Unseeded
  // For now, we assume simple Rank 1..N input or shuffle if no rank.
  // Actually, let's treat input index as implicit rank for simplicity in this version,
  // but if we had real ranks, we'd sort.

  // Let's shuffle unseeded players first (if we consider them equal)
  // But here we rely on the input order being 'Ranked' or 'Random'.
  // We'll perform a crypto shuffle on the input if explicit 'rank' is missing?
  // No, let's assume caller handles pre-sort.

  const seedingOrder = generateSeedingOrder(bracketSize)
  const slots: (Participant | null)[] = new Array(bracketSize).fill(null)
  const seedToSlotMap = new Map<number, number>()
  seedingOrder.forEach((seed, index) => seedToSlotMap.set(seed, index))

  // Place players
  participants.forEach((p, index) => {
    const seedNum = index + 1
    const slotIndex = seedToSlotMap.get(seedNum)
    if (slotIndex !== undefined) {
      slots[slotIndex] = p
    }
  })

  // 2. Scored Conflict Optimization
  const maxConflictDepth = Math.log2(bracketSize) - 2

  // Loop a few times to resolve conflicts (Multi-pass)
  // Limited iterations to avoid infinite loops if unresolvable
  for (let pass = 0; pass < 3; pass++) {
    let resolvedAny = false

    const conflicts: { posA: number, posB: number, depth: number }[] = []

    // Detect Conflicts
    for (let i = 0; i < bracketSize; i++) {
      if (!slots[i]) continue
      for (let j = i + 1; j < bracketSize; j++) {
        if (!slots[j]) continue
        if (slots[i]!.team_id === slots[j]!.team_id) {
          // Check depth
          let a = i, b = j
          let depth = 1
          while (Math.floor(a / 2) !== Math.floor(b / 2)) {
            a = Math.floor(a / 2)
            b = Math.floor(b / 2)
            depth++
          }
          // R1 (depth=1) or R2 (depth=2) are critical to avoid
          if (depth <= 2) {
            conflicts.push({ posA: i, posB: j, depth })
          }
        }
      }
    }

    // Sort conflicts by severity (Depth 1 is worst)
    conflicts.sort((a, b) => a.depth - b.depth)

    // Attempt to Resolve
    for (const { posA, posB } of conflicts) {
      // Re-check if valid (might have been moved by previous iteration in this loop)
      if (slots[posA]?.team_id !== slots[posB]?.team_id) continue

      const targetPos = posB
      const target = slots[targetPos]!
      const targetSeed = participants.findIndex(p => p.id === target.id) + 1

      let bestCandidatePos = -1
      let bestScore = Infinity

      // Scan ALL slots for a candidate
      for (let k = 0; k < bracketSize; k++) {
        if (k === posA || k === posB) continue
        if (!slots[k]) continue // Can swap with empty? Maybe, but complicates structure. Stick to players.

        const candidate = slots[k]!

        // 1. Must NOT be same team as Target (that we are moving)
        if (candidate.team_id === target.team_id) continue

        // 2. Must NOT be same team as the Opponent of the New Position (posA)
        // If we move Candidate to posB, they face posA.
        // Wait, posA is the one we clashed with. We are moving posB away.
        // So Candidate moves to posB. Target moves to k.

        // Constraint: Candidate at posB must not clash with posA
        if (candidate.team_id === slots[posA]!.team_id) continue

        // Constraint: Target at k must not clash with k's neighbor
        // Who is k's neighbor?
        const kNeighbor = (k % 2 === 0) ? k + 1 : k - 1
        if (slots[kNeighbor] && slots[kNeighbor]!.team_id === target.team_id) continue

        // Score the move
        const candidateSeed = participants.findIndex(p => p.id === candidate.id) + 1

        // Relax deviation for small brackets? 
        // If bracketSize is small, deviation > 6 is impossible.
        // Let's make deviation relative to size.
        const maxDev = Math.max(bracketSize * 0.5, 4)
        if (Math.abs(candidateSeed - targetSeed) > maxDev) continue

        const score = calculateSwapScore(targetPos, k, targetSeed, candidateSeed)

        if (score < bestScore) {
          bestScore = score
          bestCandidatePos = k
        }
      }

      if (bestCandidatePos !== -1) {
        // Swap
        const temp = slots[targetPos]
        slots[targetPos] = slots[bestCandidatePos]
        slots[bestCandidatePos] = temp
        resolvedAny = true
      }
    }

    if (!resolvedAny) break
  }

  return slots
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateBracket(
  tournamentId: string,
  participants: Participant[],
  startMatchNumber: number = 1
): Match[] {
  console.log('generateBracket (WT-Engine) called with', participants.length, 'participants')

  if (participants.length < 1) {
    throw new Error('At least 1 participant is required to generate a bracket')
  }

  // 1. Single Participant Auto-Win
  if (participants.length === 1) {
    return [{
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: 1,
      match_number: 0,
      player1_id: participants[0].player_id,
      player2_id: null,
      winner_id: participants[0].player_id,
      status: 'completed',
      lifecycle_state: 'AUTO_ADVANCE',
      division_id: undefined, category_id: undefined,
      // ...boilerplate
      score_player1: 0, score_player2: 0,
      score_round1_player1: 0, score_round1_player2: 0,
      score_round2_player1: 0, score_round2_player2: 0,
      score_round3_player1: 0, score_round3_player2: 0,
      winner_round1: null, winner_round2: null, winner_round3: null,
      source_match_ids: [],
      next_match_id: null, source_match_id: null,
      court_number: null,
      scheduled_start_time: null, scheduled_end_time: null,
      actual_start_time: null, actual_end_time: null,
      match_number_formatted: null, match_number_legacy: null,
      day_number: null, match_sequence: null,
      athlete1_available_at: null, athlete2_available_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  }

  // 2. Sizing
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const totalRounds = Math.log2(bracketSize)

  // 3. Placement (WT Seeding + Scored Optimization)
  const slots = assignParticipantsToSeeds(participants, bracketSize)

  // 4. Build Matches
  const matches: any[] = []
  const matchIdMap = new Map<string, string>()
  const getMatchId = (r: number, m: number) => {
    const key = `${r}-${m}`
    if (!matchIdMap.has(key)) matchIdMap.set(key, crypto.randomUUID())
    return matchIdMap.get(key)!
  }

  // Round 2 Inputs Map (Promoted Players vs Match Winners)
  const round2Inputs = new Map<number, { type: 'player' | 'match', id: string }>()

  // == PHASE A: Round 1 (Promoted Placement) ==
  const r1MatchCount = bracketSize / 2
  for (let i = 0; i < r1MatchCount; i++) {
    const slotA = slots[i * 2]
    const slotB = slots[i * 2 + 1]
    const structuralMatchNum = i + 1

    if (slotA && slotB) {
      // Create Match
      const matchId = getMatchId(1, structuralMatchNum)
      matches.push({
        id: matchId,
        tournament_id: tournamentId,
        round: 1,
        match_number: 0,
        player1_id: slotA.player_id,
        player2_id: slotB.player_id,
        winner_id: null,
        status: 'scheduled',
        lifecycle_state: 'WAITING',
        // ...boilerplate
        score_player1: 0, score_player2: 0,
        score_round1_player1: 0, score_round1_player2: 0,
        score_round2_player1: 0, score_round2_player2: 0,
        score_round3_player1: 0, score_round3_player2: 0,
        winner_round1: null, winner_round2: null, winner_round3: null,
        source_match_ids: [],
        next_match_id: null, source_match_id: null,
        court_number: null,
        scheduled_start_time: null, scheduled_end_time: null,
        actual_start_time: null, actual_end_time: null,
        match_number_formatted: null, match_number_legacy: null,
        day_number: null, match_sequence: null,
        division_id: undefined, category_id: undefined,
        athlete1_available_at: null, athlete2_available_at: null
      })
      round2Inputs.set(structuralMatchNum, { type: 'match', id: matchId })
    } else {
      // Bye Promotion
      const p = slotA || slotB
      if (p) round2Inputs.set(structuralMatchNum, { type: 'player', id: p.player_id })
    }
  }

  // == PHASE B: Upper Rounds ==
  for (let r = 2; r <= totalRounds; r++) {
    const matchCount = Math.pow(2, totalRounds - r)
    for (let m = 1; m <= matchCount; m++) {
      const matchId = getMatchId(r, m)
      const sourceIndexA = m * 2 - 1
      const sourceIndexB = m * 2

      let p1Id = null
      let p2Id = null
      let sourceMatches: string[] = []

      if (r === 2) {
        const inpA = round2Inputs.get(sourceIndexA)
        const inpB = round2Inputs.get(sourceIndexB)
        if (inpA?.type === 'player') p1Id = inpA.id
        if (inpA?.type === 'match') sourceMatches.push(inpA.id)
        if (inpB?.type === 'player') p2Id = inpB.id
        if (inpB?.type === 'match') sourceMatches.push(inpB.id)
      } else {
        sourceMatches.push(getMatchId(r - 1, sourceIndexA))
        sourceMatches.push(getMatchId(r - 1, sourceIndexB))
      }

      matches.push({
        id: matchId,
        tournament_id: tournamentId,
        round: r,
        match_number: 0,
        player1_id: p1Id,
        player2_id: p2Id,
        winner_id: null,
        status: 'scheduled',
        lifecycle_state: 'WAITING',
        source_match_ids: sourceMatches,
        // ...boilerplate
        score_player1: 0, score_player2: 0,
        score_round1_player1: 0, score_round1_player2: 0,
        score_round2_player1: 0, score_round2_player2: 0,
        score_round3_player1: 0, score_round3_player2: 0,
        winner_round1: null, winner_round2: null, winner_round3: null,
        next_match_id: null, source_match_id: null,
        court_number: null,
        scheduled_start_time: null, scheduled_end_time: null,
        actual_start_time: null, actual_end_time: null,
        match_number_formatted: null, match_number_legacy: null,
        day_number: null, match_sequence: null,
        division_id: undefined, category_id: undefined,
        athlete1_available_at: null, athlete2_available_at: null
      })
    }
  }

  // == PHASE C: Link Next Match IDs ==
  for (const [key, id] of matchIdMap.entries()) {
    const [rStr, mStr] = key.split('-')
    const r = parseInt(rStr)
    const m = parseInt(mStr)

    if (r < totalRounds) {
      const nextKey = `${r + 1}-${Math.ceil(m / 2)}`
      const nextId = matchIdMap.get(nextKey)
      if (nextId) {
        const match = matches.find(mat => mat.id === id)
        if (match) match.next_match_id = nextId
      }
    }
  }

  return matches as Match[]
}
