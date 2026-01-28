import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  TournamentScheduleConfig,
  TournamentScheduleConfigInsert,
  DivisionScheduleConfig,
  DivisionScheduleConfigInsert,
  MatchAssignment,
  DailyScheduleSummary
} from '@/types/models'
import { getTournamentById } from './tournaments'

export async function getTournamentScheduleConfig(tournamentId: string): Promise<TournamentScheduleConfig | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_schedule_config')
    .select('*')
    .eq('tournament_id', tournamentId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch schedule config: ${error.message}`)
  return data
}

export async function upsertTournamentScheduleConfig(
  config: TournamentScheduleConfigInsert
): Promise<TournamentScheduleConfig> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_schedule_config')
    .upsert(config, { onConflict: 'tournament_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to save schedule config: ${error.message}`)
  return data
}

export async function getDivisionScheduleConfigs(tournamentId: string): Promise<DivisionScheduleConfig[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('division_schedule_config')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('priority', { ascending: true })

  if (error) throw new Error(`Failed to fetch division configs: ${error.message}`)

  return (data || []).map(config => ({
    ...config,
    competition_type: (config.competition_type || 'sparring') as any
  }))
}

function calculateMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  return (endHour * 60 + endMin) - (startHour * 60 + startMin)
}

function calculateMatchDuration(divisionName: string | undefined, config: TournamentScheduleConfig): number {
  const divisionKey = (divisionName || 'sparring').toLowerCase()

  let roundTime = 90
  let kyeshiTime = 60
  let restTime = 30

  if (divisionKey.includes('junior') || divisionKey.includes('senior')) {
    roundTime = config.junior_round_time || 120
    kyeshiTime = config.junior_kyeshi_time || 60
    restTime = config.junior_rest_between_rounds || 30
  } else {
    roundTime = config.gradeschool_round_time || 90
    kyeshiTime = config.gradeschool_kyeshi_time || 60
    restTime = config.gradeschool_rest_between_rounds || 30
  }

  // Formula: (Round × 3) + (Rest × 2) + Kyeshi + Transition(60s)
  const totalSeconds = (roundTime * 3) + (restTime * 2) + kyeshiTime + 60
  return Math.ceil(totalSeconds / 60)
}

