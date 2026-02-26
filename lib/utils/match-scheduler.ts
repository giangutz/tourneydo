import { BELT_GROUPS } from '@/lib/constants/belts'
import {
  MatchAssignment,
  TournamentScheduleConfig,
  DivisionScheduleConfig,
  ScheduleValidationResult,
  ScheduleValidationError,
  CourtUtilization,
  Match,
  MatchLifecycleState
} from '@/types/models'
import { formatMatchNumber } from '@/lib/utils/match-numbering'


// ============================================================================
// Internal Types
// ============================================================================

interface SchedulerMatch extends Omit<Match, 'created_at' | 'updated_at' | 'status' | 'lifecycle_state'> {
  status?: string | null
  id: string
  divisionId: string
  categoryId: string
  round: number
  winner_id: string | null
  duration: number
  beltPriority: number
  category_name?: string
  // Metadata from Generator
  round_name?: string
  round_order?: number
  structural_match_number?: number
  bracket_position?: string
  lifecycle_state?: MatchLifecycleState
  // Helpers for grouping
  groupId: string        // Atomic Block ID (e.g. Div-Cat-Weight)
  blockSetId: string     // Higher Level Group (Div-Cat) - used for day-spanning logic if needed
  sourceIndex: number    // Original Index in input array (Preserve Bracket Order)
  relativeIndex: number  // Interleave Priority (0..N within block)
  waveIndex: number      // Batch Priority (floor(relativeIndex / courts))
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
  minRound: number
  urgencyScore: number // (roundDepth * maxRound) + (remainingMatches * duration)
  rounds: RoundInfo[]
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
    match_number?: number
    // Metadata
    round_name?: string
    round_order?: number
    bracket_position?: string
    structural_match_number?: number
    lifecycle_state?: string
  }>
  startDate: Date
  endDate: Date
  /**
   * Per-court availability offsets for live recalculation.
   * Keys are 1-based court numbers; values are ISO timestamps of when the
   * court becomes free (i.e. the actual_end_time of the last completed match
   * on that court, or the scheduled_end_time of any in-progress match).
   * When provided, each court queue starts from this time instead of from
   * the tournament's daily_start_time on day 1.
   */
  courtInitialTimes?: Record<number, string>
}

// ============================================================================
// Constants & Helpers
// ============================================================================

// Priority Constants (Higher = Plays First)
const PRIORITY_BEGINNER = 40
const PRIORITY_NOVICE = 30
const PRIORITY_ADVANCED_1 = 20
const PRIORITY_ADVANCED_2 = 10

