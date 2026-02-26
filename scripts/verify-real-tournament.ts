
import fs from 'fs'
import path from 'path'
import { calculateSchedule } from '../lib/utils/match-scheduler'
// import removed - debug script

// Mock normalize functions if needed, or import them? 
// They are not exported from match-scheduler, but used internally.
// However, I can just pass data that satisfies the internal logic.

function loadJson(filename: string) {
  const p = path.join(process.cwd(), 'scripts', filename)
  if (!fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

async function run() {
  console.log('--- Verifying Real Tournament Data ---')
  const configData = loadJson('data_config.json')
  const matches1 = loadJson('data_matches_1.json')
  const matches2 = loadJson('data_matches_2.json')

  if (!configData || !matches1) {
    console.error('Missing data files. Run previous steps.')
    return
  }

  const rawMatches = [...matches1, ...matches2]
  console.log(`Loaded ${rawMatches.length} matches.`)

  // Prepare Configs
  // configData has tournamentConfig (flat) and divisionConfigs (array)
  const tConfig = configData.tournamentConfig
  const dConfigs = configData.divisionConfigs || []

  // Ensure dates are Date objects
  // The JSON has ISO strings "2026-01-18 00:00:00+00" (Postgres format)
  // helper to clean
  const parseDate = (d: string) => new Date(d)

  // Wait, tConfig is mixed from Join.
  // We need to shape it into any
  const scheduleConfig: any = {
    id: 'temp-config',
    tournament_id: tConfig.id,
    daily_start_time: tConfig.daily_start_time,
    daily_end_time: tConfig.daily_end_time,
    courts: tConfig.courts,
    gradeschool_round_time: tConfig.gradeschool_round_time,
    gradeschool_rest_between_rounds: tConfig.gradeschool_rest_between_rounds,
    gradeschool_kyeshi_time: tConfig.gradeschool_kyeshi_time,
    cadet_round_time: tConfig.cadet_round_time,
    cadet_rest_between_rounds: tConfig.cadet_rest_between_rounds,
    cadet_kyeshi_time: tConfig.cadet_kyeshi_time,
    junior_round_time: tConfig.junior_round_time,
    junior_rest_between_rounds: tConfig.junior_rest_between_rounds,
    junior_kyeshi_time: tConfig.junior_kyeshi_time,
    senior_round_time: tConfig.senior_round_time,
    senior_rest_between_rounds: tConfig.senior_rest_between_rounds,
    senior_kyeshi_time: tConfig.senior_kyeshi_time,
    default_sparring_duration: tConfig.default_sparring_duration,
    default_poomsae_duration: 10,
    default_breaking_duration: 10,
    max_divisions_per_day: null,
    created_at: '',
    updated_at: ''
  }

  // Matches
  const schedulerMatches: any[] = rawMatches.map((m: any, idx: number) => ({
    id: m.id,
    tournament_id: 'real-test',
    divisionId: m.division_id,
    categoryId: m.category_id,

    round: m.round,
    match_number: m.match_number || 0,
    division_name: m.division_name,
    category_name: m.category_name,
    belt_level: 'Black', // Defaulting to Black for verification
    status: 'scheduled',
    winner_id: null,

    // any specifics
    duration: 10, // will be recalc'd
    beltPriority: 0, // will be recalc'd
    groupId: '',
    blockSetId: '',
    sourceIndex: idx,
    match_sequence: idx,

    // mock other props
    lifecycle_state: 'WAITING',
    source_match_ids: [],
    athlete1_available_at: null,
    athlete2_available_at: null,
    next_match_id: null,
    source_match_id: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    actual_start_time: null,
    actual_end_time: null,
    created_at: '',
    updated_at: '',
    score_player1: 0,
    score_player2: 0,
    score_round1_player1: 0,
    score_round1_player2: 0,
    score_round2_player1: 0,
    score_round2_player2: 0,
    score_round3_player1: 0,
    score_round3_player2: 0,
    player1_id: null,
    player2_id: null,
    winner_round1: null,
    winner_round2: null,
    winner_round3: null,
    court_number: null
  }))

  const input: any = {
    tournamentConfig: scheduleConfig,
    divisionConfigs: dConfigs as any[],
    matches: schedulerMatches,
    startDate: new Date('2026-01-18T00:00:00Z'), // Hardcoded from data_config
    endDate: new Date('2026-01-18T00:00:00Z')
  }

  console.log('Running Scheduler...')
  const result = await calculateSchedule(input)

  console.log('--- Results ---')
  console.log('Total Assignments:', result.assignments.length)
  console.log('Overflow Matches:', result.overflow.count)

  // Verify Wave
  const courts = new Map<number, string[]>()
  result.assignments.slice(0, 20).forEach(a => {
    if (!courts.has(a.court)) courts.set(a.court, [])
    courts.get(a.court)?.push(a.matchNumber)
  })

  console.log('First 20 Assignments (Check 1001, 2001...):')
  result.assignments.slice(0, 10).forEach(a => {
    console.log(`Court ${a.court} -> Match ${a.matchNumber} (${a.estimatedStartTime})`)
  })

  // Check Round Robin
  const counts = [0, 0, 0, 0, 0] // courts 1-4
  result.assignments.forEach(a => counts[a.court]++)
  console.log('Court Counts:', counts.slice(1))

  // Check Match Number Sequence
  // Should ideally be sequential per court
  // e.g. Court 1: 1001, 1002, 1003
}

run().catch(console.error)