export async function calculateDivisionPriorities(tournamentId: string): Promise<DivisionScheduleConfigInsert[]> {
  const supabase = createServerSupabaseClient()

  // Get tournament config for time calculations
  const tournament = await getTournamentById(tournamentId)
  const scheduleConfig = await getTournamentScheduleConfig(tournamentId)

  if (!tournament || !scheduleConfig) {
    throw new Error('Tournament or schedule config not found')
  }

  // Get participant counts per division/category and the division name for duration calc
  // Get participant counts per division/category and likely belt level
  // ONLY include enabled divisions
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      division_id, 
      category_id,
      tournament_divisions!inner (name, enabled),
      player:players!player_id (belt_level)
    `)
    .eq('tournament_id', tournamentId)
    .in('status', ['verified', 'paid'])
    .eq('disqualified', false)
    .eq('tournament_divisions.enabled', true)

  if (error) throw new Error(`Failed to fetch registrations: ${error.message}`)

  // Count participants and calculate duration per division/category
  const divisionMap = new Map<string, {
    divisionId: string
    categoryId: string
    participantCount: number
    estimatedMatches: number
    estimatedMinutes: number
    divisionName: string
    representativeBelt: string
  }>()

  for (const reg of data || []) {
    if (!reg.division_id || !reg.category_id) continue
    const key = `${reg.division_id}_${reg.category_id}`
    const belt = (reg.player as any)?.belt_level || ''

    if (!divisionMap.has(key)) {
      divisionMap.set(key, {
        divisionId: reg.division_id,
        categoryId: reg.category_id,
        participantCount: 0,
        estimatedMatches: 0,
        estimatedMinutes: 0,
        divisionName: (reg.tournament_divisions as any)?.name || '',
        representativeBelt: belt // Store first one found as representative
      })
    }

    const div = divisionMap.get(key)!
    div.participantCount++
    // If we didn't have a belt before, try to set it now
    if (!div.representativeBelt && belt) {
      div.representativeBelt = belt
    }
  }

  // Calculate estimated matches and duration
  const divisions = Array.from(divisionMap.values()).map(div => {
    const matches = Math.max(1, div.participantCount - 1) // Single elimination
    const durationPerMatch = calculateMatchDuration(div.divisionName, scheduleConfig)
    const minutes = matches * durationPerMatch
    return { ...div, estimatedMatches: matches, estimatedMinutes: minutes }
  })

  // === FEASIBILITY CHECK (Bin Packing) ===
  // We still run bin packing to validate days and set detailed estimated_day
  // But PRIORITY is now driven by Skill Level.

  const totalDays = Math.ceil(
    (new Date(tournament.end_date!).getTime() - new Date(tournament.start_date!).getTime()) /
    (1000 * 60 * 60 * 24)
  ) + 1

  const dailyMinutes = calculateMinutes(
    scheduleConfig.daily_start_time,
    scheduleConfig.daily_end_time
  )

  const totalDailyCapacity = dailyMinutes * scheduleConfig.courts
  // Validate Total Capacity
  const totalRequiredMinutes = divisions.reduce((sum, d) => sum + d.estimatedMinutes, 0)
  if (totalRequiredMinutes > totalDailyCapacity * totalDays) {
    // We allow it but maybe warn? The Validation UI handles the hard blocking.
    // Here we just proceed since this is logic that happens after validation confirmation usually.
  }

  // === PRIORITY ASSIGNMENT (Strict: Belt > Size > Duration) ===
  const sortedBySkill = [...divisions].sort((a, b) => {
    // 1. Belt Weight (Lower = Earlier/Higher Priority)
    const weightA = getSkillWeight(a.divisionName, a.representativeBelt)
    const weightB = getSkillWeight(b.divisionName, b.representativeBelt)
    if (weightA !== weightB) return weightA - weightB

    // 2. Bracket Size (Larger = Earlier/Higher Priority)
    if (b.estimatedMatches !== a.estimatedMatches) return b.estimatedMatches - a.estimatedMatches

    // 3. Duration (Longer = Earlier/Higher Priority)
    return b.estimatedMinutes - a.estimatedMinutes
  })

  // Assign Priorities Sequentially
  let priority = 1
  const configs: DivisionScheduleConfigInsert[] = []

  // Assign rough day for metadata using simple capacity filling
  // This is just for the 'scheduled_day' column passed to UI, 
  // actual scheduling happens in match-scheduler.ts dynamically


  let currentDay = 1
  let currentDayMinutes = 0

  for (const div of sortedBySkill) {
    // Bin Packing logic for Day estimation
    if (currentDayMinutes + div.estimatedMinutes > totalDailyCapacity) {
      // If it doesn't fit, move to next day
      // Note: This is a simplification vs the real bin packer in scheduler
      currentDay++
      currentDayMinutes = 0
    }

    configs.push({
      tournament_id: tournamentId,
      division_id: div.divisionId,
      category_id: div.categoryId,
      priority: priority++,
      participant_count: div.participantCount,
      competition_type: (div.divisionName.toLowerCase().includes('poomsae') ? 'poomsae' : 'sparring') as 'sparring' | 'poomsae',
      avg_match_duration: calculateMatchDuration(div.divisionName, scheduleConfig),
      estimated_match_count: div.estimatedMatches,
      estimated_total_minutes: div.estimatedMinutes,
      scheduled_day: currentDay
    })

    currentDayMinutes += div.estimatedMinutes
  }

  return configs
}

function getSkillWeight(divisionName: string, beltLevel: string = ''): number {
  const normalized = divisionName.toLowerCase()
  const belt = beltLevel.toLowerCase()

  // Weights: Lower runs earlier
  // 10: Beginner (White)
  // 20: Novice I (Yellow, Blue, Green, Orange)
  // 30: Novice II (Red, Brown, Purple)
  // 40: Advanced (Black, Poom, Dan)

  // Combine signals
  const signals = normalized + ' ' + belt

  // Kids/Tiny - Treat as Beginner/10 if not specified? 
  // User didn't specify Age Priority in this specific file update request but implied "Age Group" in sorting.
  // For now we stick to Belt Mapping requested.

  // Beginner: White
  if (signals.includes('white') || signals.includes('beginner')) return 10

  // Novice I: Yellow, Blue
  if (signals.includes('yellow') || signals.includes('blue') || signals.includes('novice i') || signals.includes('novice 1')) return 20

  // Novice II: Red, Brown
  if (signals.includes('red') || signals.includes('brown') || signals.includes('novice ii') || signals.includes('novice 2')) return 30

  // Advanced: Black
  if (signals.includes('black') || signals.includes('advanced')) return 40

  return 99 // Default to end
}

export async function archiveMatchNumbers(tournamentId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Copy current match numbers to legacy column
  const { error } = await supabase.rpc('archive_match_numbers', {
    p_tournament_id: tournamentId
  })

  if (error) throw new Error(`Failed to archive match numbers: ${error.message}`)
}

export async function updateMatchSchedule(
  tournamentId: string,
  assignments: MatchAssignment[]
): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Batch update matches
  // Supabase/PostgREST doesn't support massive bulk update of different values easily in one call without upsert complexity
  // But we can loop reasonably for a few hundred matches, or use a custom function/jsonb approach.
  // For now, loop is simple and reliable for < 1000 matches.

  for (const assignment of assignments) {
    const { error } = await supabase
      .from('matches')
      .update({
        tournament_id: tournamentId,
        match_number_formatted: assignment.matchNumber,
        match_number: parseInt(assignment.matchNumber),
        day_number: assignment.day,
        court_number: assignment.court,
        match_sequence: assignment.sequence,
        scheduled_start_time: assignment.scheduledStartTime,
        scheduled_end_time: assignment.scheduledEndTime,
        // We also sync legacy number/etc if needed, but not here
      })
      .eq('id', assignment.matchId)

    if (error) {
      console.error(`Failed to update match ${assignment.matchId}:`, error)
    }
  }
}

export async function getDailyScheduleSummary(tournamentId: string): Promise<DailyScheduleSummary[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      day_number,
      scheduled_start_time,
      court_number,
      tournament_divisions (name),
      tournament_categories (
        name,
        gender,
        min_weight,
        max_weight
      ),
      player1:players!player1_id (belt_level),
      player2:players!player2_id (belt_level)
    `)
    .eq('tournament_id', tournamentId)
    .not('day_number', 'is', null)
    .order('day_number')

  if (error) throw new Error(`Failed to fetch daily summary: ${error.message}`)

  // Group by day
  const dayMap = new Map<number, any>()

  // Helper to format Date to 12h AM/PM
  const formatTime = (isoString: string | null) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  // Map Belt Levels to Skill Labels
  // Map Belt Levels to Skill Labels
  const getSkillLabel = (belt: string | null) => {
    if (!belt) return ''
    const beltLower = belt.toLowerCase()
    // Beginner: White
    if (beltLower.includes('white') || beltLower.includes('beginner')) return 'Beginner'
    // Novice I: Yellow, Blue
    if (beltLower.includes('yellow') || beltLower.includes('blue')) return 'Novice I'
    // Novice II: Red, Brown
    if (beltLower.includes('red') || beltLower.includes('brown')) return 'Novice II'
    // Advanced: Black
    if (beltLower.includes('black')) return 'Advanced'
    return ''
  }

  // Pre-pass: Find representative belt for each Division+Category group
  const repBeltMap = new Map<string, string>()
  const matches = data || []

  for (const match of matches) {
    const divId = (match.tournament_divisions as any)?.id // No ID in select above? Need to check query.
    // Wait, query doesn't select Division ID explicitly, only name. 
    // Actually tournament_divisions (name). We can use name as key if needed, or update query.
    // Let's rely on distinct names for now or better, update query to select ID.
    // Existing query: tournament_divisions (name). Let's use name.

    // Actually, let's assume we can key by DivName + CatName.
    const divName = (match.tournament_divisions as any)?.name
    const catName = (match.tournament_categories as any)?.name
    const key = `${divName}::${catName}`

    if (!repBeltMap.has(key)) {
      const b = (match.player1 as any)?.belt_level || (match.player2 as any)?.belt_level
      if (b) repBeltMap.set(key, b)
    }
  }

  // Helper to build detailed name
  const getDetailedName = (match: any) => {
    const divName = (match.tournament_divisions as any)?.name || 'Unknown'
    const cat = match.tournament_categories as any
    if (!cat) return divName

    // Determine Gender Label based on Division
    // Gradeschool/Cadet -> Boys/Girls
    // Junior/Senior -> Men/Women
    let genderLabel = ''
    const isYouth = /Gradeschool|Cadet/i.test(divName)
    // const isAdult = /Junior|Senior/i.test(divName) // Unused logic

    if (cat.gender === 'male') {
      genderLabel = isYouth ? 'Boys' : 'Men'
    } else if (cat.gender === 'female') {
      genderLabel = isYouth ? 'Girls' : 'Women'
    } else {
      genderLabel = 'Mixed'
    }

    // Try to find belt level from this match, or fallback to representative belt
    const ownBelt = (match.player1 as any)?.belt_level || (match.player2 as any)?.belt_level
    const key = `${divName}::${cat.name}`
    const repBelt = repBeltMap.get(key)

    // Use own belt if available (most accurate), otherwise Rep belt
    const effectiveBelt = ownBelt || repBelt

    const skillLabel = getSkillLabel(effectiveBelt)

    // Build parts: Division + Gender + Skill
    // User Request: "Category + Gender + Age (Division) + Belt + Weight (Category)"
    // Since Division Name usually = "Age Group (Gender) [Belt?]"
    // and Category Name = "Weight Class" or "Group X"

    // Let's rely on constructing a full string:
    // "[Division] [Gender?] [Skill] - [Category]"

    const parts = []

    // 1. Division Name (Age Group)
    parts.push(divName)

    // 2. Gender (if strictly needed and not in divName)
    const lowerDiv = divName.toLowerCase()
    if (!lowerDiv.includes(genderLabel.toLowerCase())) {
      parts.push(genderLabel)
    }

    // 3. Skill (if not in divName)
    if (skillLabel && !lowerDiv.includes(skillLabel.toLowerCase())) {
      parts.push(skillLabel)
    }

    // 4. Category Name (Weight / Group) - CRITICAL ADDITION
    const catName = (match.tournament_categories as any)?.name

    let base = parts.join(' ')
    if (catName) {
      base += ` - ${catName}`
    }

    return base
  }

  for (const match of matches) {
    const day = match.day_number!
    if (!dayMap.has(day)) {
      dayMap.set(day, {
        day,
        date: match.scheduled_start_time?.split('T')[0] || '',
        courtsActive: 0,
        matchCount: 0,
        startTimeISO: match.scheduled_start_time || '',
        endTimeISO: match.scheduled_start_time || '', // Init with start, will expand
        divisionsMap: new Map<string, {
          divisionName: string,
          matchCount: number,
          startTimeISO: string,
          endTimeISO: string
        }>()
      })
    }

    const summary = dayMap.get(day)!
    summary.matchCount++
    summary.courtsActive = Math.max(summary.courtsActive, match.court_number || 0)

    // Track Global Time Range
    if (match.scheduled_start_time && match.scheduled_start_time < summary.startTimeISO) summary.startTimeISO = match.scheduled_start_time
    if (match.scheduled_start_time && match.scheduled_start_time > summary.endTimeISO) summary.endTimeISO = match.scheduled_start_time

    // Track Division Details
    const detailedName = getDetailedName(match)

    if (!summary.divisionsMap.has(detailedName)) {
      summary.divisionsMap.set(detailedName, {
        divisionName: detailedName,
        matchCount: 0,
        startTimeISO: match.scheduled_start_time || '',
        endTimeISO: match.scheduled_start_time || ''
      })
    }
    const divStats = summary.divisionsMap.get(detailedName)!
    divStats.matchCount++

    if (match.scheduled_start_time && match.scheduled_start_time < divStats.startTimeISO) divStats.startTimeISO = match.scheduled_start_time
    if (match.scheduled_start_time && match.scheduled_start_time > divStats.endTimeISO) divStats.endTimeISO = match.scheduled_start_time
  }

  // Transform maps to final array structure
  return Array.from(dayMap.values()).map(d => {
    // Calculate simple avg matches per hour (duration between start and end)
    const start = new Date(d.startTimeISO).getTime()
    const end = new Date(d.endTimeISO).getTime()
    const hours = Math.max(1, (end - start) / (1000 * 60 * 60))

    return {
      day: d.day,
      date: d.date,
      courtsActive: d.courtsActive,
      matchCount: d.matchCount,
      startTime: formatTime(d.startTimeISO),
      endTime: formatTime(d.endTimeISO),
      avgMatchesPerHour: Math.round(d.matchCount / hours),
      divisions: Array.from(d.divisionsMap.values())
        .sort((a: any, b: any) => {
          // Sort by ISO time explicitly for correct chronological order
          return a.startTimeISO.localeCompare(b.startTimeISO)
        })
        .map((div: any) => ({
          divisionName: div.divisionName,
          matchCount: div.matchCount,
          startTime: formatTime(div.startTimeISO),
          endTime: formatTime(div.endTimeISO)
        }))
    }
  }).sort((a, b) => a.day - b.day)
}
