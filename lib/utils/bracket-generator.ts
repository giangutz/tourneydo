import { Match, MatchInsert } from '@/types/models'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

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

// ============================================================================
// ROUND HIERARCHY HELPERS
// ============================================================================

interface RoundInfo {
  localRound: number
  globalOrder: number
  name: string
  abbrev: string
  participants: number
  matchCount: number
}

function getGlobalRoundOrder(bracketSize: number): number {
  switch (bracketSize) {
    case 256: return 1
    case 128: return 2
    case 64: return 3
    case 32: return 4
    case 16: return 5
    case 8: return 6
    case 4: return 7
    case 2: return 8
    default: return 1
  }
}

function getRoundName(participants: number): string {
  switch (participants) {
    case 256: return 'Round of 256'
    case 128: return 'Round of 128'
    case 64: return 'Round of 64'
    case 32: return 'Round of 32'
    case 16: return 'Round of 16'
    case 8: return 'Quarter-finals'
    case 4: return 'Semi-finals'
    case 2: return 'Finals'
    default: return `Round of ${participants}`
  }
}

function getRoundAbbreviation(participants: number): string {
  switch (participants) {
    case 256: return 'R256'
    case 128: return 'R128'
    case 64: return 'R64'
    case 32: return 'R32'
    case 16: return 'R16'
    case 8: return 'QF'
    case 4: return 'SF'
    case 2: return 'F'
    default: return `R${participants}`
  }
}

// Keep legacy for backward compatibility if needed, but implementation updated
export function getBracketRoundLabel(
  currentRound: number,
  totalRounds: number
): string {
  const roundsFromEnd = totalRounds - currentRound + 1
  const participants = Math.pow(2, roundsFromEnd)
  return getRoundName(participants)
}

