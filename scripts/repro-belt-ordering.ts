
import { calculateSchedule } from '../lib/utils/match-scheduler'

// Only 2 belts: White (40) and Black (10)
// White should be scheduled FIRST.
const matches = [
  {
    id: 'm1',
    divisionId: 'div1', categoryId: 'cat1', division_id: 'div1', category_id: 'cat1',
    belt_level: 'Black', status: 'scheduled', round: 1, match_number: 0
  },
  {
    id: 'm2',
    divisionId: 'div1', categoryId: 'cat2', division_id: 'div1', category_id: 'cat2',
    belt_level: 'White', status: 'scheduled', round: 1, match_number: 0
  }
] as any[]

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
  matches: matches,
  startDate: new Date(),
  endDate: new Date(),
}

async function run() {
  console.log('--- Testing Belt Scheduling Order ---')
  const result = await calculateSchedule(input)

  // Result assignments should have White first.
  // m2 is White. m1 is Black.
  // Expect: m2, then m1.

  result.assignments.forEach((a, idx) => {
    const m = matches.find(match => match.id === a.matchId)
    console.log(`Order ${idx + 1}: ${m.belt_level} Belt`)
  })
}

run()
