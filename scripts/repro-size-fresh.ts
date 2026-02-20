
import { calculateSchedule } from '../lib/utils/match-scheduler'
// import removed - debug script

// Helper to create matches
const createMatch = (id: string, div: string, cat: string, belt: string, status: 'scheduled' | 'completed', round: number): any => ({
  id,
  divisionId: div,
  categoryId: cat,
  division_id: div,
  category_id: cat,
  division_name: div,
  category_name: cat,
  belt_level: belt,
  status,
  round,
  winner_id: status === 'completed' ? 'winner' : null,
  match_number: 0
})

async function run() {
  console.log('--- Testing Bracket Size Priority (Fresh Start) ---')

  // Block A: Medium Bracket (Size 3 matches total)
  const matchesA = [
    createMatch('a1', 'DivA', 'CatA', 'Yellow', 'scheduled', 1),
    createMatch('a2', 'DivA', 'CatA', 'Yellow', 'scheduled', 1),
    createMatch('a3', 'DivA', 'CatA', 'Yellow', 'scheduled', 2)
  ]

  // Block B: Large Bracket (Size 6 matches total)
  const matchesB = [
    createMatch('b1', 'DivA', 'CatB', 'Yellow', 'scheduled', 1),
    createMatch('b2', 'DivA', 'CatB', 'Yellow', 'scheduled', 1),
    createMatch('b3', 'DivA', 'CatB', 'Yellow', 'scheduled', 1),
    createMatch('b4', 'DivA', 'CatB', 'Yellow', 'scheduled', 1), // Extra R1 matches to make it big
    createMatch('b5', 'DivA', 'CatB', 'Yellow', 'scheduled', 2),
    createMatch('b6', 'DivA', 'CatB', 'Yellow', 'scheduled', 2)
  ]

  const allMatches = [...matchesA, ...matchesB] as any[]

  // Config setup...
  const config: any = {
    id: 'conf', tournament_id: 't1', daily_start_time: '08:00', daily_end_time: '20:00', courts: 1,
    gradeschool_round_time: 60, gradeschool_rest_between_rounds: 30, gradeschool_kyeshi_time: 60,
    cadet_round_time: 90, cadet_rest_between_rounds: 30, cadet_kyeshi_time: 60,
    junior_round_time: 90, junior_rest_between_rounds: 30, junior_kyeshi_time: 60,
    senior_round_time: 120, senior_rest_between_rounds: 30, senior_kyeshi_time: 60,
    default_sparring_duration: 10, default_poomsae_duration: 10, default_breaking_duration: 10,
    max_divisions_per_day: null, created_at: '', updated_at: ''
  }

  const input: any = {
    tournamentConfig: config,
    divisionConfigs: [],
    matches: allMatches,
    startDate: new Date(),
    endDate: new Date(),
  }

  const result = await calculateSchedule(input, null as any)

  if (result.assignments.length > 0) {
    const firstMatch = result.assignments[0]
    const catId = firstMatch.categoryId
    const catName = catId === 'CatA' ? 'Medium (CatA)' : (catId === 'CatB' ? 'Large (CatB)' : `Unknown (${catId})`)

    console.log(`First scheduled match is from: ${catName}`)
    // Check order of first few matches
    console.log('Matches Scheduled:', result.assignments.map(a => a.categoryId).slice(0, 10).join(', '))
  }
}

run()