// Helper to extract text from match for normalization
function normalizeBelt(match: { belt_level?: string | null, category_name?: string, division_name?: string }): number {
  // 1. Priority: Direct -> Category -> Division
  const sources = [
    match.belt_level,
    match.category_name,
    match.division_name
  ]

  for (const raw of sources) {
    if (!raw) continue
    const text = raw.toLowerCase()

    // 2. Iterate through Defined Groups
    // Beginner
    for (const keyword of BELT_GROUPS.Beginner) {
      if (text.includes(keyword.toLowerCase()) || text.includes('beginner')) return PRIORITY_BEGINNER
    }

    // Novice
    for (const keyword of BELT_GROUPS.Novice) {
      if (text.includes(keyword.toLowerCase()) || text.includes('novice')) return PRIORITY_NOVICE
    }

    // Advanced I
    for (const keyword of BELT_GROUPS['Advanced I']) {
      if (text.includes(keyword.toLowerCase()) || text.includes('advanced 1') || text.includes('advanced i')) return PRIORITY_ADVANCED_1
    }

    // Advanced II
    for (const keyword of BELT_GROUPS['Advanced II']) {
      if (text.includes(keyword.toLowerCase()) || text.includes('advanced 2') || text.includes('advanced ii') || text.includes('advanced')) return PRIORITY_ADVANCED_2
    }
  }

  return 0
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
  return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')} `
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
// Phase A: Scheduling Engine (Structured Hierarchy)
// ============================================================================

interface RoundInfo {
  roundName: string
  matchCount: number
  participants: number
  roundOrder: number
}

interface EnrichedBlock extends GroupBlock {
  rounds: RoundInfo[]
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

function determineRoundName(participants: number): string {
  switch (participants) {
    case 256: return 'Round of 256'
    case 128: return 'Round of 128'
    case 64:  return 'Round of 64'
    case 32:  return 'Round of 32'
    case 16:  return 'Round of 16'
    case 8:   return 'Quarter-finals'
    case 4:   return 'Semi-finals'
    case 2:   return 'Finals'
    default:  return `Round of ${participants}`
  }
}

function calculateBracketSizeFromMatches(matchCount: number): number {
  const bracketSize = matchCount + 1
  return isPowerOfTwo(bracketSize)
    ? bracketSize
    : Math.pow(2, Math.ceil(Math.log2(bracketSize)))
}

function calculateRoundsForBracket(bracketSize: number): RoundInfo[] {
  const rounds: RoundInfo[] = []
  let currentParticipants = bracketSize
  let roundOrder = 1

  while (currentParticipants > 1) {
    rounds.push({
      roundName: determineRoundName(currentParticipants),
      matchCount: currentParticipants / 2,
      participants: currentParticipants,
      roundOrder
    })

    currentParticipants /= 2
    roundOrder++
  }

  return rounds
}

/**
 * Reorders categories to optimize rest time.
 * Fresh categories (did not compete in last round) go FIRST.
 * Recent categories (competed in last round) go LAST.
 */
function reorderCategoriesForRest(
  blocks: EnrichedBlock[],
  recentlyCompetedIds: Set<string>
): EnrichedBlock[] {
  const fresh = blocks.filter(b => !recentlyCompetedIds.has(b.id))
  const recent = blocks.filter(b => recentlyCompetedIds.has(b.id))

  // Sort both groups by Volume (Total Matches Descending)
  // If volumes equal, ID tie-breaker
  const sortFn = (a: EnrichedBlock, b: EnrichedBlock) => {
    const aMatches = a.matches.length // Total matches in this category
    const bMatches = b.matches.length

    if (aMatches !== bMatches) return bMatches - aMatches // Descending
    return a.id.localeCompare(b.id) // Tie-breaker
  }

  fresh.sort(sortFn)
  recent.sort(sortFn)

  return [...fresh, ...recent]
}

export function calculateSchedule(input: ScheduleInput): {
  assignments: MatchAssignment[],
  overflow: { count: number, minutes: number },
  dayStats: Map<number, number>
} {
  const { tournamentConfig, matches, startDate, endDate } = input

  // Guard: must have at least 1 court
  if (!tournamentConfig.courts || tournamentConfig.courts <= 0) {
    throw new Error('Tournament must have at least 1 court configured to generate a schedule')
  }

  // 0. Setup Context
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1


  // 1. Enrich Matches & Filter Valid
  const repBeltPriorityMap = new Map<string, number>()
  const bracketVolumeMap = new Map<string, number>()

  // Pre-scan for Priority and Volume
  for (const m of matches) {
    if (!m.divisionId || !m.categoryId) continue
    const key = `${m.divisionId} -${m.categoryId} `

    // Belt Priority Map Logic
    const p = normalizeBelt(m)
    if (p !== 0 && !repBeltPriorityMap.has(key)) {
      repBeltPriorityMap.set(key, p)
    }

    // Volume Logic: Count ALL matches (including pending/completed) for sizing
    bracketVolumeMap.set(key, (bracketVolumeMap.get(key) || 0) + 1)
  }

  // Filter valid matches (CONTEST state only)
  const validMatches: SchedulerMatch[] = matches
    .filter(m =>
      m.status !== 'completed' &&
      !m.winner_id &&
      m.status !== 'pending' // CRITICAL: Skip pending matches
    )
    .map((m, idx) => {
      const divConfig = input.divisionConfigs.find(d => d.division_id === m.divisionId)
      const ageGroup = normalizeAgeGroup(m.division_name || '')
      const calculatedDuration = calculateSmartDuration(ageGroup, tournamentConfig, tournamentConfig.default_sparring_duration || 10)
      const duration = (ageGroup !== 'default') ? calculatedDuration : (divConfig?.avg_match_duration || tournamentConfig.default_sparring_duration || 10)

      const ownPriority = normalizeBelt(m)
      const repPriority = repBeltPriorityMap.get(`${m.divisionId} -${m.categoryId} `)
      const effectivePriority = (ownPriority !== 0) ? ownPriority : (repPriority || 0)

      const distinctGroupId = `${m.divisionId} -${m.categoryId} -${effectivePriority} `
      const blockSetId = m.divisionId

      return {
        ...m,
        duration,
        beltPriority: effectivePriority,
        groupId: distinctGroupId, // This is the "Block ID"
        blockSetId,
        sourceIndex: m.structural_match_number || idx,
        winner_id: m.winner_id || null,
        tournament_id: 'temp',
        match_number: m.match_number || 0,
        ageGroup: 'temp',
        weightGroup: 'temp',
        category_name: m.category_name,
        // Pass through Metadata
        round_name: m.round_name,
        round_order: m.round_order,
        structural_match_number: m.structural_match_number,
        bracket_position: m.bracket_position,
        lifecycle_state: m.lifecycle_state as MatchLifecycleState,

        relativeIndex: 0,
        waveIndex: 0
      } as unknown as SchedulerMatch
    })

  // 1.1 Build Blocks (Categories)
  const blocksMap = new Map<string, EnrichedBlock>()
  for (const m of validMatches) {
    if (!blocksMap.has(m.groupId)) {
      const rawKey = `${m.divisionId} -${m.categoryId} `

      const totalMatches = bracketVolumeMap.get(rawKey) || 0
      const bracketSize = calculateBracketSizeFromMatches(totalMatches)
      const rounds = calculateRoundsForBracket(bracketSize)

      blocksMap.set(m.groupId, {
        id: m.groupId,
        blockSetId: m.blockSetId,
        matches: [],
        totalMinutes: 0,
        bracketSize,
        beltPriority: m.beltPriority,
        maxRound: rounds.length, // Total rounds count
        minRound: 1,
        urgencyScore: 0,
        rounds // Add calculated rounds
      })
    }
    const block = blocksMap.get(m.groupId)!
    block.matches.push(m)
    block.totalMinutes += m.duration
    // Legacy max/min round calculation removed in favor of theoretical rounds
  }

  // 2. Structured Hierarchy Generation

  // Initialize Court Queues IMMEDIATELY so we can distribute matches during the loop
  const courtQueues: SchedulerMatch[][] = Array(tournamentConfig.courts)
    .fill(0).map(() => [])
  let courtIdx = 0

  // Group Blocks by Belt Level (Priority)
  // Higher Priority = Plays First
  const beltLevels = [PRIORITY_BEGINNER, PRIORITY_NOVICE, PRIORITY_ADVANCED_1, PRIORITY_ADVANCED_2]
  const blocksByBelt = new Map<number, EnrichedBlock[]>()

  for (const block of blocksMap.values()) {
    const belt = block.beltPriority
    // Bucket into standard levels
    let bucket = PRIORITY_ADVANCED_2 // Default to lowest priority if unknown
    if (belt >= PRIORITY_BEGINNER) bucket = PRIORITY_BEGINNER
    else if (belt >= PRIORITY_NOVICE) bucket = PRIORITY_NOVICE
    else if (belt >= PRIORITY_ADVANCED_1) bucket = PRIORITY_ADVANCED_1
    else if (belt >= PRIORITY_ADVANCED_2) bucket = PRIORITY_ADVANCED_2

    if (!blocksByBelt.has(bucket)) blocksByBelt.set(bucket, [])
    blocksByBelt.get(bucket)!.push(block)
  }

  // MAIN HIERARCHY LOOP
  const ROUND_HIERARCHY = [
    'Round of 256',
    'Round of 128',
    'Round of 64',
    'Round of 32',
    'Round of 16',
    'Quarter-finals',
    'Semi-finals',
    'Finals'
  ]

  for (const belt of beltLevels) {
    const beltBlocks = blocksByBelt.get(belt) || []
    if (beltBlocks.length === 0) continue

    let competedLastRound = new Set<string>()

    for (const standardRound of ROUND_HIERARCHY) {
      // Filter blocks that have this round
      const activeBlocks = beltBlocks.filter(block =>
        block.rounds.some(r => r.roundName === standardRound)
      )

      if (activeBlocks.length === 0) continue

      // Reorder Categories: Fresh > Recent (Rest Optimization)
      const orderedBlocks = reorderCategoriesForRest(activeBlocks, competedLastRound)

      const competedThisRound = new Set<string>()

      for (const block of orderedBlocks) {
        // Get matches for this specific round.
        // round_name is always set by the bracket generator.
        const roundMatches = block.matches.filter(m => m.round_name === standardRound)

        if (roundMatches.length === 0) continue

        // Sort matches by Structural Bracket Position (guaranteed correct order)
        roundMatches.sort((a, b) => {
          // Use structural number if available
          if (a.structural_match_number && b.structural_match_number) {
            return a.structural_match_number - b.structural_match_number
          }
          // Fallback to match_number
          if (a.match_number && b.match_number) return a.match_number - b.match_number

          return a.sourceIndex - b.sourceIndex
        })

        // Distribute to courts IMMEDIATELY (round-robin)
        for (const match of roundMatches) {
          courtQueues[courtIdx].push(match)
          courtIdx = (courtIdx + 1) % tournamentConfig.courts
        }

        competedThisRound.add(block.id)
      }

      competedLastRound = competedThisRound
    }
  }

  // Add any remaining matches (belt 99 or weird cases)
  const unknownBlocks = Array.from(blocksMap.values()).filter(b => b.beltPriority < 10)
  if (unknownBlocks.length > 0) {
    for (const block of unknownBlocks) {
      block.matches.sort((a, b) => a.sourceIndex - b.sourceIndex)
      for (const match of block.matches) {
        courtQueues[courtIdx].push(match)
        courtIdx = (courtIdx + 1) % tournamentConfig.courts
      }
    }
  }

  // 3. Round Robin Distribution (Completed in Hierarchy Loop)
  const finalAssignments: MatchAssignment[] = []
  const overflow: { count: number, minutes: number } = { count: 0, minutes: 0 }
  const dayStats = new Map<number, number>()

  // (Court Queues are already populated)

  // 4. Time Calculation & Assignment
  // Process each court queue to assign Times and Days

  const bufferMins = 1 // 1 minute buffer/transition
  const dailyMins = calculateMinutes(tournamentConfig.daily_start_time, tournamentConfig.daily_end_time)

  // Prepare Lunch logic — driven by tournament config (defaults: enabled, 12:00-13:00)
  const [startH, startM] = tournamentConfig.daily_start_time.split(':').map(Number)
  const startTimeInDayMins = startH * 60 + startM
  const lunchEnabled = tournamentConfig.lunch_enabled !== false // default true when field absent
  const lunchStartStr = tournamentConfig.lunch_start_time || '12:00'
  const lunchEndStr = tournamentConfig.lunch_end_time || '13:00'
  const [lunchStartH, lunchStartM] = lunchStartStr.split(':').map(Number)
  const [lunchEndH, lunchEndM] = lunchEndStr.split(':').map(Number)
  const lunchStartAbs = lunchStartH * 60 + lunchStartM
  const lunchEndAbs = lunchEndH * 60 + lunchEndM
  const lunchStartRel = Math.max(0, lunchStartAbs - startTimeInDayMins)
  const lunchEndRel = Math.max(0, lunchEndAbs - startTimeInDayMins)
  const hasLunch = lunchEnabled && lunchEndRel > lunchStartRel

  for (let cIdx = 0; cIdx < tournamentConfig.courts; cIdx++) {
    const queue = courtQueues[cIdx]
    const courtNumber = cIdx + 1

    // Live recalculation: if this court has an initial availability time, start
    // from that offset rather than day 1 minute 0.
    let currentDay = 1
    let currentMins = 0
    const courtInitialISO = input.courtInitialTimes?.[courtNumber]
    if (courtInitialISO) {
      const availableAt = new Date(courtInitialISO)
      const dayOffset = Math.floor(
        (availableAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      currentDay = Math.min(dayOffset + 1, totalDays)
      const availMins = availableAt.getHours() * 60 + availableAt.getMinutes()
      currentMins = Math.max(0, availMins - startTimeInDayMins)
    }

    let seq = 1
    for (const match of queue) {
      // Check Day Capacity
      // If duration exceeds remaining day time, move to next day
      // Note: We don't split matches across days.

      // Lunch Check
      if (hasLunch) {
        if (currentMins < lunchStartRel && (currentMins + match.duration) > lunchStartRel) {
          // Jump to after lunch
          currentMins = lunchEndRel
        }
      }

      if (currentMins + match.duration > dailyMins) {
        // Next Day
        currentDay++
        currentMins = 0
        seq = 1  // Reset sequence so each day starts at [court]01 (e.g., 101)
        // Reset Lunch check for new day? Yes, applies every day.
      }

      if (currentDay > totalDays) {
        // Overflow
        overflow.count++
        overflow.minutes += match.duration
        // Still assign it to Last Day + Extra Time for visibility?
        // Or leave purely as overflow?
        // UI expects valid date strings. Let's assign to effectively "Day N+1" conceptually
        // but physically purely theoretical.
      }

      // Record Assignment
      const dayOffset = currentDay - 1
      const dateObj = new Date(startDate)
      dateObj.setDate(dateObj.getDate() + dayOffset)

      const absoluteStart = startTimeInDayMins + currentMins
      dateObj.setHours(Math.floor(absoluteStart / 60))
      dateObj.setMinutes(absoluteStart % 60)
      dateObj.setSeconds(0)
      dateObj.setMilliseconds(0)
      const startISO = dateObj.toISOString()

      const endDateObj = new Date(dateObj.getTime() + match.duration * 60000)
      const endISO = endDateObj.toISOString()

      finalAssignments.push({
        matchId: match.id,
        matchNumber: formatMatchNumber(cIdx + 1, seq),
        day: currentDay,
        court: cIdx + 1,
        sequence: seq,
        estimatedStartTime: formatTimeAMPM(addMinutesToTime(tournamentConfig.daily_start_time, currentMins)),
        scheduledStartTime: startISO,
        scheduledEndTime: endISO,
        divisionId: match.divisionId,
        categoryId: match.categoryId
      })

      // Update counters
      currentMins += match.duration + bufferMins
      seq++

      // Update Stats
      if (currentDay <= totalDays) {
        dayStats.set(currentDay, (dayStats.get(currentDay) || 0) + match.duration)
      }
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
  const { overflow, dayStats } = calculateSchedule(input)

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
    const requiredCapacity = totalRequiredMinutes + overflow.minutes

    // Option 1: Add more courts (always show)
    const courtsNeeded = Math.ceil(requiredCapacity / (dailyMinutes * totalDays))
    const additionalCourts = Math.max(1, courtsNeeded - tournamentConfig.courts)
    recommendations.push(`Add ${additionalCourts} more court${additionalCourts > 1 ? 's' : ''} (${tournamentConfig.courts} → ${tournamentConfig.courts + additionalCourts})`)

    // Option 2: Extend daily hours (always show)
    const hoursNeeded = Math.max(1, Math.ceil(overflow.minutes / (60 * tournamentConfig.courts * totalDays)))
    const currentHours = dailyMinutes / 60
    const newHours = currentHours + hoursNeeded
    recommendations.push(`Extend daily hours by ${hoursNeeded} hour${hoursNeeded > 1 ? 's' : ''} (${currentHours} h → ${newHours}h)`)

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
        message: `${overflow.count} matches(${Math.round(overflowHours * 10) / 10} hours) cannot fit in current schedule.`,
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
  const { assignments } = calculateSchedule(input)
  return assignments
}
