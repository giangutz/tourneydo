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
  category_name?: string
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

const WEIGHT_PRIORITY: Record<string, number> = {
  // Traditional Names
  'fin': 10,
  'fly': 20,
  'bantam': 30,
  'feather': 40,
  'light': 50,
  'welter': 60,
  'light middle': 65, // Rare variations
  'middle': 70,
  'light heavy': 80,
  'heavy': 90,
  // Group Names (Gradeschool/Kids)
  'group 0': 10,
  'group 1': 20,
  'group 2': 30,
  'group 3': 40,
  'group 4': 50,
  'group 5': 60,
  'group 6': 70,
  'group 7': 80
}

function normalizeBelt(belt: string = ''): number {
  const b = belt.toLowerCase()
  // Beginner (10)
  if (b.includes('white') || b.includes('beginner')) return 10
  // Novice I (20)
  if (b.includes('yellow') || b.includes('blue')) return 20
  // Novice II (30)
  if (b.includes('red') || b.includes('brown')) return 30
  // Advanced (40)
  if (b.includes('black')) return 40
  return 99
  return 99
}

function normalizeWeightPriority(categoryName: string = ''): number {
  const c = categoryName.toLowerCase()
  // 1. Direct match check
  for (const [key, val] of Object.entries(WEIGHT_PRIORITY)) {
    if (c.includes(key)) return val
  }
  return 99 // Catch-all for unknown
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

function normalizeAgeGroup(divisionName: string = ''): 'gradeschool' | 'cadet' | 'junior' | 'senior' | 'default' {
  const d = divisionName.toLowerCase()
  if (d.includes('grade') || d.includes('toddler') || d.includes('kids')) return 'gradeschool'
  if (d.includes('cadet')) return 'cadet'
  if (d.includes('junior')) return 'junior'
  if (d.includes('senior') || d.includes('adult')) return 'senior'
  return 'default'
}

function calculateSmartDuration(ageGroup: string, config: TournamentScheduleConfig, defaultDuration: number): number {
  // Formula: (Round × 3) + (Rest × 2) + Kyeshi + 1m Transition
  // Values in Config are in SECONDS
  let roundTime = 0
  let restTime = 0
  let kyeshiTime = 0

  switch (ageGroup) {
    case 'gradeschool':
      roundTime = config.gradeschool_round_time || 60
      restTime = config.gradeschool_rest_between_rounds || 30
      kyeshiTime = config.gradeschool_kyeshi_time || 60
      break
    case 'cadet':
      roundTime = config.cadet_round_time || 90
      restTime = config.cadet_rest_between_rounds || 30
      kyeshiTime = config.cadet_kyeshi_time || 60
      break
    case 'junior':
      roundTime = config.junior_round_time || 90
      restTime = config.junior_rest_between_rounds || 30
      kyeshiTime = config.junior_kyeshi_time || 60
      break
    case 'senior':
      roundTime = config.senior_round_time || 120
      restTime = config.senior_rest_between_rounds || 30
      kyeshiTime = config.senior_kyeshi_time || 60
      break
    default:
      return defaultDuration
  }

  const totalSeconds = (roundTime * 3) + (restTime * 2) + kyeshiTime + 60 // +1m transition
  return Math.ceil(totalSeconds / 60) // Return in minutes
}

// ============================================================================
// Phase A: Scheduling Engine
// ============================================================================

// ============================================================================
// Phase A: Scheduling Engine
// ============================================================================

export function calculateSchedule(input: ScheduleInput, strict: boolean): {
  assignments: MatchAssignment[],
  overflow: { count: number, minutes: number },
  dayStats: Map<number, number>
} {
  const { tournamentConfig, matches, startDate, endDate } = input

  // Determine Tournament Type (Default to 'standard' if not provided explicitly in future)
  // Logic: We assume 'standard' uses Belt Priority. 'open-belt' ignores it.
  // For now, let's look for a flag or default to True (Standard) as per requirement.
  const isStandardTournament = true // TODO: Pass this from input.tournamentConfig.tournament_type

  // 0. Setup Context
  const dailyMinutes = calculateMinutes(tournamentConfig.daily_start_time, tournamentConfig.daily_end_time)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const totalDailyCapacity = dailyMinutes * tournamentConfig.courts

  // 1. Enrich Matches & Filter Valid
  // Pre-pass: Find representative belt for each Division+Category group to handle TBD matches
  const repBeltPriorityMap = new Map<string, number>()

  for (const m of matches) {
    if (!m.divisionId || !m.categoryId) continue
    const key = `${m.divisionId}-${m.categoryId}`

    // Check strict belt priority for this match
    const p = normalizeBelt(m.belt_level)

    // If it's a valid priority (not 99), store it as representative for the group
    if (p !== 99) {
      if (!repBeltPriorityMap.has(key)) {
        repBeltPriorityMap.set(key, p)
      }
    }
  }

  const validMatches: SchedulerMatch[] = matches
    .filter(m => m.status !== 'completed' && m.winner_id === null)
    .map((m, idx) => {
      const divConfig = input.divisionConfigs.find(d => d.division_id === m.divisionId)

      // Calculate Exact Duration
      const ageGroup = normalizeAgeGroup(m.division_name || '')
      const calculatedDuration = calculateSmartDuration(ageGroup, tournamentConfig, tournamentConfig.default_sparring_duration || 10)

      // Use helper if detected, otherwise fallback to existing logic
      const duration = (ageGroup !== 'default') ? calculatedDuration : (divConfig?.avg_match_duration || tournamentConfig.default_sparring_duration || 10)

      // Determine Belt Priority: Own > Representative > Default(99)
      const ownPriority = normalizeBelt(m.belt_level)
      const repPriority = repBeltPriorityMap.get(`${m.divisionId}-${m.categoryId}`)
      const effectivePriority = (ownPriority !== 99) ? ownPriority : (repPriority || 99)

      // CRITICAL: Split blocks by Priority to ensure strict scheduling order (e.g. White before Yellow)
      // regardless of whether they share a Category ID.
      const distinctGroupId = `${m.divisionId}-${m.categoryId}-${effectivePriority}`
      const blockSetId = m.divisionId

      return {
        ...m,
        duration,
        beltPriority: effectivePriority,
        groupId: distinctGroupId,
        blockSetId,
        sourceIndex: idx,
        winner_id: m.winner_id || null,
        tournament_id: 'temp',
        match_number: m.match_number || 0,
        ageGroup: 'temp',
        weightGroup: 'temp',
        category_name: m.category_name
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
  const ROUND_DEPTH_WEIGHT = 1.5

  for (const block of blocksMap.values()) {
    block.bracketSize = block.matches.length
    // Add overhead estimate (2m per match) - REMOVED for strict fit
    // block.totalMinutes += (block.matches.length * 2)

    const remainingMinutes = block.matches.length * 10
    block.urgencyScore = (block.maxRound * 100 * ROUND_DEPTH_WEIGHT) + remainingMinutes
  }

  // 3. Phase A2: Global Priority Sorting
  const sortedBlocks = Array.from(blocksMap.values()).sort((a, b) => {
    // 1. Belt Priority (Strict for Standard)
    if (isStandardTournament) {
      if (a.beltPriority !== b.beltPriority) return a.beltPriority - b.beltPriority
    }

    // 2. Volume Priority (Larger Brackets First)
    // Note: We want LARGEST first (Descending).
    if (a.bracketSize !== b.bracketSize) return b.bracketSize - a.bracketSize

    // 3. Weight/Group Priority (Fin -> Heavy) (Ascending)
    // We need to look up the Category Name from one of the matches
    const catA = a.matches[0]?.category_name || ''
    const catB = b.matches[0]?.category_name || ''
    const weightA = normalizeWeightPriority(catA)
    const weightB = normalizeWeightPriority(catB)

    if (weightA !== weightB) return weightA - weightB

    // 4. Tie-Breaker: Alphabetical / ID
    return a.id.localeCompare(b.id)
  })

  // 4. Phase A3: Day Assignment (Atomic Bin Packing)
  // "Next Fit" / "First Fit" strategy for Day Assignment
  const dayLoads = new Map<number, number>()
  const blockAssignments: AssignedBlock[] = []

  // Initialize days
  for (let d = 0; d < totalDays + 5; d++) {
    dayLoads.set(d, 0)
  }

  const overflow: { count: number, minutes: number } = { count: 0, minutes: 0 }

  for (const block of sortedBlocks) {
    let assignedDay = -1

    // Try to fit strict in existing days
    for (let d = 0; d < totalDays; d++) {
      const currentLoad = dayLoads.get(d) || 0

      // ATOMIC CHECK: Must fit entirely
      if (currentLoad + block.totalMinutes <= totalDailyCapacity) {
        assignedDay = d
        dayLoads.set(d, currentLoad + block.totalMinutes)
        break
      }
    }

    // If it didn't fit in any valid day:
    if (assignedDay === -1) {
      // Check if it's IMPOSSIBLE (Block > Daily Capacity)
      if (block.totalMinutes > totalDailyCapacity) {
        // Critical Error: Immediate Overflow
        // This bracket *cannot* be scheduled atomically under current settings.
        overflow.count++
        overflow.minutes += block.totalMinutes
        continue
      }

      if (strict) {
        // Valid block, but days are full -> Overflow
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
          if (d > totalDays + 20) break // Safety break
        }
      }
    }

    if (assignedDay !== -1) {
      blockAssignments.push({ block, dayIndex: assignedDay })
    }
  }

  // 5. Phase A4: Intra-Day Sequencing & Court Assignment
  const finalAssignments: MatchAssignment[] = []
  const dayStats = new Map<number, number>()
  const assignmentsByDay = new Map<number, AssignedBlock[]>()

  for (const ba of blockAssignments) {
    if (!assignmentsByDay.has(ba.dayIndex)) assignmentsByDay.set(ba.dayIndex, [])
    assignmentsByDay.get(ba.dayIndex)!.push(ba)
  }

  const [startH, startM] = tournamentConfig.daily_start_time.split(':').map(Number)
  const startTimeInDayMins = startH * 60 + startM
  const lunchStartAbs = 12 * 60
  const lunchEndAbs = 13 * 60
  const lunchStartRel = Math.max(0, lunchStartAbs - startTimeInDayMins)
  const lunchEndRel = Math.max(0, lunchEndAbs - startTimeInDayMins)
  const hasLunch = input.forceLunchBreak !== false && lunchEndRel > lunchStartRel

  for (const [dayIdx, dayBlocks] of assignmentsByDay.entries()) {
    const actualDay = dayIdx + 1
    let dayMatches: SchedulerMatch[] = []

    // Sort blocks WITHIN the day (Maintain Global Sort Order)
    // Actually, dayBlocks is already pushed in sorted order, but let's ensure stability.
    // They were pushed in loop of `sortedBlocks`. So order corresponds to Priority.
    // We want to process matches in that order.

    for (const b of dayBlocks) {
      dayMatches.push(...b.block.matches)
    }

    // Court Simulation state
    const courtTimers = Array(tournamentConfig.courts).fill(0).map((_, idx) => ({
      id: idx + 1,
      currentMinutes: 0
    }))
    const athleteAvailability = new Map<string, number>()
    const minRecoveryMinutes = 15

    // Sort matches for the "Ready Queue" priority
    // CRITICAL: We need to respect the Block Priority Order
    // But also enforce Round dependencies (R64 > R32)
    dayMatches.sort((a, b) => {
      const blockA = blocksMap.get(a.groupId)!
      const blockB = blocksMap.get(b.groupId)!

      // 1. Block Priority (Belt > Volume > Weight)
      // Since `sortedBlocks` already established the "Wave" order, 
      // we can rely on `blockA` vs `blockB` index? 
      // Or just re-run the same high-level sort logic comparison.

      // Let's implement the comparison logic directly to be safe

      if (blockA.id !== blockB.id) {
        // Use the established sort logic
        if (isStandardTournament) {
          if (blockA.beltPriority !== blockB.beltPriority) return blockA.beltPriority - blockB.beltPriority
        }
        if (blockA.bracketSize !== blockB.bracketSize) return blockB.bracketSize - blockA.bracketSize

        const catA = blockA.matches[0]?.category_name || ''
        const catB = blockB.matches[0]?.category_name || ''
        const weightA = normalizeWeightPriority(catA)
        const weightB = normalizeWeightPriority(catB)
        if (weightA !== weightB) return weightA - weightB

        return blockA.id.localeCompare(blockB.id)
      }

      // 2. Round Dependency (Within same block)
      if (a.round !== b.round) return a.round - b.round

      return a.sourceIndex - b.sourceIndex
    })

    const pendingMatches = [...dayMatches]
    const scheduledDayMatches: any[] = []

    while (pendingMatches.length > 0) {
      courtTimers.sort((a, b) => a.currentMinutes - b.currentMinutes)
      const bestCourt = courtTimers[0]
      let currentTime = bestCourt.currentMinutes

      // Lunch Logic
      if (hasLunch) {
        if (currentTime >= lunchStartRel && currentTime < lunchEndRel) {
          bestCourt.currentMinutes = lunchEndRel
          currentTime = lunchEndRel
        }
      }

      let matchFoundIndex = -1

      for (let i = 0; i < pendingMatches.length; i++) {
        const m = pendingMatches[i]

        // Check Lunch Fit
        if (hasLunch) {
          if (currentTime < lunchStartRel && (currentTime + m.duration) > lunchStartRel) {
            continue
          }
        }

        // Recovery Check
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
        const match = pendingMatches.splice(matchFoundIndex, 1)[0]
        const endMin = currentTime + match.duration
        bestCourt.currentMinutes = endMin

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
        // Time Jump
        let nextJump = Infinity
        if (hasLunch && currentTime < lunchStartRel) nextJump = lunchEndRel

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
          bestCourt.currentMinutes += 5
        }
      }
    }

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
        court: sm.courtId,
        sequence: 0,
        estimatedStartTime: formatTimeAMPM(startClock),
        scheduledStartTime: isoStart.toISOString(),
        scheduledEndTime: isoEnd.toISOString(),
        divisionId: sm.match.divisionId,
        categoryId: sm.match.categoryId
      })
    }
    const totalDayMins = scheduledDayMatches.reduce((acc, curr) => acc + curr.match.duration, 0)
    dayStats.set(actualDay, totalDayMins)
  }

  // 6. Phase B: Match Numbering (Court-Encoded)
  const matchesByCourt = new Map<number, MatchAssignment[]>()
  for (const assign of finalAssignments) {
    if (!matchesByCourt.has(assign.court)) matchesByCourt.set(assign.court, [])
    matchesByCourt.get(assign.court)!.push(assign)
  }

  for (const [courtId, courtMatches] of matchesByCourt.entries()) {
    courtMatches.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
    })

    let seq = 1
    for (const m of courtMatches) {
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
    const requiredCapacity = totalRequiredMinutes + overflow.minutes

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
