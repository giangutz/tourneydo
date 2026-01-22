import {
  MatchAssignment,
  TournamentScheduleConfig,
  DivisionScheduleConfig,
  ScheduleValidationResult,
  ScheduleValidationError,
  CourtUtilization,
  Match
} from '@/types/models'

// ============================================================================
// Internal Types
// ============================================================================

interface SchedulerMatch extends Omit<Match, 'created_at' | 'updated_at' | 'status'> {
  status?: string | null
  id: string
  divisionId: string
  categoryId: string
  round: number
  winner_id: string | null
  duration: number
  beltPriority: number
  // Helpers for grouping
  groupId: string        // Atomic Block ID (e.g. Div-Cat-Weight)
  blockSetId: string     // Higher Level Group (Div-Cat) - used for day-spanning logic if needed
  sourceIndex: number    // Original Index in input array (Preserve Bracket Order)
}

interface GroupBlock {
  id: string
  blockSetId: string
  matches: SchedulerMatch[]
  totalMinutes: number
  bracketSize: number
  // Priority Factors
  beltPriority: number
  maxRound: number
  urgencyScore: number // (roundDepth * maxRound) + (remainingMatches * duration)
}

interface AssignedBlock {
  block: GroupBlock
  dayIndex: number
}

export interface ScheduleInput {
  tournamentConfig: TournamentScheduleConfig
  divisionConfigs: DivisionScheduleConfig[]
  matches: Array<{
    id: string
    divisionId: string
    categoryId: string
    round: number
    status?: string | null
    winner_id?: string | null
    belt_level?: string
    division_name?: string
    category_name?: string
    gender?: string
    match_number?: number  // Structural Match Number from Bracket Gen
  }>
  startDate: Date
  endDate: Date
  // Override / Constraints
  forceLunchBreak?: boolean // default true
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const BELT_PRIORITY: Record<string, number> = {
  'beginner': 10,
  'novice1': 20, // Check for variations like "Novice I" in normalizeBelt
  'novice2': 30,
  'advanced': 40
}

function normalizeBelt(belt: string = ''): number {
  const b = belt.toLowerCase()
  if (b.includes('white') || b.includes('beginner')) return 10
  if (b.includes('yellow') || b.includes('blue') || b.includes('novice i') || b.includes('novice 1')) return 20
  if (b.includes('red') || b.includes('brown') || b.includes('novice ii') || b.includes('novice 2')) return 30
  if (b.includes('black') || b.includes('poom') || b.includes('dan') || b.includes('advanced')) return 40
  return 99
}

function calculateMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  return (endHour * 60 + endMin) - (startHour * 60 + startMin)
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hour, min] = time.split(':').map(Number)
  const totalMinutes = hour * 60 + min + minutes
  const newHour = Math.floor(totalMinutes / 60)
  const newMin = totalMinutes % 60
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`
}

function formatTimeAMPM(time: string): string {
  const [hour, min] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hour, min)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ============================================================================
// Phase A: Scheduling Engine
// ============================================================================

export function calculateSchedule(input: ScheduleInput, strict: boolean): {
  assignments: MatchAssignment[],
  overflow: { count: number, minutes: number },
  dayStats: Map<number, number>
} {
  const { tournamentConfig, matches, startDate, endDate } = input

  // 0. Setup Context
  const dailyMinutes = calculateMinutes(tournamentConfig.daily_start_time, tournamentConfig.daily_end_time)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const totalDailyCapacity = dailyMinutes * tournamentConfig.courts

  // 1. Enrich Matches & Filter Valid
  const validMatches: SchedulerMatch[] = matches
    .filter(m => m.status !== 'completed' && m.winner_id === null)
    .map((m, idx) => {
      const divConfig = input.divisionConfigs.find(d => d.division_id === m.divisionId)
      const duration = divConfig?.avg_match_duration || tournamentConfig.default_sparring_duration || 10

      const distinctGroupId = `${m.divisionId}-${m.categoryId}`
      const blockSetId = m.divisionId // Or Division+Belt+Gender+Age

      // return enriched object
      // We must satisfy SchedulerMatch which extends Match
      // We cast to any to bypass the huge list of Match properties (created_at etc) that we simulated
      return {
        ...m,
        duration,
        beltPriority: normalizeBelt(m.belt_level),
        groupId: distinctGroupId,
        blockSetId,
        sourceIndex: idx, // Capture original order for stable sort
        winner_id: m.winner_id || null, // Ensure type compatibility
        // Mock missing fields for strict typing if necessary, or cast as any downstream
        tournament_id: 'temp',
        match_number: m.match_number || 0,
        ageGroup: 'temp',
        weightGroup: 'temp'
      } as unknown as SchedulerMatch
    })

  // 2. Phase A1: Block Formation
  const blocksMap = new Map<string, GroupBlock>()

  for (const m of validMatches) {
    if (!blocksMap.has(m.groupId)) {
      blocksMap.set(m.groupId, {
        id: m.groupId,
        blockSetId: m.blockSetId,
        matches: [],
        totalMinutes: 0,
        bracketSize: 0,
        beltPriority: m.beltPriority,
        maxRound: 0,
        urgencyScore: 0
      })
    }
    const block = blocksMap.get(m.groupId)!
    block.matches.push(m)
    block.totalMinutes += m.duration
    block.maxRound = Math.max(block.maxRound, m.round)
  }

  // Finalize Block Metrics
  const ROUND_DEPTH_WEIGHT = 1.5 // Multiplier for round depth urgency

  for (const block of blocksMap.values()) {
    block.bracketSize = block.matches.length
    // Add overhead estimate for bin packing (2m per match)
    block.totalMinutes += (block.matches.length * 2)

    // Calculate Urgency Score
    // (depth * W) + (remainingMinutes)
    // Higher score = More urgent (schedule earlier)
    const remainingMinutes = block.matches.length * 10 // approx duration
    block.urgencyScore = (block.maxRound * 100 * ROUND_DEPTH_WEIGHT) + remainingMinutes
  }

  // 3. Phase A2: Global Priority Ordering (Two-Level Sort)

  // 3a. Group Atomic Blocks into BlockSets
  const blockSets = new Map<string, {
    id: string
    blocks: GroupBlock[]
    maxUrgency: number
    beltPriority: number
    totalMinutes: number
  }>()

  for (const block of blocksMap.values()) {
    if (!blockSets.has(block.blockSetId)) {
      blockSets.set(block.blockSetId, {
        id: block.blockSetId,
        blocks: [],
        maxUrgency: 0,
        beltPriority: block.beltPriority, // Assume consistency within set
        totalMinutes: 0
      })
    }
    const set = blockSets.get(block.blockSetId)!
    set.blocks.push(block)
    set.maxUrgency = Math.max(set.maxUrgency, block.urgencyScore)
    set.totalMinutes += block.totalMinutes
  }

  // 3b. Sort BlockSets
  const sortedSets = Array.from(blockSets.values()).sort((setA, setB) => {
    // 1. Belt Priority (Ascending) - STRICT First Sort Key
    // User Requirement: "Advanced cannot be earlier than Novice".
    if (setA.beltPriority !== setB.beltPriority) return setA.beltPriority - setB.beltPriority

    // 2. Max Urgency (Descending)
    return setB.maxUrgency - setA.maxUrgency
  })

  // 3c. Flatten to Sorted Blocks (Intra-Set Sort)
  const sortedBlocks: GroupBlock[] = []

  for (const set of sortedSets) {
    // Sort blocks WITHIN the set
    set.blocks.sort((a, b) => {
      // 1. Urgency (Descending)
      if (Math.abs(a.urgencyScore - b.urgencyScore) > 50) return b.urgencyScore - a.urgencyScore
      // 2. Bracket Size (Descending)
      return b.bracketSize - a.bracketSize
    })
    sortedBlocks.push(...set.blocks)
  }

  // 4. Phase A3: Day Assignment (Bin Packing)
  const dayLoads = new Map<number, number>() // Day Index -> Minutes Used
  const blockAssignments: AssignedBlock[] = []

  // Initialize days
  for (let d = 0; d < totalDays + 5; d++) { // Allow overflow days
    dayLoads.set(d, 0)
  }

  const overflow: { count: number, minutes: number } = { count: 0, minutes: 0 }

  for (const block of sortedBlocks) {
    let assignedDay = -1

    // Try to fit in existing days
    for (let d = 0; d < totalDays; d++) {
      const currentLoad = dayLoads.get(d) || 0
      // Check if fits
      if (currentLoad + block.totalMinutes <= totalDailyCapacity) {
        assignedDay = d
        dayLoads.set(d, currentLoad + block.totalMinutes)
        break
      }
    }

    // Strict Mode: If it doesn't fit in valid days, it's overflow
    if (assignedDay === -1) {
      if (strict) {
        // Just put it in overflow list, don't schedule
        overflow.count++
        overflow.minutes += block.totalMinutes
        continue
      } else {
        // Loose Mode: Put in next available overflow day
        let d = totalDays
        while (true) {
          const currentLoad = dayLoads.get(d) || 0
          if (currentLoad + block.totalMinutes <= totalDailyCapacity) {
            assignedDay = d
            dayLoads.set(d, currentLoad + block.totalMinutes)
            break
          }
          d++
          // Safety break
          if (d > totalDays + 10) break
        }
      }
    }

    if (assignedDay !== -1) {
      blockAssignments.push({ block, dayIndex: assignedDay })
    }
  }

  // 5. Phase A4: Intra-Day Sequencing & Court Assignment
  // We process each day independently
  const finalAssignments: MatchAssignment[] = []
  const dayStats = new Map<number, number>()

  // Group assignments by day
  const assignmentsByDay = new Map<number, AssignedBlock[]>()
  for (const ba of blockAssignments) {
    if (!assignmentsByDay.has(ba.dayIndex)) assignmentsByDay.set(ba.dayIndex, [])
    assignmentsByDay.get(ba.dayIndex)!.push(ba)
  }

  // Lunch Break Constants (12:00 - 13:00)
  // We need to know start time. Assume daily_start_time is standardized (e.g. 09:00).
  const tournamentStartMin = 0 // Relative to daily_start_time
  // Calculate relative Minutes for Lunch
  const [startH, startM] = tournamentConfig.daily_start_time.split(':').map(Number)
  const startTimeInDayMins = startH * 60 + startM
  const lunchStartAbs = 12 * 60 // 12:00 PM
  const lunchEndAbs = 13 * 60   // 1:00 PM

  // Relative to tournament start
  const lunchStartRel = Math.max(0, lunchStartAbs - startTimeInDayMins)
  const lunchEndRel = Math.max(0, lunchEndAbs - startTimeInDayMins)
  const hasLunch = input.forceLunchBreak !== false && lunchEndRel > lunchStartRel

  // Process each day
  for (const [dayIdx, dayBlocks] of assignmentsByDay.entries()) {
    const actualDay = dayIdx + 1

    // Collect all matches for this day
    let dayMatches: SchedulerMatch[] = []
    for (const b of dayBlocks) {
      dayMatches.push(...b.block.matches)
    }

    // Court Simulation state
    const courtTimers = Array(tournamentConfig.courts).fill(0).map((_, idx) => ({
      id: idx + 1,
      currentMinutes: 0
    }))

    // Predictive Availability Map: AthleteID -> Available Minute (Relative)
    const athleteAvailability = new Map<string, number>()
    const minRecoveryMinutes = 15

    // Round Gate Tracking: GroupID -> Round -> Count Completed
    // We need to know total matches per round to enforce gates
    // Simple Gate: R32 needs 50% R64.
    // Logic: We simply deprioritize or block matches if gate not met.
    // Better: Just use availability. If Round 1 match finishes, winner advances.
    // The scheduler input has 'round'. We assume structure is valid.
    // Dependency: A Round 2 match involving Winner(M1) cannot start until M1 is done.
    // BUT we don't know who winner is! We only schedule placeholders.
    // Ah, Upgrade B says: "all athletes.nextAvailableTime <= proposedStartTime".
    // For TBD matches (future rounds), we don't have athletes yet strictly.
    // However, the *structure* dictates dependency.
    // We can infer dependency: A Round 2 match depends on 2 matches in R1.
    // We roughly know R2 should verify R1 completion.
    // Simplified Gate: "Are there pending matches in Round X-1 for this block?"
    // If yes, prefer Round X-1.

    // Sort matches for the "Ready Queue" priority
    // 1. Round (Earlier rounds first: R64 -> R32)
    dayMatches.sort((a, b) => {
      // Round order descending (assuming R64 > R32 in number? specific logic needed)
      if (a.round !== b.round) return a.round - b.round

      // Block Priority (Belt)
      const blockA = blocksMap.get(a.groupId)!
      const blockB = blocksMap.get(b.groupId)!

      // STRICT Belt Order first (Avoid interleaving Novice and Advanced)
      if (blockA.beltPriority !== blockB.beltPriority) return blockA.beltPriority - blockB.beltPriority

      // Urgency (tiebreaker for same belt)
      if (Math.abs(blockA.urgencyScore - blockB.urgencyScore) > 100) {
        return blockB.urgencyScore - blockA.urgencyScore
      }

      // Block ID Grouping (Avoid interleaving equals)
      if (a.groupId !== b.groupId) {
        return a.groupId.localeCompare(b.groupId)
      }

      // Final Tiebreaker: Bracket Structure (Source Index)
      return a.sourceIndex - b.sourceIndex
    })

    const pendingMatches = [...dayMatches]
    const scheduledDayMatches: any[] = []

    // Simulation Loop
    // We iterate until all matches scheduled.
    // In each step, we look for the *Earliest Available Court*.
    // We then find the *Best Match* for that court/time.

    while (pendingMatches.length > 0) {
      // 1. Find court with lowest time
      courtTimers.sort((a, b) => a.currentMinutes - b.currentMinutes)
      const bestCourt = courtTimers[0]
      let currentTime = bestCourt.currentMinutes

      // 2. Enforce Lunch Break
      if (hasLunch) {
        // If match starts before lunch but ends inside/after, Push to Lunch End.
        // Actually simplest: If currentTime is inside lunch, or close enough that match won't fit?
        // Let's just say: If currentTime < LunchEnd and (currentTime >= LunchStart OR (currentTime + minMatchDuration > LunchStart))
        // We hard pad.
        if (currentTime >= lunchStartRel && currentTime < lunchEndRel) {
          bestCourt.currentMinutes = lunchEndRel
          currentTime = lunchEndRel
        }
      }

      let matchFoundIndex = -1

      // 3. Find Candidate
      for (let i = 0; i < pendingMatches.length; i++) {
        const m = pendingMatches[i]

        // Lunch Check for specific match duration
        if (hasLunch) {
          if (currentTime < lunchStartRel && (currentTime + m.duration) > lunchStartRel) {
            // Cannot start now, would overlap lunch. 
            // Note: We don't advance court here yet, we try other matches that might fit.
            continue
          }
        }

        // Recovery / Availability Check
        // If TBD players, we assume available immediately (logic handled by Round ordering)
        // If known players, check map.
        const p1 = (m as any).player1_id
        const p2 = (m as any).player2_id

        const readyTime1 = p1 ? (athleteAvailability.get(p1) || 0) : 0
        const readyTime2 = p2 ? (athleteAvailability.get(p2) || 0) : 0
        const requiredStart = Math.max(readyTime1, readyTime2)

        if (requiredStart <= currentTime) {
          matchFoundIndex = i
          break
        }
      }

      if (matchFoundIndex !== -1) {
        // Schedule Match
        const match = pendingMatches.splice(matchFoundIndex, 1)[0]
        const endMin = currentTime + match.duration

        bestCourt.currentMinutes = endMin

        // Update Prediction
        if ((match as any).player1_id) athleteAvailability.set((match as any).player1_id, endMin + minRecoveryMinutes)
        if ((match as any).player2_id) athleteAvailability.set((match as any).player2_id, endMin + minRecoveryMinutes)

        scheduledDayMatches.push({
          match,
          courtId: bestCourt.id,
          day: actualDay,
          startMin: currentTime,
          endMin
        })
      } else {
        // No match fits right now.
        // Either:
        // A) Lunch conflict for all candidates.
        // B) Recovery conflict for all candidates.

        // Action: Advance court time to next significant event.
        // 1. Lunch End (if we are blocked by lunch approach)
        // 2. Next Availability of a pending player

        let nextJump = Infinity

        if (hasLunch && currentTime < lunchStartRel) {
          nextJump = lunchEndRel // Jump to after lunch
        }

        // Find min recovery of pending
        for (const m of pendingMatches) {
          const p1 = (m as any).player1_id
          const p2 = (m as any).player2_id
          const r1 = p1 ? (athleteAvailability.get(p1) || 0) : 0
          const r2 = p2 ? (athleteAvailability.get(p2) || 0) : 0
          const ready = Math.max(r1, r2)
          if (ready > currentTime) nextJump = Math.min(nextJump, ready)
        }

        if (nextJump !== Infinity && nextJump > currentTime) {
          bestCourt.currentMinutes = nextJump
        } else {
          // Fallback increment
          bestCourt.currentMinutes += 5
        }
      }
    }

    // Convert to Assignments
    for (const sm of scheduledDayMatches) {
      const startClock = addMinutesToTime(tournamentConfig.daily_start_time, sm.startMin)
      const endClock = addMinutesToTime(tournamentConfig.daily_start_time, sm.endMin)

      const matchDate = new Date(startDate)
      matchDate.setDate(matchDate.getDate() + (sm.day - 1))

      const isoStart = new Date(matchDate)
      const [sH, sM] = startClock.split(':').map(Number)
      isoStart.setHours(sH, sM, 0)

      const isoEnd = new Date(matchDate)
      const [eH, eM] = endClock.split(':').map(Number)
      isoEnd.setHours(eH, eM, 0)

      finalAssignments.push({
        matchId: sm.match.id,
        matchNumber: '',
        day: sm.day,
        court: sm.courtId, // Now number
        sequence: 0,
        estimatedStartTime: formatTimeAMPM(startClock),
        scheduledStartTime: isoStart.toISOString(),
        scheduledEndTime: isoEnd.toISOString(),
        divisionId: sm.match.divisionId,
        categoryId: sm.match.categoryId
      })
    }

    // Stats
    const totalDayMins = scheduledDayMatches.reduce((acc, curr) => acc + curr.match.duration, 0)
    dayStats.set(actualDay, totalDayMins)
  }

  // 6. Phase B: Match Numbering (Court-Encoded)
  // [CourtID][Sequence] -> 101, 102...
  // CRITICAL: Sequence is GLOBAL per court across ALL days, not per day-court

  // Group by Court ONLY (not day-court) to ensure unique numbering
  const matchesByCourt = new Map<number, MatchAssignment[]>()

  for (const assign of finalAssignments) {
    if (!matchesByCourt.has(assign.court)) {
      matchesByCourt.set(assign.court, [])
    }
    matchesByCourt.get(assign.court)!.push(assign)
  }

  for (const [courtId, courtMatches] of matchesByCourt.entries()) {
    // Sort by Day first, then Start Time within day
    courtMatches.sort((a, b) => {
      // Primary: Day number
      if (a.day !== b.day) return a.day - b.day
      // Secondary: Start time
      return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
    })

    // Assign Numbers with GLOBAL sequence per court
    let seq = 1
    for (const m of courtMatches) {
      // Format: Court * 100 + Seq (e.g. 101, 201)
      // If seq > 99, it becomes 1100, which is fine, readable.
      const matchNum = (courtId * 100) + seq
      m.matchNumber = matchNum.toString()
      m.sequence = seq
      seq++
    }
  }


  return {
    assignments: finalAssignments,
    overflow,
    dayStats
  }
}

// ============================================================================
// Validators & Legacy Wrappers
// ============================================================================

export function validateSchedule(input: ScheduleInput): ScheduleValidationResult {
  const { tournamentConfig, startDate, endDate } = input
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const dailyMinutes = calculateMinutes(tournamentConfig.daily_start_time, tournamentConfig.daily_end_time)
  const totalAvailableMinutes = dailyMinutes * tournamentConfig.courts * totalDays

  // Run Loose Schedule to check overflow
  const { overflow, dayStats } = calculateSchedule(input, false)

  const isFeasible = overflow.count === 0 && Array.from(dayStats.keys()).every(d => d <= totalDays)

  // Calculate total required
  const totalRequiredMinutes = Array.from(dayStats.values()).reduce((a, b) => a + b, 0)

  const errors: ScheduleValidationError[] = []
  const recommendations: string[] = []

  if (!isFeasible) {
    const maxDay = Math.max(...Array.from(dayStats.keys()))
    const daysNeeded = maxDay - totalDays

    // Calculate all three options whenever schedule is infeasible
    const overflowHours = overflow.minutes / 60
    const currentCapacity = dailyMinutes * tournamentConfig.courts * totalDays
    const requiredCapacity = currentCapacity + overflow.minutes

    // Option 1: Add more courts (always show)
    const courtsNeeded = Math.ceil(requiredCapacity / (dailyMinutes * totalDays))
    const additionalCourts = Math.max(1, courtsNeeded - tournamentConfig.courts)
    recommendations.push(`Add ${additionalCourts} more court${additionalCourts > 1 ? 's' : ''} (${tournamentConfig.courts} → ${tournamentConfig.courts + additionalCourts})`)

    // Option 2: Extend daily hours (always show)
    const hoursNeeded = Math.max(1, Math.ceil(overflow.minutes / (60 * tournamentConfig.courts * totalDays)))
    const currentHours = dailyMinutes / 60
    const newHours = currentHours + hoursNeeded
    recommendations.push(`Extend daily hours by ${hoursNeeded} hour${hoursNeeded > 1 ? 's' : ''} (${currentHours}h → ${newHours}h)`)

    // Option 3: Add more days (always show)
    let daysToAdd = daysNeeded
    if (daysToAdd <= 0) {
      // Calculate how many days would be needed if we don't add courts/hours
      daysToAdd = Math.max(1, Math.ceil(requiredCapacity / (dailyMinutes * tournamentConfig.courts)) - totalDays)
    }
    recommendations.push(`Extend tournament by ${daysToAdd} day${daysToAdd > 1 ? 's' : ''} (${totalDays} → ${totalDays + daysToAdd} days)`)

    // Add appropriate error message
    if (overflow.count > 0) {
      errors.push({
        type: 'time_overflow',
        message: `${overflow.count} matches (${Math.round(overflowHours * 10) / 10} hours) cannot fit in current schedule.`,
        suggestedFix: 'See recommendations below'
      })
    } else {
      errors.push({
        type: 'time_overflow',
        message: `Schedule requires ${maxDay} days but only ${totalDays} are configured.`,
        suggestedFix: 'See recommendations below'
      })
    }
  }

  // Build Utilization
  const courtsUtilization: CourtUtilization[] = []
  for (let day = 1; day <= Math.min(totalDays, 14); day++) {
    const dayMinutes = dayStats.get(day) || 0
    const utilization = (dayMinutes / (dailyMinutes * tournamentConfig.courts)) * 100

    courtsUtilization.push({
      day,
      court: 0,
      matchCount: 0,
      utilizationPercent: Math.min(100, Math.round(utilization)),
      startTime: tournamentConfig.daily_start_time,
      endTime: tournamentConfig.daily_end_time
    })
  }

  return {
    feasible: isFeasible,
    totalDays,
    totalMatches: input.matches.length,
    totalRequiredMinutes,
    totalAvailableMinutes,
    courtsUtilization,
    warnings: [],
    errors,
    recommendations,
    canProceedWithOverride: true,
    // Add overflow data for UI display
    overflowCount: overflow.count,
    overflowMinutes: overflow.minutes
  }
}

export function assignMatchNumbers(input: ScheduleInput): MatchAssignment[] {
  const { assignments } = calculateSchedule(input, true)
  return assignments
}
