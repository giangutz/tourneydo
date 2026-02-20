
import { validateSchedule } from '../lib/utils/match-scheduler'
// import removed - debug script

const MOCK_CONFIG: any = {
  id: 'conf_1',
  tournament_id: 't_1',
  daily_start_time: '09:00',
  daily_end_time: '18:00', // 9 hours
  courts: 5,
  // Timing Config
  gradeschool_round_time: 60,
  gradeschool_kyeshi_time: 60,
  gradeschool_rest_between_rounds: 30, // Total: (60*3)+(30*2)+60+60 = 360s = 6m

  junior_round_time: 90,
  junior_kyeshi_time: 60,
  junior_rest_between_rounds: 30, // Total: (90*3)+(30*2)+60+60 = 450s = 7.5m -> 8m

  senior_round_time: 120, // 2 mins
  senior_kyeshi_time: 60,
  senior_rest_between_rounds: 30,
  // Formula: (120 * 3) + (30 * 2) + 60 + 60 = 360 + 60 + 60 + 60 = 540s = 9 mins

  cadet_round_time: null,
  cadet_kyeshi_time: null,
  cadet_rest_between_rounds: null,
  default_sparring_duration: 10,
  default_poomsae_duration: null,
  default_breaking_duration: null,
  max_divisions_per_day: null,
  created_at: '',
  updated_at: ''
}

// 100 matches
const matches = Array.from({ length: 100 }, (_, i) => ({
  id: `m_${i}`,
  divisionId: 'div_1',
  categoryId: 'cat_1',
  round: 1,
  status: 'scheduled',
  winner_id: null,
  belt_level: 'Black',
  division_name: 'Senior Male Black Belt', // Key: "Senior" triggers smart calc
  category_name: 'Fin',
  gender: 'M',
  match_number: i + 1
}))

console.log('--- Testing Smart Duration Logic ---')
console.log('Expected Duration per Match (Senior): 9 minutes')
console.log(`Total Matches: ${matches.length}`)
// We expect 100 * 9 = 900 minutes (15 hours)

const result = validateSchedule({
  tournamentConfig: MOCK_CONFIG,
  divisionConfigs: [], // Empty configs to force use of smart logic
  matches: matches as any[],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-01'),
  forceLunchBreak: false
})

console.log('\n--- Result ---')
console.log('Feasible:', result.feasible)
console.log('Total Required Mins:', result.totalRequiredMinutes)
console.log('Calculated Duration per Match:', result.totalRequiredMinutes / matches.length)

