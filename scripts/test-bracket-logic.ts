
import { generateBracket } from '../lib/utils/bracket-generator'
import { BracketValidator } from '../lib/utils/scheduling/validator'
// import { PhysicsScheduler } from '../lib/utils/scheduling/physics-scheduler'
// import removed - debug script

// Mock Data
const MOCK_PARTICIPANTS = [
  // Team A (Living Word) - 4 players
  { id: '1', team_id: 'Team A', player_id: 'p1' },
  { id: '2', team_id: 'Team A', player_id: 'p2' },
  { id: '3', team_id: 'Team A', player_id: 'p3' },
  { id: '4', team_id: 'Team A', player_id: 'p4' },
  // Team B (Green Tiger) - 1 player
  { id: '5', team_id: 'Team B', player_id: 'p5' },
  // Team C (St Josephs) - 1 player
  { id: '6', team_id: 'Team C', player_id: 'p6' },
  // 7th player removed to match user scenario of 6 players? User image shows 6 inputs?
  // Winter, Aaron, Yisoo, Phil, Mark, Hendrix. 6 Players.
]

const MOCK_CONFIG: any = {
  id: 'conf_1',
  tournament_id: 't_1',
  daily_start_time: '09:00',
  daily_end_time: '18:00',
  courts: 2,
  gradeschool_round_time: null,
  gradeschool_kyeshi_time: null,
  gradeschool_rest_between_rounds: null,
  cadet_round_time: null,
  cadet_kyeshi_time: null,
  cadet_rest_between_rounds: null,
  junior_round_time: null,
  junior_kyeshi_time: null,
  junior_rest_between_rounds: null,
  senior_round_time: null,
  senior_kyeshi_time: null,
  senior_rest_between_rounds: null,
  default_sparring_duration: 10,
  default_poomsae_duration: null,
  default_breaking_duration: null,
  max_divisions_per_day: null,
  created_at: '',
  updated_at: ''
}

async function runTest() {
  console.log('--- STARTING BRACKET LOGIC VERIFICATION ---')

  // 1. Generate Bracket
  console.log(`\n1. Generating Bracket for ${MOCK_PARTICIPANTS.length} participants...`)
  const matches = generateBracket('t_1', MOCK_PARTICIPANTS)

  // 2. Validate Structure
  console.log('\n2. Validating Structure (The "100%" Layer)...')
  const validation = BracketValidator.validate(matches, MOCK_PARTICIPANTS)

  if (!validation.isValid) {
    console.error('❌ Validation Failed:', validation.errors)
  } else {
    console.log('✅ Structure Validated!')
    console.log('Metrics:', validation.metrics)
  }

  // 3. Inspect Promoted Placement
  console.log('\n3. Inspecting Promoted Placement (Round 1 vs Round 2)...')
  const r1 = matches.filter(m => m.round === 1)
  const r2 = matches.filter(m => m.round === 2)
  console.log(`Round 1 Matches: ${r1.length}`)
  console.log(`Round 2 Matches: ${r2.length}`)

  // Check for conflicts
  console.log('\n4. Checking Team Conflicts...')
  r1.forEach(m => {
    const p1 = MOCK_PARTICIPANTS.find(p => p.player_id === m.player1_id)
    const p2 = MOCK_PARTICIPANTS.find(p => p.player_id === m.player2_id)
    if (p1 && p2 && p1.team_id === p2.team_id) {
      console.warn(`⚠️  R1 Conflict detected: ${p1.team_id} vs ${p2.team_id} in Match ${m.id}`)
    } else {
      console.log(`  Match ${m.id.slice(0, 4)}: ${p1?.team_id} vs ${p2?.team_id} (OK)`)
    }
  })

  /*
  // 4. Run Physics Scheduler
  console.log('\n5. Running Physics Scheduler (CPM) + Explicit Rest Constraints...')
  const scheduler = new PhysicsScheduler(MOCK_CONFIG, [])
  const physics = scheduler.calculatePhysics(matches)

  console.log('\nPhysics Results:')
  // Check R2 start vs R1 end
  r2.forEach(m2 => {
    const phys2 = physics.get(m2.id)!
    const sources = matches.filter(m => m.next_match_id === m2.id)

    console.log(`R2 Match ${m2.id.slice(0, 4)} starts at +${phys2.earliestStartTime}m. Constraint: ${phys2.startConstraintReason}`)

    sources.forEach(src => {
      const physSrc = physics.get(src.id)!
      console.log(`  <- Source ${src.id.slice(0, 4)} ends at +${physSrc.earliestEndTime}m`)

      const gap = phys2.earliestStartTime - physSrc.earliestEndTime
      if (gap < 20) { // Default Rest
        console.warn(`  ⚠️ GAP WARNING: Only ${gap}m (Expected >= 20m)`)
      } else {
        console.log(`  ✅ Gap: ${gap}m (Healthy Rest)`)
      }
    })
  })

  const finals = matches.find(m => !m.next_match_id)
  if (finals) {
    const finalPhys = physics.get(finals.id)
    console.log(`\nFinals Estimated Start: +${finalPhys?.earliestStartTime} mins from start`)
    console.log(`Finals Estimated End: +${finalPhys?.earliestEndTime} mins from start`)
  }
  */
}

runTest().catch(console.error)