function calculateRoundStructure(bracketSize: number): RoundInfo[] {
  const rounds: RoundInfo[] = []
  let currentParticipants = bracketSize
  let roundOrder = 1

  // Calculate specific global start order based on bracket size
  // e.g. Size 16 (Ro16) -> Global 3
  const startGlobal = getGlobalRoundOrder(bracketSize)

  const totalRounds = Math.log2(bracketSize)

  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      localRound: r,
      globalOrder: startGlobal + r - 1,
      name: getRoundName(currentParticipants),
      abbrev: getRoundAbbreviation(currentParticipants),
      participants: currentParticipants,
      matchCount: currentParticipants / 2
    })
    currentParticipants /= 2
  }

  return rounds
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

  // Count any remaining team conflicts for logging
  let remaining = 0
  for (let i = 0; i < bracketSize; i++) {
    if (!slots[i]) continue
    for (let j = i + 1; j < bracketSize; j++) {
      if (!slots[j]) continue
      if (slots[i]!.team_id === slots[j]!.team_id) {
        let a = i, b = j, depth = 1
        while (Math.floor(a / 2) !== Math.floor(b / 2)) { a = Math.floor(a / 2); b = Math.floor(b / 2); depth++ }
        if (depth <= 2) remaining++
      }
    }
  }
  if (remaining > 0) {
    logger.warn({ remaining }, 'Bracket generation: same-team conflicts could not be fully resolved')
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
  if (participants.length < 1) {
    throw new Error('At least 1 participant is required to generate a bracket')
  }

  // 1. Single Participant Auto-Win
  if (participants.length === 1) {
    return [{
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round: 1,
      round_name: 'Finals',
      round_order: 6,
      bracket_position: 'F-1',
      structural_match_number: 101, // Round 1 Matches 1
      match_number: 0,
      player1_id: participants[0].player_id,
      player2_id: null,
      winner_id: participants[0].player_id,
      status: 'completed',
      lifecycle_state: 'AUTO_ADVANCE',
      division_id: undefined, category_id: undefined,
      source_match_ids: [],
      next_match_id: null, source_match_id: null,
      court_number: null,
      scheduled_start_time: null, scheduled_end_time: null,
      actual_start_time: null, actual_end_time: null,
      match_number_formatted: null, match_number_legacy: null,
      day_number: null, match_sequence: null,
      athlete1_available_at: null, athlete2_available_at: null,
      win_method: null,
      winning_round: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]
  }

  // 2. Sizing & Structure
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(participants.length)))
  const totalRounds = Math.log2(bracketSize)
  const roundStructure = calculateRoundStructure(bracketSize)

  // 3. Placement (WT Seeding + Scored Optimization)
  const slots = assignParticipantsToSeeds(participants, bracketSize)

  // 4. Build Matches
  const matches: Partial<Match>[] = []
  const matchIdMap = new Map<string, string>()
  const getMatchId = (r: number, m: number) => {
    const key = `${r}-${m}`
    if (!matchIdMap.has(key)) matchIdMap.set(key, crypto.randomUUID())
    return matchIdMap.get(key)!
  }

  // Round 2 Inputs Map (Promoted Players vs Match Winners)
  const round2Inputs = new Map<number, { type: 'player' | 'match', id: string }>()

  // == PHASE A: Round 1 (Promoted Placement) ==
  // Matches created here are the "Opening Round" matches
  const r1Info = roundStructure[0] // First round in structure
  const r1MatchCount = bracketSize / 2

  for (let i = 0; i < r1MatchCount; i++) {
    const slotA = slots[i * 2]
    const slotB = slots[i * 2 + 1]
    const structuralMatchNum = i + 1 // 1..N

    if (slotA && slotB) {
      // Create Match
      const matchId = getMatchId(1, structuralMatchNum)
      const structuralNumFull = 100 + structuralMatchNum

      matches.push({
        id: matchId,
        tournament_id: tournamentId,
        round: 1,
        match_number: 0,

        // NEW METADATA
        round_name: r1Info.name,
        round_order: r1Info.globalOrder,
        bracket_position: `${r1Info.abbrev}-${structuralMatchNum}`,
        structural_match_number: structuralNumFull,

        player1_id: slotA.player_id,
        player2_id: slotB.player_id,
        winner_id: null,
        status: 'scheduled', // Use scheduled/pending based on readiness? Actually contest logic handles this
        lifecycle_state: 'CONTEST', // Both players known

        source_match_ids: [],
        next_match_id: null, source_match_id: null,
        court_number: null,
        scheduled_start_time: null, scheduled_end_time: null,
        actual_start_time: null, actual_end_time: null,
        match_number_formatted: null, match_number_legacy: null,
        day_number: null, match_sequence: null,
        division_id: undefined, category_id: undefined,
        athlete1_available_at: null, athlete2_available_at: null,
        win_method: null,
        winning_round: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    const roundInfo = roundStructure[r - 1]
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

      // Determine Lifecycle
      const isReady = p1Id && p2Id
      const lifecycle = isReady ? 'CONTEST' : 'WAITING'
      const status = isReady ? 'scheduled' : 'scheduled' // 'pending' might be better but DB constraint?
      // Actually DB status is 'scheduled' | 'in_progress' | 'completed'.
      // 'pending' is NOT in the DB enum (MatchStatus).
      // Wait, 'MatchStatus' in models.ts is 'scheduled' | 'in_progress' | 'completed'.
      // User requested "status: (p1Id && p2Id) ? 'contest' : 'pending'".
      // This implies User wants to CHANGE the MatchStatus type?
      // OR User considers 'scheduled' == 'pending'?
      // I should stick to DB enum 'scheduled' but rely on lifecycle_state 'WAITING'.

      const structuralNumFull = r * 100 + m

      matches.push({
        id: matchId,
        tournament_id: tournamentId,
        round: r,
        match_number: 0,

        // NEW METADATA
        round_name: roundInfo.name,
        round_order: roundInfo.globalOrder,
        bracket_position: `${roundInfo.abbrev}-${m}`,
        structural_match_number: structuralNumFull,

        player1_id: p1Id,
        player2_id: p2Id,
        winner_id: null,
        status: 'scheduled',
        lifecycle_state: lifecycle,
        source_match_ids: sourceMatches,

        next_match_id: null, source_match_id: null,
        court_number: null,
        scheduled_start_time: null, scheduled_end_time: null,
        actual_start_time: null, actual_end_time: null,
        match_number_formatted: null, match_number_legacy: null,
        day_number: null, match_sequence: null,
        division_id: undefined, category_id: undefined,
        athlete1_available_at: null, athlete2_available_at: null,
        win_method: null,
        winning_round: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

  // == PHASE D: Assign Visual Structural Numbers (DFS Level-by-Level) ==
  /**
   * Assigns structural_match_number based on visual bracket order.
   * Uses DFS to traverse from Finals to Round 1, then numbers matches
   * sequentially at each level (round) from top to bottom.
   */
  function assignVisualStructuralNumbers(matches: Partial<Match>[]): void {
    const matchMap = new Map(matches.map(m => [m.id, m]))

    // Group matches by round
    const matchesByRound = new Map<number, Partial<Match>[]>()
    matches.forEach(m => {
      const r = m.round!
      if (!matchesByRound.has(r)) {
        matchesByRound.set(r, [])
      }
      matchesByRound.get(r)!.push(m)
    })

    // Find Finals (matches with no next_match_id)
    const finals = matches.filter(m => !m.next_match_id)

    // Track vertical order within each round
    const verticalOrderByRound = new Map<number, Map<string, number>>()

    // Initialize order maps for each round
    for (let r = 1; r <= totalRounds; r++) {
      verticalOrderByRound.set(r, new Map<string, number>())
    }

    /**
     * DFS traversal to assign vertical order indices.
     * Visits children before parent (post-order) to ensure
     * top-to-bottom ordering at each level.
     */
    function visit(match: Partial<Match>, verticalIndex: number): number {
      const orderMap = verticalOrderByRound.get(match.round!)!

      // Get children from source_match_ids
      const children = (match.source_match_ids || [])
        .map((id: string) => matchMap.get(id))
        .filter((c): c is Partial<Match> => c !== undefined)

      if (children.length === 0) {
        // Leaf node - assign index
        if (!orderMap.has(match.id!)) {
          orderMap.set(match.id!, verticalIndex)
        }
        return verticalIndex + 1
      }

      // Visit children first (left to right = top to bottom)
      let currentIndex = verticalIndex
      for (const child of children) {
        currentIndex = visit(child, currentIndex)
      }

      // Assign index to this match after children
      if (!orderMap.has(match.id!)) {
        orderMap.set(match.id!, currentIndex)
      }

      return currentIndex + 1
    }

    // Start DFS from each final (should typically be just one)
    finals.forEach(final => visit(final, 0))

    // Now assign structural_match_number based on vertical order within each round
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatches = matchesByRound.get(r) || []
      const orderMap = verticalOrderByRound.get(r)!

      // Sort matches by their vertical order
      const sortedMatches = roundMatches
        .filter(m => orderMap.has(m.id!))
        .sort((a, b) => {
          const orderA = orderMap.get(a.id!)!
          const orderB = orderMap.get(b.id!)!
          return orderA - orderB
        })

      // Assign structural numbers sequentially (1, 2, 3, 4...)
      sortedMatches.forEach((match, idx) => {
        match.structural_match_number = (r * 100) + (idx + 1)
      })
    }
  }

  assignVisualStructuralNumbers(matches)

  // == FINAL VALIDATION ==
  validateSingleEliminationBracket(matches, participants.length)

  return matches as Match[]
}

/**
 * Validates that the generated bracket meets strictly Single Elimination invariants.
 * Rule 1: Total Matches = N - 1 (for N > 1).
 * Rule 2: No duplicate Match IDs.
 * Rule 3: No duplicate Structural Numbers within a round.
 */
function validateSingleEliminationBracket(matches: Partial<Match>[], participantCount: number) {
  // 1. Count Check
  // N=1 -> 1 Match (Auto Advance)
  // N>1 -> N-1 Matches (e.g. 8 players = 7 matches: 4 QF, 2 SF, 1 F)
  const expectedMatches = participantCount > 1 ? participantCount - 1 : 1

  if (matches.length !== expectedMatches) {
    const errorMsg = `[BracketValidation] Match Count Mismatch! Expected ${expectedMatches} matches for ${participantCount} participants, but generated ${matches.length}.`
    logger.error({ error: errorMsg }, 'Unexpected error')
    // We throw to prevent bad data from being saved
    throw new Error(errorMsg)
  }

  // 2. Duplicate ID Check
  const ids = new Set<string>()
  matches.forEach(m => {
    if (ids.has(m.id!)) {
      throw new Error(`[BracketValidation] Duplicate Match ID detected: ${m.id}`)
    }
    ids.add(m.id!)
  })

  // 3. Structural Number Check
  const structuralNums = new Set<number>()
  matches.forEach(m => {
    if (structuralNums.has(m.structural_match_number!)) {
      throw new Error(`[BracketValidation] Duplicate Structural Match Number: ${m.structural_match_number}`)
    }
    structuralNums.add(m.structural_match_number!)
  })

  // 4. Bye Verification (Log only as Byes are implicit)
  // Formula: Byes = (Next Power of 2) - N
  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(participantCount)))
  const expectedByes = nextPow2 - participantCount

}
